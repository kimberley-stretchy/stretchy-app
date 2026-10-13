// The 36-hour card step, end to end against Stripe TEST mode, with a pretend
// database (so no real bookings are touched and no emails are sent).
//   set -a; . ./.env.local; set +a; npx tsx scripts/option-c-flow-test.ts
import Stripe from "stripe";
import { confirmCards } from "../lib/confirmCards";
import { settlePaymentIntent } from "../lib/lockInCharge";
import { startCardFix, finishCardFix } from "../lib/cardFix";

const key = process.env.STRIPE_SECRET_KEY ?? "";
if (!key.startsWith("sk_test_")) { console.error("Refusing to run: needs a Stripe TEST key."); process.exit(1); }
const stripe = new Stripe(key, { apiVersion: "2024-04-10" });

let fail = 0;
const check = (name: string, ok: boolean, extra = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${name} ${extra}`); if (!ok) fail++; };

// ── a pretend database: just the calls confirmCards makes ────────────────────
type Row = Record<string, any>;
const db: Record<string, Row[]> = { holds: [], attendees: [], sessions: [] };
function fakeAdmin(): any {
  return {
    from(table: string) {
      let rows = db[table];
      let patch: Row | null = null;
      const q: any = {
        select: () => q,
        update: (p: Row) => { patch = p; return q; },
        eq: (col: string, v: any) => { rows = rows.filter((r) => r[col] === v); return q; },
        in: (col: string, vs: any[]) => { rows = rows.filter((r) => vs.includes(r[col])); return q; },
        maybeSingle: () => Promise.resolve({ data: rows[0] ?? null, error: null }),
        then: (res: any, rej: any) => {
          if (patch) rows.forEach((r) => Object.assign(r, patch));
          return Promise.resolve({ data: rows, error: null }).then(res, rej);
        },
      };
      return q;
    },
  };
}

async function person(label: string, pm: string) {
  const c = await stripe.customers.create({ email: `${label}@example.test`, metadata: { test: "option-c-flow" } });
  const attached = await stripe.paymentMethods.attach(pm, { customer: c.id });
  db.attendees.push({ id: `att_${label}`, auth_user_id: `user_${label}`, stripe_customer_id: c.id, stripe_pm_id: attached.id });
  return { customerId: c.id, pmId: attached.id, userId: `user_${label}` };
}
async function bookingAuth(p: { customerId: string; pmId: string }, cents: number, lapse: boolean) {
  const pi = await stripe.paymentIntents.create({ amount: cents, currency: "nzd", customer: p.customerId, payment_method: p.pmId, payment_method_types: ["card"], capture_method: "manual", confirm: true, off_session: true });
  if (lapse) await stripe.paymentIntents.cancel(pi.id); // what Stripe does itself after ~7 days
  return pi.id;
}

const RUN = Date.now().toString(36); // fresh booking ids each run
const UNIT = 2282; // $22.82, Herne Bay at its minimum
const session = { id: "sess_test", title: "Test session", starts_at: new Date(Date.now() + 36 * 3600 * 1000).toISOString() };

(async () => {
  const good = await person("good", "pm_card_visa");
  const two = await person("two", "pm_card_mastercard");
  const broke = await person("broke", "pm_card_visa"); // books fine…
  const recent = await person("recent", "pm_card_visa");

  const piGood = await bookingAuth(good, UNIT, true);
  const piTwo = await bookingAuth(two, UNIT * 2, true);
  const piBroke = await bookingAuth(broke, UNIT, true);
  const piRecent = await bookingAuth(recent, UNIT, false);
  // …then their card stops working before 36 hrs out.
  await stripe.paymentMethods.detach(broke.pmId);
  const bad = await stripe.paymentMethods.attach("pm_card_chargeCustomerFail", { customer: broke.customerId });
  db.attendees.find((a) => a.auth_user_id === broke.userId)!.stripe_pm_id = bad.id;

  db.holds.push(
    { id: `h_good_${RUN}`, session_id: session.id, state: "active", user_id: good.userId, quantity: 1, stripe_pi_id: piGood, is_comp: false },
    { id: `h_two_${RUN}`, session_id: session.id, state: "active", user_id: two.userId, quantity: 2, stripe_pi_id: piTwo, is_comp: false },
    { id: `h_broke_${RUN}`, session_id: session.id, state: "active", user_id: broke.userId, quantity: 1, stripe_pi_id: piBroke, is_comp: false },
    { id: `h_recent_${RUN}`, session_id: session.id, state: "active", user_id: recent.userId, quantity: 1, stripe_pi_id: piRecent, is_comp: false },
    { id: `h_comp_${RUN}`, session_id: session.id, state: "active", user_id: "user_comp", quantity: 1, stripe_pi_id: null, is_comp: true },
    { id: `h_gone_${RUN}`, session_id: session.id, state: "released", user_id: "user_gone", quantity: 1, stripe_pi_id: null, is_comp: false },
  );
  const hold = (id: string) => db.holds.find((h) => h.id === id)!;

  const r1 = await confirmCards(fakeAdmin(), session, UNIT);
  const out = (id: string) => r1.outcomes.find((o) => o.holdId === id);
  check("1  it ran, and looked at the 4 paying bookings only", r1.ran && r1.outcomes.length === 4);

  check("2  lapsed booking, good card → fresh authorisation", out(`h_good_${RUN}`)?.status === "authorised" && hold(`h_good_${RUN}`).stripe_pi_id !== piGood);
  const newGood = await stripe.paymentIntents.retrieve(hold(`h_good_${RUN}`).stripe_pi_id);
  check("2  …a hold for exactly $22.82, nothing taken", newGood.status === "requires_capture" && newGood.amount === UNIT && newGood.amount_received === 0);

  const newTwo = await stripe.paymentIntents.retrieve(hold(`h_two_${RUN}`).stripe_pi_id);
  check("3  two places → one hold for 2 × $22.82", out(`h_two_${RUN}`)?.status === "authorised" && newTwo.amount === UNIT * 2);

  check("4  card stopped working → marked, not authorised", out(`h_broke_${RUN}`)?.status === "failed" && !!hold(`h_broke_${RUN}`).card_failed_at, `(${out(`h_broke_${RUN}`)?.code})`);
  check("4  …their booking is still held, and the old payment untouched", hold(`h_broke_${RUN}`).state === "active" && hold(`h_broke_${RUN}`).stripe_pi_id === piBroke);

  check("5  booked recently → original authorisation kept, no second one", out(`h_recent_${RUN}`)?.status === "kept" && hold(`h_recent_${RUN}`).stripe_pi_id === piRecent);
  check("6  gifted place → never touched", hold(`h_comp_${RUN}`).stripe_pi_id === null && !hold(`h_comp_${RUN}`).card_failed_at);

  // The job runs again 15 minutes later (or twice by accident).
  const goodAfterFirst = hold(`h_good_${RUN}`).stripe_pi_id;
  const r2 = await confirmCards(fakeAdmin(), session, UNIT);
  check("7  run again → nobody is authorised twice", hold(`h_good_${RUN}`).stripe_pi_id === goodAfterFirst && r2.outcomes.find((o) => o.holdId === `h_good_${RUN}`)?.status === "kept");
  const all = await stripe.paymentIntents.list({ customer: good.customerId, limit: 10 });
  check("7  …one live hold on their card, not two", all.data.filter((p) => p.status === "requires_capture").length === 1);

  // 2 hours out: more people joined, final price is lower.
  const s1 = await settlePaymentIntent(stripe, hold(`h_good_${RUN}`).stripe_pi_id, 1597, "Test");
  check("8  charged at 2 hrs out: the lower final price, from the fresh hold", s1.how === "captured" && s1.amountCents === 1597);
  const s2 = await settlePaymentIntent(stripe, hold(`h_two_${RUN}`).stripe_pi_id, 1597 * 2, "Test");
  check("8  …and 2 × final for the two places", s2.how === "captured" && s2.amountCents === 3194);

  // ── "Update my card": the person whose card failed comes back to fix it ────
  db.sessions.push({ id: session.id, title: session.title, starts_at: session.starts_at, state: "confirmed", min_attendees: 14, cost_base: 199.49, revenue_target: 120, confirmed_headcount: 14 });
  const admin = fakeAdmin;
  const me = { sessionId: session.id, userId: broke.userId, userEmail: "broke@example.test" };

  const st = await startCardFix(admin(), stripe, me);
  check("9  card form opens for exactly their max ($22.82)", st.status === "needs_card" && st.maxTotal === 22.82 && st.quantity === 1);
  const fixPi = st.status === "needs_card" ? st.paymentIntentId : "";

  const early = await finishCardFix(admin(), stripe, { ...me, paymentIntentId: fixPi });
  check("10 pressing finish before the card has gone through → refused", early.ok === false && hold(`h_broke_${RUN}`).card_failed_at);

  const other = await finishCardFix(admin(), stripe, { sessionId: session.id, userId: good.userId, paymentIntentId: fixPi });
  check("11 someone else can't use this card check on their booking", other.ok === false && (other as any).status === 403);

  await stripe.paymentIntents.confirm(fixPi, { payment_method: "pm_card_visa" }); // what the card form does
  const fin = await finishCardFix(admin(), stripe, { ...me, paymentIntentId: fixPi });
  check("12 new card goes through → booking back to normal", fin.ok === true && (fin as any).changed && !hold(`h_broke_${RUN}`).card_failed_at && hold(`h_broke_${RUN}`).stripe_pi_id === fixPi);
  const fixed = await stripe.paymentIntents.retrieve(fixPi);
  check("12 …a hold for $22.82, nothing taken, new card saved", fixed.status === "requires_capture" && fixed.amount === UNIT && db.attendees.find((a) => a.auth_user_id === broke.userId)!.stripe_pm_id === fixed.payment_method);

  const again = await finishCardFix(admin(), stripe, { ...me, paymentIntentId: fixPi });
  check("13 pressing the button twice changes nothing", again.ok === true && (again as any).changed === false);

  check("14 someone whose card is fine sees 'all sorted'", (await startCardFix(admin(), stripe, { sessionId: session.id, userId: recent.userId })).status === "all_good");
  check("15 someone with no booking sees 'not held any more'", (await startCardFix(admin(), stripe, { sessionId: session.id, userId: "user_gone" })).status === "no_hold");

  const s3 = await settlePaymentIntent(stripe, fixPi, 1597, "Test");
  check("16 and at 2 hrs out they're charged the final price like everyone else", s3.how === "captured" && s3.amountCents === 1597);

  for (const a of db.attendees) await stripe.customers.del(a.stripe_customer_id).catch(() => {});
  console.log(fail ? `\n${fail} FAILED` : "\nall passed");
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
