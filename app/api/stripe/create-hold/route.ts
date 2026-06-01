import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

/**
 * POST /api/stripe/create-hold
 *
 * Creates a Stripe PaymentIntent in "manual" capture mode.
 * This places a hold on the card without charging it.
 * The hold is captured (charged) at lock-in time (2hrs before session).
 *
 * Body: { amount: number, currency: string, sessionId: string, attendeeId: string }
 * Returns: { clientSecret: string, paymentIntentId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { amount, currency = "nzd", sessionId, attendeeId } = await request.json();

    if (!amount || !sessionId || !attendeeId) {
      return NextResponse.json(
        { error: "Missing required fields: amount, sessionId, attendeeId" },
        { status: 400 }
      );
    }

    // Amount must be in cents (e.g. NZD $20.00 = 2000)
    const amountInCents = Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      capture_method: "manual", // Hold only — charge later at lock-in
      metadata: {
        sessionId,
        attendeeId,
        type: "stretchy_hold",
      },
      description: `Stretchy hold — session ${sessionId}`,
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error("Stripe create-hold error:", error);
    return NextResponse.json(
      { error: "Failed to create payment hold" },
      { status: 500 }
    );
  }
}
