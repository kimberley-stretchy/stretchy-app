import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { Resend } from "resend";
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

      const resend = new Resend(process.env.RESEND_API_KEY);
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://stretchy.social";
      await resend.emails.send({
        from: "Stretchy <hello@stretchy.social>",
        to: attendeeData.email,
        reply_to: "kimberley@stretchyyoga.co.nz",
        subject: `You're in — ${sessionData.title}`,
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; background: #F5EDE3; padding: 32px; border-radius: 16px;">
            <h1 style="font-size: 28px; font-weight: 900; color: #1A1A1A; margin: 0 0 8px;">You're in. 🙌</h1>
            <p style="color: #555; font-size: 15px; margin: 0 0 24px;">Hey ${attendeeData.name?.split(" ")[0] ?? "there"} — your spot is held!</p>
            <div style="background: #1A1A1A; border-radius: 14px; padding: 22px; margin-bottom: 16px;">
              <p style="color: #FFD166; font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; margin: 0 0 6px;">Your Stretchy</p>
              <p style="color: #F5EDE3; font-size: 20px; font-weight: 800; margin: 0 0 8px;">${sessionData.title}</p>
              <p style="color: rgba(245,237,227,0.7); font-size: 14px; margin: 0 0 4px;">🗓 ${dateStr}</p>
              <p style="color: rgba(245,237,227,0.7); font-size: 14px; margin: 0 0 4px;">📍 ${sessionData.location_name}</p>
              ${sessionData.social_stretch_venue ? `<p style="color: rgba(245,237,227,0.6); font-size: 13px; margin: 8px 0 0; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px;">🥂 Social Stretch after at ${sessionData.social_stretch_venue}</p>` : ""}
            </div>
            <div style="background: white; border-radius: 14px; padding: 18px; margin-bottom: 16px;">
              <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: #999; margin: 0 0 4px;">Current price</p>
              <p style="font-size: 28px; font-weight: 900; color: #1A1A1A; margin: 0 0 4px;">${priceDisplay}</p>
              <p style="font-size: 12px; color: #999; margin: 0;">Price drops as more people join. Your card is charged 2 hours before the session.</p>
            </div>
            <div style="background: #EDE5D8; border-radius: 14px; padding: 18px; margin-bottom: 16px;">
              <p style="font-size: 13px; color: #444; line-height: 1.6; margin: 0 0 12px;">Need to cancel? You can cancel <strong>up to 36 hours before the session</strong> and nothing will be charged. After the 36hr mark, no cancellations.</p>
              <a href="${appUrl}/hold/${sessionId}" style="display: inline-block; background: #1A1A1A; color: #F5EDE3; text-decoration: none; font-size: 13px; font-weight: 700; padding: 10px 20px; border-radius: 8px;">View / cancel my hold</a>
            </div>
            <p style="font-size: 12px; color: #888; text-align: center; margin: 20px 0 0;">Questions? <a href="mailto:kimberley@stretchyyoga.co.nz" style="color: #1A1A1A; font-weight: 600; text-decoration: none;">kimberley@stretchyyoga.co.nz</a></p>
            <p style="font-size: 11px; color: #AAA; text-align: center; margin: 8px 0 0;">Made with Love by <a href="https://studiodawn.org" style="color: #AAA;">Studio Dawn</a></p>
          </div>
        `,
      }).catch((e: unknown) => console.error("Hold email error:", e));
    }
  } catch (emailErr) {
    console.error("Email send error (non-blocking):", emailErr);
  }

  return NextResponse.json({ holdId: hold.id });
}
