import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

/**
 * POST /api/stripe/cancel-hold
 *
 * Cancels a PaymentIntent hold, releasing the funds back to the card.
 * Called when: attendee cancels (before 12hr window), or session doesn't go ahead.
 *
 * Body: { paymentIntentId: string }
 * Returns: { success: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const { paymentIntentId } = await request.json();

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: "Missing paymentIntentId" },
        { status: 400 }
      );
    }

    await stripe.paymentIntents.cancel(paymentIntentId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Stripe cancel-hold error:", error);
    return NextResponse.json(
      { error: "Failed to cancel hold" },
      { status: 500 }
    );
  }
}
