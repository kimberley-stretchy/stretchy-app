import type Stripe from "stripe";

// ─────────────────────────────────────────────────────────────────────────────
// OPTION C — authorise at 36 hours out, not at booking.
//
// Booking only SAVES the card (no pending amount on anyone's bank). When a
// session is confirmed at 36 hours out, we place the authorisation then, for the
// most the person can pay. It is captured at 2 hours out, well inside the 5–7
// days an authorisation lasts — so nothing lapses, and a card problem shows up
// 34 hours ahead, not at 4am on the day.
//
// This file is the Stripe half: place one authorisation on a saved card and say
// plainly whether it worked. It never captures money. Kept apart from the jobs
// so it can be run against Stripe's test mode (scripts/option-c-stripe-test.mjs).
// ─────────────────────────────────────────────────────────────────────────────

export type AuthoriseResult =
  | { ok: true; piId: string; amountCents: number }
  | { ok: false; code: string; message: string; piId?: string };

export async function authoriseSavedCard(
  stripe: Stripe,
  o: {
    customerId: string;
    /** The card they booked with, if known. Falls back to the card saved now. */
    paymentMethodId?: string | null;
    amountCents: number;
    currency?: string;
    description: string;
    metadata: Record<string, string>;
    /** One per hold per attempt-round, so a re-run can never authorise twice. */
    idempotencyKey: string;
  }
): Promise<AuthoriseResult> {
  // Use the card they booked with if it's still theirs; else the one saved now.
  let paymentMethodId = o.paymentMethodId ?? undefined;
  if (paymentMethodId) {
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId).catch(() => null);
    const owner = typeof pm?.customer === "string" ? pm.customer : pm?.customer?.id;
    if (owner !== o.customerId) paymentMethodId = undefined;
  }
  if (!paymentMethodId) {
    const pms = await stripe.paymentMethods.list({ customer: o.customerId, type: "card", limit: 1 });
    paymentMethodId = pms.data[0]?.id;
  }
  if (!paymentMethodId) return { ok: false, code: "no_saved_card", message: "No saved card on file." };

  try {
    const pi = await stripe.paymentIntents.create(
      {
        amount: o.amountCents,
        currency: o.currency ?? "nzd",
        customer: o.customerId,
        payment_method: paymentMethodId,
        payment_method_types: ["card"],
        off_session: true,
        confirm: true,
        capture_method: "manual",
        description: o.description,
        metadata: { ...o.metadata, kind: "confirm_auth" },
      },
      { idempotencyKey: o.idempotencyKey }
    );
    if (pi.status === "requires_capture") return { ok: true, piId: pi.id, amountCents: pi.amount };
    return { ok: false, code: pi.status, message: `Authorisation ended as ${pi.status}.`, piId: pi.id };
  } catch (err) {
    const e = err as { code?: string; decline_code?: string; message?: string; payment_intent?: { id?: string } };
    return {
      ok: false,
      code: e.decline_code ?? e.code ?? "card_error",
      message: e.message ?? "The card could not be authorised.",
      piId: e.payment_intent?.id,
    };
  }
}

/**
 * The price a session is held to once it's confirmed: nobody pays more than the
 * price at the 36-hour headcount, even if a place is released afterwards
 * (Stretchy absorbs the difference). `confirmedHeadcount` is the number held
 * when it was confirmed; before that there is no cap beyond the minimum.
 */
export function headcountForPrice(heldNow: number, min: number, confirmedHeadcount?: number | null): number {
  return Math.max(heldNow, min, confirmedHeadcount ?? 0);
}
