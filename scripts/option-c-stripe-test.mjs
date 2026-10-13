// Option C mechanics against Stripe TEST mode: save a card at booking, authorise
// it later (at "36 hours out"), capture at "2 hours out". Refuses a live key.
//   set -a; . ./.env.local; set +a; node scripts/option-c-stripe-test.mjs
import Stripe from "../node_modules/stripe/esm/stripe.esm.node.js";
import { authoriseSavedCard, headcountForPrice } from "../lib/authoriseAtConfirm.ts";
import { settlePaymentIntent } from "../lib/lockInCharge.ts";

const key = process.env.STRIPE_SECRET_KEY ?? "";
if (!key.startsWith("sk_test_")) { console.error("REFUSING: not a test key"); process.exit(2); }
const stripe = new Stripe(key, { apiVersion: "2024-04-10" });
let fail = 0;
const check = (label, ok, detail = "") => { if (!ok) fail++; console.log(ok ? "ok  " : "FAIL", label, detail); };
const run = String(Date.now());

// Booking under Option C: a SetupIntent saves the card. Nothing is authorised.
async function book(pm = "pm_card_visa") {
  const customer = await stripe.customers.create({ email: "option-c-test@example.com", metadata: { test: "option-c" } });
  const si = await stripe.setupIntents.create({ customer: customer.id, payment_method_types: ["card"], payment_method: pm, confirm: true, usage: "off_session" });
  return { customer, si };
}
const pis = async (customerId) => (await stripe.paymentIntents.list({ customer: customerId, limit: 20 })).data;
const MAX = 2282, FINAL = 1775;

// A) Book → nothing pending → authorise at 36h → capture final at 2h
{
  const { customer, si } = await book();
  check("A  booking saves the card", si.status === "succeeded" && !!si.payment_method);
  check("A  nothing is authorised or pending at booking", (await pis(customer.id)).length === 0);
  const a = await authoriseSavedCard(stripe, { customerId: customer.id, paymentMethodId: si.payment_method, amountCents: MAX, description: "Hold x1: TEST", metadata: { session_id: "s", attendee_id: "a" }, idempotencyKey: `c-auth-A-${run}` });
  check("A  36 hrs out: authorisation placed for the max", a.ok && a.amountCents === MAX, a.ok ? "" : `(${a.code})`);
  const again = await authoriseSavedCard(stripe, { customerId: customer.id, paymentMethodId: si.payment_method, amountCents: MAX, description: "Hold x1: TEST", metadata: { session_id: "s", attendee_id: "a" }, idempotencyKey: `c-auth-A-${run}` });
  check("A  job re-run → same authorisation, not a second one", again.ok && a.ok && again.piId === a.piId);
  check("A  exactly one authorisation exists", (await pis(customer.id)).length === 1);
  const paid = await settlePaymentIntent(stripe, a.piId, FINAL, "Session x1: TEST");
  check("A  2 hrs out: captured at the final (lower) price", paid.how === "captured" && paid.amountCents === FINAL, `(${paid.how}, ${paid.amountCents}c)`);
}

// B) Card saved fine, but declines when authorised at 36h → clear failure, nothing held
{
  const customer = await stripe.customers.create({ email: "option-c-test@example.com" });
  await stripe.paymentMethods.attach("pm_card_chargeCustomerFail", { customer: customer.id });
  const a = await authoriseSavedCard(stripe, { customerId: customer.id, amountCents: MAX, description: "Hold x1: TEST", metadata: { session_id: "s", attendee_id: "a" }, idempotencyKey: `c-auth-B-${run}` });
  check("B  card declines at 36 hrs → reported as failed, with the bank's reason", !a.ok && !!a.code, a.ok ? "" : `(${a.code})`);
  const list = await pis(customer.id);
  check("B  nothing authorised or charged", list.every((p) => p.status !== "requires_capture" && p.status !== "succeeded"));

  // C) They fix it: add a working card → the retry authorises (new key = new attempt round)
  const good = await stripe.paymentMethods.attach("pm_card_mastercard", { customer: customer.id });
  await stripe.paymentMethods.detach((await stripe.paymentMethods.list({ customer: customer.id, type: "card" })).data.find((p) => p.id !== good.id).id);
  const retry = await authoriseSavedCard(stripe, { customerId: customer.id, amountCents: MAX, description: "Hold x1: TEST", metadata: { session_id: "s", attendee_id: "a" }, idempotencyKey: `c-auth-B-retry1-${run}` });
  check("C  card updated → retry authorises", retry.ok, retry.ok ? "" : `(${retry.code})`);
  const paid = await settlePaymentIntent(stripe, retry.piId, FINAL, "Session x1: TEST");
  check("C  …and is captured at 2 hrs out", paid.how === "captured" && paid.amountCents === FINAL);
}

// D) Bank wants a security check the person isn't there to do → failed, with that reason
{
  const customer = await stripe.customers.create({ email: "option-c-test@example.com" });
  await stripe.paymentMethods.attach("pm_card_authenticationRequired", { customer: customer.id });
  const a = await authoriseSavedCard(stripe, { customerId: customer.id, amountCents: MAX, description: "Hold x1: TEST", metadata: { session_id: "s", attendee_id: "a" }, idempotencyKey: `c-auth-D-${run}` });
  check("D  bank needs a security check → reported as failed", !a.ok, a.ok ? "" : `(${a.code})`);
}

// E) No card at all
{
  const customer = await stripe.customers.create({ email: "option-c-test@example.com" });
  const a = await authoriseSavedCard(stripe, { customerId: customer.id, amountCents: MAX, description: "Hold x1: TEST", metadata: {}, idempotencyKey: `c-auth-E-${run}` });
  check("E  no saved card → reported as failed", !a.ok && a.code === "no_saved_card");
}

// F) Three places: one authorisation for 3 × max; captured at 3 × final
{
  const { customer, si } = await book();
  const a = await authoriseSavedCard(stripe, { customerId: customer.id, paymentMethodId: si.payment_method, amountCents: MAX * 3, description: "Hold x3: TEST", metadata: { quantity: "3" }, idempotencyKey: `c-auth-F-${run}` });
  const paid = a.ok ? await settlePaymentIntent(stripe, a.piId, FINAL * 3, "Session x3: TEST") : null;
  check("F  3 places → one authorisation, captured at 3 × final", !!paid && paid.amountCents === FINAL * 3, paid ? `(${paid.amountCents}c)` : "");
}

// G) The price cap rule (no Stripe): a released place after 36h never raises the price
check("G  18 confirmed, 1 released later → still priced at 18", headcountForPrice(17, 14, 18) === 18);
check("G  more join after 36h → priced at the higher headcount", headcountForPrice(21, 14, 18) === 21);
check("G  before confirmation → at least the minimum", headcountForPrice(9, 14, null) === 14);

console.log(fail ? `\n${fail} FAILED` : "\nall passed");
process.exit(fail ? 1 : 0);
