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

// ── When does a booking need a fresh authorisation at 36 hours out? ──────────

/** Authorisations last 5–7 days depending on the card. Treat 4.5 days as the safe limit. */
export const SAFE_AUTH_AGE_MS = 4.5 * 24 * 60 * 60 * 1000;

/**
 * True if the authorisation placed at booking can't be relied on to still be
 * alive at capture time (2 hours before the session): it has already lapsed or
 * been cancelled, or it will be too old by then.
 */
export function needsFreshAuthorisation(
  pi: { status: string; created: number } | null,
  captureAt: Date
): boolean {
  if (!pi) return true;
  if (pi.status === "succeeded") return false; // already paid
  if (pi.status !== "requires_capture") return true;
  return captureAt.getTime() - pi.created * 1000 > SAFE_AUTH_AGE_MS;
}

/** How long someone has to fix a card that failed at 36 hours out. */
export const CARD_DEADLINE_HOURS = 12; // before the session starts
export const CARD_REMINDER_HOURS = 20; // one reminder, 8 hours before the deadline

export function cardDeadline(startsAt: string | Date): Date {
  return new Date(new Date(startsAt).getTime() - CARD_DEADLINE_HOURS * 60 * 60 * 1000);
}

/** What the session-check job should do for a booking whose card failed. */
export function cardFollowUp(i: { hoursUntil: number; reminded: boolean }): "release" | "remind" | "wait" {
  if (i.hoursUntil <= CARD_DEADLINE_HOURS) return "release";
  if (i.hoursUntil <= CARD_REMINDER_HOURS && !i.reminded) return "remind";
  return "wait";
}
