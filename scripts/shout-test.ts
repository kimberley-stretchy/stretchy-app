// Shout a mate: step-1 checks, plus the Stripe money steps in TEST mode only
// (pay today's max straight away with a saved card, then refund the difference).
// Run: npx tsx scripts/shout-test.ts
import { readFileSync } from "fs";
import Stripe from "stripe";
import { checkShoutInput } from "../lib/shout";
import { renderAttendeeEmail } from "../lib/attendeeEmailTemplates";
import { noFreeCancel } from "../lib/shoutCancel";

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

// ── Part B: cancelling ──
const rb = checkShoutInput({ name: "Sam", deliver: "link", rebookOf: "11111111-2222-3333-4444-555555555555" }) as { ok: { rebookOf?: string } };
check("re-book: keeps the called-off shout's id", rb.ok.rebookOf === "11111111-2222-3333-4444-555555555555");
const rbBad = checkShoutInput({ name: "Sam", deliver: "link", rebookOf: "nope" }) as { ok: { rebookOf?: string } };
check("re-book: ignores a bad id", rbBad.ok.rebookOf === undefined);
check("inside 36 hrs: says no free cancelling, with the times", /Free cancelling closed 36 hours out/.test(noFreeCancel(new Date(Date.now() + 20 * 3600e3).toISOString())));

const base = { to: "x@example.com", name: "Kim", sessionTitle: "Herne Bay | Morning", date: "", sessionId: "s1", startsAt: new Date(Date.now() + 40 * 3600e3).toISOString(), shoutTo: "Sam", shoutCode: "abcdefgh23", shoutId: "sh1" };
const has = (type: Parameters<typeof renderAttendeeEmail>[0], extra: object, ...words: string[]) => {
  const { html, subject } = renderAttendeeEmail(type, { ...base, ...extra } as Parameters<typeof renderAttendeeEmail>[1]);
  const all = subject + html;
  return words.every((w) => all.includes(w));
};
check("called off (giver): re-book or refund, 7 days", has("shout_called_off", { shoutPaid: "$22.82" }, "Re-book Sam", "Refund me", "/shout/again/sh1?refund=1", "No choice in 7 days"));
check("called off (mate): told kindly, pays nothing", has("shout_called_off", { shoutRole: "mate", shoutFrom: "Kim" }, "Change of plan", "You don't pay a thing"));
check("can't make it, up to 36 hrs: refunded", has("shout_released", { shoutRefund: "$22.82" }, "Sam can't make it", "$22.82", "Shout someone else"));
check("can't make it, inside 36 hrs: pass the link on", has("shout_released", {}, "no free cancelling", "/shout/abcdefgh23"));
check("48-hr nudge: link, free to cancel until 36 hours out", has("shout_unclaimed_nudge", { shoutDeliver: "email" }, "hasn't claimed", "Send it again", "Free to cancel until 36 hours out"));
check("refunded: giver cancelled", has("shout_refunded", { shoutRefund: "$22.82", shoutWhy: "giver", shoutDeliver: "link" }, "Refunded", "won't work any more"));
check("refunded: after 7 days", has("shout_refunded", { shoutRefund: "$22.82", shoutWhy: "expired" }, "a week ago"));
const noSpot = ["shout_called_off", "shout_released", "shout_unclaimed_nudge", "shout_refunded"].every((t) => !/\bspot/i.test(renderAttendeeEmail(t as Parameters<typeof renderAttendeeEmail>[0], base as Parameters<typeof renderAttendeeEmail>[1]).html.replace(/<[^>]+>/g, "")));
check("word list: no \"spot\" in the new emails", noSpot);

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
  // Part B: a full refund (giver cancels / mate can't make it / we call it off), once only.
  const pi2 = await stripe.paymentIntents.create({
    amount: 2282, currency: "nzd", customer: customer.id, payment_method_types: ["card"],
    payment_method: pm.id, confirm: true, return_url: "https://stretchyyoga.co.nz/sessions/x/shout?shout=y",
    metadata: { kind: "shout", shout_id: "test2" },
  });
  const full = await stripe.refunds.create({ payment_intent: pi2.id }, { idempotencyKey: `shout-test-cancel-${pi2.id}` });
  const full2 = await stripe.refunds.create({ payment_intent: pi2.id }, { idempotencyKey: `shout-test-cancel-${pi2.id}` });
  check("cancel: refunded in full ($22.82)", full.status === "succeeded" && full.amount === 2282);
  check("cancel: tapping twice never refunds twice", full2.id === full.id);
  await stripe.customers.del(customer.id);
}

stripeSteps().then(() => {
  console.log(fails ? `\n${fails} failed` : "\nAll passed");
  process.exit(fails ? 1 : 0);
});
