// Shout a mate: step-1 checks, plus the Stripe money steps in TEST mode only
// (pay today's max straight away with a saved card, then refund the difference).
// Run: npx tsx scripts/shout-test.ts
import { readFileSync } from "fs";
import Stripe from "stripe";
import { checkShoutInput } from "../lib/shout";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}
let fails = 0;
const check = (name: string, ok: boolean) => { console.log(`${ok ? "ok  " : "FAIL"} ${name}`); if (!ok) fails++; };
const err = (b: object) => "error" in checkShoutInput(b as Record<string, unknown>);

check("needs a first name", err({ deliver: "link" }));
check("needs a way to send it", err({ name: "Sam" }));
check("link: name is enough", !err({ name: "Sam", deliver: "link" }));
check("email: needs their email", err({ name: "Sam", deliver: "email", permission: true }));
check("email: needs the permission tick", err({ name: "Sam", deliver: "email", email: "sam@example.com" }));
check("email: all good", !err({ name: "Sam", deliver: "email", email: "sam@example.com", permission: true }));
check("note over 140 characters is stopped", err({ name: "Sam", deliver: "link", note: "a".repeat(141) }));
const ok = checkShoutInput({ name: "  Sam Smith ", deliver: "link", note: "  hi   there " }) as { ok: { name: string; note: string } };
check("keeps first name only, tidies the note", ok.ok.name === "Sam" && ok.ok.note === "hi there");

async function stripeSteps() {
  const key = process.env.STRIPE_SECRET_KEY ?? "";
  if (!key.startsWith("sk_test_")) { console.log("skip Stripe steps (not a test key)"); return; }
  const stripe = new Stripe(key, { apiVersion: "2024-04-10" });
  const customer = await stripe.customers.create({ description: "shout-test (delete me)" });
  const pm = await stripe.paymentMethods.attach("pm_card_visa", { customer: customer.id });
  // Saved card, charged straight away (same params as lib/shout.ts startShout).
  const pi = await stripe.paymentIntents.create({
    amount: 2282, currency: "nzd", customer: customer.id, payment_method_types: ["card"],
    payment_method: pm.id, confirm: true, return_url: "https://stretchyyoga.co.nz/sessions/x/shout?shout=y",
    metadata: { kind: "shout", shout_id: "test" },
  });
  check("saved card: paid straight away ($22.82)", pi.status === "succeeded" && pi.amount_received === 2282);
  // 30 mins out: final price $14.52, so $8.30 goes back.
  const refund = await stripe.refunds.create({ payment_intent: pi.id, amount: 2282 - 1452 }, { idempotencyKey: `shout-test-${pi.id}` });
  const again = await stripe.refunds.create({ payment_intent: pi.id, amount: 2282 - 1452 }, { idempotencyKey: `shout-test-${pi.id}` });
  check("difference refunded ($8.30)", refund.status === "succeeded" && refund.amount === 830);
  check("running it twice never refunds twice", again.id === refund.id);
  const after = await stripe.paymentIntents.retrieve(pi.id, { expand: ["latest_charge"] });
  check("giver ends up paying the final price ($14.52)", (after.latest_charge as Stripe.Charge).amount - (after.latest_charge as Stripe.Charge).amount_refunded === 1452);
  await stripe.customers.del(customer.id);
}

stripeSteps().then(() => {
  console.log(fails ? `\n${fails} failed` : "\nAll passed");
  process.exit(fails ? 1 : 0);
});
