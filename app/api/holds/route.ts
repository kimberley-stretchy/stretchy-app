import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { cookies } from "next/headers";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });
}
function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/holds — step 1: create Stripe PaymentIntent, return clientSecret
// Body: { sessionId }
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  // Try server-side session first, fall back to Authorization header token
  let { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      user = data.user;
    }
  }
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const body = await request.json();
  const sessionId = body.sessionId;
  const quantity = Math.min(Math.max(Number(body.quantity) || 1, 1), 6); // 1–6 spots
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  const admin = getAdmin();
  const stripe = getStripe();

  // Get session to calculate price
  const { data: session, error: sErr } = await admin
    .from("sessions")
    .select("id, title, host_target, min_attendees, max_attendees, starts_at, state")
    .eq("id", sessionId)
    .single();

  if (sErr || !session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.state === "cancelled") return NextResponse.json({ error: "Session is cancelled" }, { status: 400 });

  // Count current holds to calculate price
  const { count: holdCount } = await admin
    .from("holds")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("state", "active");

  const STRETCHY_FEE = 23;
  const currentHolds = (holdCount ?? 0) + quantity; // +quantity spots will be added
  const effectiveSpots = Math.max(currentHolds, session.min_attendees);
  const priceNZD = Math.round((session.host_target + STRETCHY_FEE) / effectiveSpots);
  // Add 15% GST
  const priceWithGST = Math.round(priceNZD * 1.15 * 100) / 100;
  const amountCents = Math.round(priceWithGST * 100) * quantity; // total for all spots

  // Get or create attendee record
  let { data: attendee } = await admin
    .from("attendees")
    .select("id, stripe_customer_id, name, email")
    .eq("auth_user_id", user.id)
    .single();

  if (!attendee) {
    const { data: newAttendee } = await admin
      .from("attendees")
      .insert({
        auth_user_id: user.id,
        name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Stretchy Member",
        email: user.email!,
        avatar_url: user.user_metadata?.avatar_url ?? null,
      })
      .select("id, stripe_customer_id, name, email")
      .single();
    attendee = newAttendee;
  }

  // Get or create Stripe customer
  let stripeCustomerId = attendee?.stripe_customer_id;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      name: attendee?.name ?? undefined,
      metadata: { supabase_user_id: user.id, attendee_id: attendee?.id ?? "" },
    });
    stripeCustomerId = customer.id;
    await admin
      .from("attendees")
      .update({ stripe_customer_id: stripeCustomerId })
      .eq("id", attendee!.id);
  }

  // Create PaymentIntent — manual capture (authorize only, charge at lock-in)
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: "nzd",
    customer: stripeCustomerId,
    payment_method_types: ["card"],
    capture_method: "manual",
    setup_future_usage: "off_session",
    metadata: {
      session_id: sessionId,
      attendee_id: attendee?.id ?? "",
      session_title: session.title,
      quantity: String(quantity),
    },
    description: `Hold x${quantity}: ${session.title}`,
  });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    authUserId: user.id,
    quantity,
    priceNZD,
    priceWithGST,
    sessionTitle: session.title,
    attendeeId: attendee?.id,
  });
}

// PATCH /api/holds — step 2: after Stripe confirms, save hold to Supabase
// Body: { sessionId, paymentIntentId, attendeeId }
export async function PATCH(request: NextRequest) {
  const admin = getAdmin();
  const stripe = getStripe();

  const { sessionId, paymentIntentId, attendeeId, authUserId, quantity: rawQty } = await request.json();
  const quantity = Math.min(Math.max(Number(rawQty) || 1, 1), 6);
  if (!sessionId || !paymentIntentId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Verify PaymentIntent is in the right state
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (!["requires_capture", "succeeded"].includes(pi.status)) {
    return NextResponse.json({ error: `Payment not confirmed (status: ${pi.status})` }, { status: 400 });
  }

  // Save payment method to attendee
  if (pi.payment_method) {
    await admin
      .from("attendees")
      .update({ stripe_pm_id: pi.payment_method as string })
      .eq("id", attendeeId);
  }

  // user_id in holds references auth.users.id — use authUserId if provided, else look up from attendee
  let holdUserId = authUserId;
  if (!holdUserId && attendeeId) {
    const { data: att } = await admin.from("attendees").select("auth_user_id").eq("id", attendeeId).single();
    holdUserId = att?.auth_user_id;
  }
  if (!holdUserId) return NextResponse.json({ error: "Could not identify user" }, { status: 400 });

  // Check if hold already exists (prevent duplicates)
  const { data: existing } = await admin
    .from("holds")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", holdUserId)
    .eq("state", "active")
    .single();

  if (existing) return NextResponse.json({ holdId: existing.id });

  // Create one hold record per spot
  const holdRows = Array.from({ length: quantity }, () => ({
    session_id: sessionId,
    user_id: holdUserId,
    stripe_pi_id: paymentIntentId,
    state: "active",
  }));

  const { data: holds, error } = await admin
    .from("holds")
    .insert(holdRows)
    .select("id");

  if (error) {
    console.error("Hold insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const hold = holds?.[0];

  // Send hold confirmation email (fire and forget — don't block the response)
  try {
    const [{ data: sessionData }, { data: attendeeData }] = await Promise.all([
      admin.from("sessions").select("title, starts_at, location_name, social_stretch_venue").eq("id", sessionId).single(),
      admin.from("attendees").select("name, email").eq("auth_user_id", holdUserId).single(),
    ]);

    if (sessionData && attendeeData?.email) {
      const startDate = new Date(sessionData.starts_at);
      const dateStr = startDate.toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" }) +
        " at " + startDate.toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit", hour12: true });

      const STRETCHY_FEE = 23;
      const priceNZD = Math.round((pi.amount / 100) * (1 / 1.15)); // reverse GST from captured amount
      const priceDisplay = `$${Math.round(pi.amount / 100)} incl. GST`;

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://stretchy.social";
      fetch(`${appUrl}/api/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "hold_confirmed",
          to: attendeeData.email,
          name: attendeeData.name?.split(" ")[0] ?? "there",
          sessionTitle: sessionData.title,
          date: dateStr,
          price: priceDisplay,
          venue: sessionData.location_name,
          socialStretchVenue: sessionData.social_stretch_venue ?? "nearby",
          cancelUrl: `${appUrl}/hold/${sessionId}`,
        }),
      }).catch(console.error);
    }
  } catch (emailErr) {
    console.error("Email send error (non-blocking):", emailErr);
  }

  return NextResponse.json({ holdId: hold.id });
}
