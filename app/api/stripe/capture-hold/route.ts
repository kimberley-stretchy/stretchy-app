import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

/**
 * POST /api/stripe/capture-hold
 *
 * Captures (charges) a previously created PaymentIntent hold.
 * Called at lock-in time (2hrs before session starts).
 * The final amount may differ from the hold amount (price dropped).
 *
 * Body: { paymentIntentId: string, finalAmount: number }
 * Returns: { success: boolean, amountCharged: number }
 */
export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId, finalAmount } = await request.json();

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: "Missing paymentIntentId" },
        { status: 400 }
      );
    }

    const finalAmountInCents = Math.round(finalAmount * 100);

    const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId, {
      amount_to_capture: finalAmountInCents,
    });

    return NextResponse.json({
      success: true,
      amountCharged: paymentIntent.amount_received / 100,
      currency: paymentIntent.currency,
    });
  } catch (error) {
    console.error("Stripe capture-hold error:", error);
    return NextResponse.json(
      { error: "Failed to capture payment" },
      { status: 500 }
    );
  }
}
