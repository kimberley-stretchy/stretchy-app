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

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { sessionId } = await request.json();
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
  const currentHolds = (holdCount ?? 0) + 1; // +1 because this hold will be added
  const effectiveSpots = Math.max(currentHolds, session.min_attendees);
  const priceNZD = Math.round((session.host_target + STRETCHY_FEE) / effectiveSpots);
  // Add 15% GST
  const priceWithGST = Math.round(priceNZD * 1.15 * 100) / 100;
  const amountCents = Math.round(priceWithGST * 100);

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
    capture_method: "manual",
    setup_future_usage: "off_session",
    metadata: {
      session_id: sessionId,
      attendee_id: attendee?.id ?? "",
      session_title: session.title,
    },
    description: `Hold: ${session.title}`,
  });

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
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

  const { sessionId, paymentIntentId, attendeeId } = await request.json();
  if (!sessionId || !paymentIntentId || !attendeeId) {
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

  // Check if hold already exists (prevent duplicates)
  const { data: existing } = await admin
    .from("holds")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", attendeeId)
    .eq("state", "active")
    .single();

  if (existing) return NextResponse.json({ holdId: existing.id });

  // Create hold
  const { data: hold, error } = await admin
    .from("holds")
    .insert({
      session_id: sessionId,
      user_id: attendeeId,
      stripe_pi_id: paymentIntentId,
      state: "active",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Hold insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ holdId: hold.id });
}
