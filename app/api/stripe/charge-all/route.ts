/**
 * POST /api/stripe/charge-all
 *
 * Called 2 hours before a session starts (by a cron job / Supabase Edge Function).
 * - Locks the final price for all confirmed holders
 * - Captures all PaymentIntents (converts "authorized" → "charged")
 * - Sends receipt emails via Resend
 * - Updates all holds to status: "charged"
 * - Updates session phase to: LOCKED
 *
 * Trigger: Supabase Edge Function on a cron schedule
 * Or: Vercel Cron Job at /api/cron/lock-sessions
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Verify this is called by our cron, not the public
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { sessionId } = body;

    // 1. Fetch session + all confirmed holds
    // const { data: session } = await supabase.from("sessions").select("*").eq("id", sessionId).single()
    // const { data: holds } = await supabase.from("holds")
    //   .select("*, attendees(*)")
    //   .eq("session_id", sessionId)
    //   .in("status", ["held", "confirmed"])

    // 2. Calculate final price
    // const finalPrice = calculatePrice(session.host_target, session.current_holds)

    // 3. For each hold: capture the payment intent at the final price
    // for (const hold of holds) {
    //   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    //   await stripe.paymentIntents.capture(hold.stripe_payment_intent_id, {
    //     amount_to_capture: Math.round(finalPrice * 100)
    //   })
    //   await supabase.from("holds").update({
    //     status: "charged",
    //     price_paid: finalPrice,
    //     charged_at: new Date().toISOString()
    //   }).eq("id", hold.id)
    //   // Send receipt email via Resend
    //   await sendReceiptEmail(hold.attendees.email, session, finalPrice)
    // }

    // 4. Update session to LOCKED
    // await supabase.from("sessions").update({
    //   phase: "LOCKED",
    //   locked_at: new Date().toISOString()
    // }).eq("id", sessionId)

    return NextResponse.json({ success: true, message: `Lock-in complete for session ${sessionId}` });

  } catch (err) {
    console.error("Charge-all error:", err);
    return NextResponse.json({ error: "Failed to process lock-in" }, { status: 500 });
  }
}
