// Runs the REAL charging code (lib/lockInCharge.ts) against Stripe TEST mode.
// It refuses to run with a live key. From the project folder:
//   set -a; . ./.env.local; set +a; node scripts/lockin-stripe-test.mjs
// Re-run it whenever lib/lockInCharge.ts or the hold flow changes.
import Stripe from "../node_modules/stripe/esm/stripe.esm.node.js";
import { settlePaymentIntent } from "../lib/lockInCharge.ts";

const key = process.env.STRIPE_SECRET_KEY ?? "";
if (!key.startsWith("sk_test_")) { console.error("REFUSING: not a test key"); process.exit(2); }
const stripe = new Stripe(key, { apiVersion: "2024-04-10" });

let fail = 0;
const check = (label, ok, detail = "") => { if (!ok) fail++; console.log(ok ? "ok  " : "FAIL", label, detail); };

// Mirror how the site places a hold: saved card + manual-capture authorisation.
async function placeHold(amountCents, qty = 1) {
  const customer = await stripe.customers.create({ email: "lockin-test@example.com", metadata: { test: "lock-in" } });
  const pi = await stripe.paymentIntents.create({
    amount: amountCents * qty,
    currency: "nzd",
    customer: customer.id,
    payment_method: "pm_card_visa",
    payment_method_types: ["card"],
    confirm: true,
    capture_method: "manual",
    setup_future_usage: "off_session",
    metadata: { session_id: "test-session", quantity: String(qty) },
    description: `Hold x${qty}: TEST`,
  });
  return { customer, pi };
}
const charges = async (customerId) => (await stripe.paymentIntents.list({ customer: customerId, limit: 20 })).data;
const succeededTotal = (list) => list.filter((p) => p.status === "succeeded").reduce((s, p) => s + p.amount_received, 0);

const MAX = 2282;   // $22.82 authorised at hold time
const FINAL = 1775; // $17.75 final price

// A) Authorisation still live → capture the final (lower) price
{
  const { customer, pi } = await placeHold(MAX);
  check("A  hold placed: authorised, not charged", pi.status === "requires_capture", `(${pi.status})`);
  const r = await settlePaymentIntent(stripe, pi.id, FINAL, "Session x1: TEST");
  check("A  live authorisation → captured", r.how === "captured" && r.amountCents === FINAL, `(${r.how}, ${r.amountCents}c)`);
  const again = await settlePaymentIntent(stripe, pi.id, FINAL, "Session x1: TEST");
  check("A  run again → recognised as already captured", again.how === "already_captured" && again.paidPiId === pi.id);
  check("A  customer paid exactly once, $17.75", succeededTotal(await charges(customer.id)) === FINAL);
}

// B) Authorisation lapsed (Stripe cancels it) → charge the saved card
{
  const { customer, pi } = await placeHold(MAX);
  const cancelled = await stripe.paymentIntents.cancel(pi.id);
  check("B  authorisation lapsed (cancelled)", cancelled.status === "canceled");
  check("B  cancelled authorisation still knows the card", !!cancelled.payment_method && !!cancelled.customer);
  const saved = await stripe.paymentMethods.list({ customer: customer.id, type: "card" });
  check("B  card is saved on the customer", saved.data.length === 1);
  const r = await settlePaymentIntent(stripe, pi.id, FINAL, "Session x1: TEST");
  check("B  lapsed → saved card charged the final price", r.how === "saved_card" && r.amountCents === FINAL, `(${r.how}, ${r.amountCents}c)`);
  check("B  it's a new payment, not the old one", r.paidPiId !== pi.id);
  const again = await settlePaymentIntent(stripe, pi.id, FINAL, "Session x1: TEST");
  check("B  run again → same payment returned, no second charge", again.paidPiId === r.paidPiId);
  const list = await charges(customer.id);
  check("B  customer paid exactly once, $17.75", succeededTotal(list) === FINAL && list.filter((p) => p.status === "succeeded").length === 1);
}

// C) Three places, lapsed → one charge for 3 × final
{
  const { customer, pi } = await placeHold(MAX, 3);
  await stripe.paymentIntents.cancel(pi.id);
  const r = await settlePaymentIntent(stripe, pi.id, FINAL * 3, "Session x3: TEST");
  check("C  3 places, lapsed → charged 3 × $17.75 = $53.25", r.how === "saved_card" && r.amountCents === FINAL * 3, `(${r.amountCents}c)`);
  check("C  customer paid exactly once", succeededTotal(await charges(customer.id)) === FINAL * 3);
}

// D) Price never dropped: final = max → captures the full authorised amount, no more
{
  const { pi } = await placeHold(MAX);
  const r = await settlePaymentIntent(stripe, pi.id, MAX + 500, "Session x1: TEST");
  check("D  asked for more than authorised → capped at the authorised $22.82", r.amountCents === MAX, `(${r.amountCents}c)`);
}

// E) Lapsed and the saved card is gone → fails loudly, nothing charged
{
  const { customer, pi } = await placeHold(MAX);
  const cancelled = await stripe.paymentIntents.cancel(pi.id);
  await stripe.paymentMethods.detach(cancelled.payment_method);
  let threw = null;
  try { await settlePaymentIntent(stripe, pi.id, FINAL, "Session x1: TEST"); } catch (e) { threw = e; }
  check("E  no saved card left at all → reported as a failure", !!threw, threw ? `(${String(threw.message).slice(0, 70)})` : "");
  check("E  nothing charged", succeededTotal(await charges(customer.id)) === 0);
}

// F) Lapsed and the card is declined at charge time → fails loudly, nothing charged
{
  const { customer, pi } = await placeHold(MAX);
  const cancelled = await stripe.paymentIntents.cancel(pi.id);
  // Swap the saved card for one Stripe always declines when charged.
  await stripe.paymentMethods.detach(cancelled.payment_method);
  await stripe.paymentMethods.attach("pm_card_chargeCustomerFail", { customer: customer.id });
  let threw = null;
  try { await settlePaymentIntent(stripe, pi.id, FINAL, "Session x1: TEST"); } catch (e) { threw = e; }
  check("F  declined at charge time → reported as a failure", !!threw, threw ? `(${threw.code ?? ""} ${String(threw.message).slice(0, 60)})` : "");
  check("F  nothing charged", succeededTotal(await charges(customer.id)) === 0);
}

// G) Lapsed, and they've replaced their card since → the new card is charged
{
  const { customer, pi } = await placeHold(MAX);
  const cancelled = await stripe.paymentIntents.cancel(pi.id);
  await stripe.paymentMethods.detach(cancelled.payment_method);
  await stripe.paymentMethods.attach("pm_card_mastercard", { customer: customer.id });
  const r = await settlePaymentIntent(stripe, pi.id, FINAL, "Session x1: TEST");
  const paid = await stripe.paymentIntents.retrieve(r.paidPiId, { expand: ["payment_method"] });
  check("G  card replaced since booking → their current card is charged", r.how === "saved_card" && paid.payment_method?.card?.brand === "mastercard", `(${paid.payment_method?.card?.brand})`);
  check("G  customer paid exactly once, $17.75", succeededTotal(await charges(customer.id)) === FINAL);
}

console.log(fail ? `\n${fail} FAILED` : "\nall passed");
process.exit(fail ? 1 : 0);
