import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

// The real card fees Stripe took, for HQ Money. Stripe records the fee on each
// payment's "balance transaction" (what actually landed in the Stretchy
// balance). We ask once per payment and keep the answer on the hold
// (holds.stripe_fee_cents), so HQ doesn't ask Stripe again every time the page
// opens. If that column hasn't been added yet, fees are still worked out, just
// not kept.

export type FeeHold = { id: string; stripe_pi_id: string | null; amount_charged_nzd: number | null; stripe_fee_cents?: number | null };

function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key, { apiVersion: "2024-04-10" }) : null;
}

/** The fee (in cents) Stripe took on one payment, or null if there's nothing to read yet. */
export async function feeForPaymentIntent(stripe: Stripe, piId: string): Promise<number | null> {
  const pi = await stripe.paymentIntents.retrieve(piId, { expand: ["latest_charge.balance_transaction"] });
  const charge = pi.latest_charge as Stripe.Charge | null;
  const bt = charge?.balance_transaction as Stripe.BalanceTransaction | null;
  return bt && typeof bt.fee === "number" ? bt.fee : null;
}

/** Card fees in cents for each charged hold (hold id → cents). Holds that were free (on us) cost nothing. */
export async function cardFeesFor(admin: SupabaseClient, holds: FeeHold[]): Promise<Map<string, number>> {
  const fees = new Map<string, number>();
  const missing: FeeHold[] = [];
  for (const h of holds) {
    if (!h.amount_charged_nzd || !h.stripe_pi_id?.startsWith("pi_")) continue;
    if (typeof h.stripe_fee_cents === "number") fees.set(h.id, h.stripe_fee_cents);
    else missing.push(h);
  }
  const stripe = missing.length ? stripeClient() : null;
  if (!stripe) return fees;

  // A few at a time, so a long list doesn't trip Stripe's rate limit.
  for (let i = 0; i < missing.length; i += 5) {
    await Promise.all(missing.slice(i, i + 5).map(async (h) => {
      const fee = await feeForPaymentIntent(stripe, h.stripe_pi_id!).catch(() => null);
      if (fee == null) return;
      fees.set(h.id, fee);
      await admin.from("holds").update({ stripe_fee_cents: fee }).eq("id", h.id).then(() => {}, () => {});
    }));
  }
  return fees;
}
