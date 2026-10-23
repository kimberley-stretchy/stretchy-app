// Card fees for HQ Money, against Stripe TEST mode: hold $19.97, take $15.97
// (like a real lock-in), then read the fee the way HQ does. Refuses a live key.
//   set -a; . ./.env.local; set +a; npx tsx scripts/stripe-fee-test.ts
import Stripe from "stripe";
import { feeForPaymentIntent } from "@/lib/stripeFees";

const key = process.env.STRIPE_SECRET_KEY ?? "";
if (!key.startsWith("sk_test_")) { console.error("Refusing to run: needs a Stripe TEST key."); process.exit(2); }
const stripe = new Stripe(key, { apiVersion: "2024-04-10" });
let fails = 0;
const check = (name: string, ok: boolean, extra = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${name} ${extra}`); if (!ok) fails++; };

(async () => {
  const pi = await stripe.paymentIntents.create({
    amount: 1997, currency: "nzd", capture_method: "manual", payment_method: "pm_card_visa",
    payment_method_types: ["card"], confirm: true, description: "Fee test (test mode)",
  });
  check("held $19.97", pi.status === "requires_capture");
  check("nothing to read before it's taken", (await feeForPaymentIntent(stripe, pi.id)) === null);
  await stripe.paymentIntents.capture(pi.id, { amount_to_capture: 1597 });
  const fee = await feeForPaymentIntent(stripe, pi.id);
  check("took $15.97 and read the fee", typeof fee === "number" && fee > 0 && fee < 1597, `→ ${fee} cents`);
  console.log(fails ? `\n${fails} failed` : "\nall passed");
  process.exit(fails ? 1 : 0);
})();
