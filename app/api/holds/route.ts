/**
 * POST /api/holds
 *
 * Creates a hold for an attendee on a session.
 * - Saves Stripe payment method (no charge yet)
 * - Inserts hold row in Supabase
 * - Triggers update_session_holds() via the DB trigger
 *
 * The actual charge happens at lock-in (2hrs before) via /api/stripe/charge-all
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, attendeeId, paymentMethodId, notesForHost } = body;

    if (!sessionId || !attendeeId || !paymentMethodId) {
      return NextResponse.json(
        { error: "Missing required fields: sessionId, attendeeId, paymentMethodId" },
        { status: 400 }
      );
    }

    // 1. Import Supabase server client
    //    (uncomment when Supabase is connected)
    // const { createServerClient } = await import("@supabase/ssr")
    // const supabase = createServerClient(...)

    // 2. Fetch the session to get current pricing
    // const { data: session } = await supabase
    //   .from("sessions")
    //   .select("*")
    //   .eq("id", sessionId)
    //   .single()

    // 3. Calculate current price
    // const { calculatePrice } = await import("@/lib/pricing")
    // const priceAtHold = calculatePrice(
    //   session.host_target,
    //   Math.max(session.current_holds + 1, session.minimum_spots)
    // )

    // 4. Create Stripe PaymentIntent (authorize only — capture later at lock-in)
    // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
    // const intent = await stripe.paymentIntents.create({
    //   amount: Math.round(priceAtHold * 100), // Stripe uses cents
    //   currency: "nzd",
    //   payment_method: paymentMethodId,
    //   capture_method: "manual", // ← authorize now, capture at lock-in
    //   confirm: true,
    //   return_url: `${process.env.NEXT_PUBLIC_APP_URL}/sessions/${sessionId}`,
    //   metadata: { sessionId, attendeeId }
    // })

    // 5. Insert hold
    // const { data: hold, error } = await supabase
    //   .from("holds")
    //   .insert({
    //     session_id: sessionId,
    //     attendee_id: attendeeId,
    //     price_at_hold: priceAtHold,
    //     notes_for_host: notesForHost,
    //     stripe_payment_intent_id: intent.id,
    //     status: "held"
    //   })
    //   .select()
    //   .single()

    // ── MOCK RESPONSE (remove when Supabase + Stripe are connected) ──────────
    const mockPriceAtHold = 24.5;
    return NextResponse.json({
      success: true,
      hold: {
        id: "mock-hold-id",
        sessionId,
        attendeeId,
        priceAtHold: mockPriceAtHold,
        status: "held",
      },
    });

  } catch (err) {
    console.error("Hold creation error:", err);
    return NextResponse.json(
      { error: "Failed to create hold. Please try again." },
      { status: 500 }
    );
  }
}
