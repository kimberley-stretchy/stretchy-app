import type Stripe from "stripe";

// ─────────────────────────────────────────────────────────────────────────────
// Taking the final payment for one booking, 2 hours before a session.
//
// When someone holds a place we place a card authorisation (a PaymentIntent with
// manual capture) and save their card. At charge time one of three things is true:
//
//   1. The authorisation is still live           → capture it, for the final price.
//   2. It was already captured by an earlier run → nothing to do.
//   3. It has lapsed. Card authorisations only last about 5–7 days, so any place
//      held more than a week ahead lands here: Stripe has cancelled it. We charge
//      the saved card directly for the final price instead.
//
// Anything else is a failure: this throws, and the caller tells HQ who wasn't
// charged. It never charges more than `dueCents`, and a repeat call for the same
// booking can never charge twice.
//
// Kept apart from the cron route so it can be run against Stripe's test mode.
// ─────────────────────────────────────────────────────────────────────────────

export type SettleResult = {
  /** The PaymentIntent that actually took the money. */
  paidPiId: string;
  how: "captured" | "already_captured" | "saved_card";
  /** What was taken, in cents. */
  amountCents: number;
};

export async function settlePaymentIntent(
  stripe: Stripe,
  piId: string,
  dueCents: number,
  description: string
): Promise<SettleResult> {
  let pi = await stripe.paymentIntents.retrieve(piId);

  // 2. Already captured by an earlier run.
  if (pi.status === "succeeded") {
    return { paidPiId: pi.id, how: "already_captured", amountCents: pi.amount_received };
  }

  // 1. Authorisation still live — capture the final price (it may have been
  //    authorised at a higher one). Never more than was authorised.
  if (pi.status === "requires_capture") {
    const amount = Math.min(dueCents, pi.amount);
    try {
      const captured = await stripe.paymentIntents.capture(piId, { amount_to_capture: amount });
      return { paidPiId: captured.id, how: "captured", amountCents: captured.amount_received };
    } catch (captureErr) {
      // Usually the authorisation lapsed between reading it and capturing it.
      // Re-read: if Stripe has now cancelled it, fall through to the saved card.
      // If it's still sitting there uncaptured, something else is wrong — stop,
      // rather than take a second payment on top of a live authorisation.
      pi = await stripe.paymentIntents.retrieve(piId);
      if (pi.status === "succeeded") {
        return { paidPiId: pi.id, how: "already_captured", amountCents: pi.amount_received };
      }
      if (pi.status !== "canceled") throw captureErr;
    }
  }

  // 3. Lapsed. Only ever from a cancelled authorisation — never on top of a live one.
  if (pi.status !== "canceled") {
    throw new Error(`PaymentIntent ${piId} is ${pi.status} — not charging.`);
  }

  const customerId = typeof pi.customer === "string" ? pi.customer : pi.customer?.id;
  let paymentMethodId = typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method?.id;
  // Use the card they held with, if it's still saved to them. If they've since
  // removed or replaced it, use the card they have saved now.
  if (customerId && paymentMethodId) {
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId).catch(() => null);
    const owner = typeof pm?.customer === "string" ? pm.customer : pm?.customer?.id;
    if (owner !== customerId) paymentMethodId = undefined;
  }
  if (customerId && !paymentMethodId) {
    const pms = await stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 1 });
    paymentMethodId = pms.data[0]?.id;
  }
  if (!customerId || !paymentMethodId) {
    throw new Error(`No saved card to charge for PaymentIntent ${piId}.`);
  }

  const recharge = await stripe.paymentIntents.create(
    {
      amount: dueCents,
      currency: pi.currency,
      customer: customerId,
      payment_method: paymentMethodId,
      off_session: true,
      confirm: true,
      metadata: { ...pi.metadata, replaces_pi: piId },
      description,
    },
    // A re-run must never charge the same booking twice.
    { idempotencyKey: `lock-in-recharge-${piId}` }
  );
  if (recharge.status !== "succeeded") {
    throw new Error(`Saved-card charge for PaymentIntent ${piId} ended as ${recharge.status}.`);
  }
  return { paidPiId: recharge.id, how: "saved_card", amountCents: recharge.amount_received };
}
