import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * POST /api/stripe/webhook
 *
 * Receives Stripe events and updates Supabase accordingly.
 *
 * Events handled:
 * - payment_intent.succeeded   → mark hold as charged in Supabase
 * - payment_intent.canceled    → mark hold as cancelled
 * - payment_intent.payment_failed → notify attendee, mark hold failed
 */
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const { sessionId, attendeeId } = paymentIntent.metadata;

  switch (event.type) {
    case "payment_intent.succeeded":
      console.log(`✅ Payment captured for session ${sessionId}, attendee ${attendeeId}`);
      // TODO: Update holds table → status = 'charged', price_paid = amount_received
      // TODO: Send confirmation email via Resend
      break;

    case "payment_intent.canceled":
      console.log(`❌ Payment cancelled for session ${sessionId}, attendee ${attendeeId}`);
      // TODO: Update holds table → status = 'cancelled'
      break;

    case "payment_intent.payment_failed":
      console.log(`⚠️ Payment failed for session ${sessionId}, attendee ${attendeeId}`);
      // TODO: Update holds table → status = 'cancelled'
      // TODO: Notify attendee their payment failed
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
