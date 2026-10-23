# Card fees: what they cost, and how to bring them down

*Written 23 October 2026, after the first real Stretchy session (Herne Bay, Fri 23 Oct). Kept with the stretchy.social research so the two can shape the platform together.*

## Where we are

On a Stretchy session, every person pays by card through Stripe. Stripe takes a **percentage plus a fixed amount (about 30c) on every payment**. On a $16 place, the 30c alone is close to 2% of the price. That makes small, frequent payments the most expensive kind to process.

**Herne Bay, 23 Oct:** 19 paid places at $15.97 = $303.43 collected. Card fees were roughly **$13–15**, more if any were overseas cards. HQ Money now shows the exact figure.

## What we're doing

| When | What | Status |
|---|---|---|
| Now | **A. Show the real fees in HQ Money.** Each session's actual Stripe fees appear as a cost, so the net figure matches what lands in the bank. Customer prices don't change. | Built Oct 2026 |
| After a few weeks of A | **B. Make the price cover card fees.** Worked into the price calculation, not a fixed cost line, because fees grow with headcount. Raises prices slightly (roughly 4–5% at today's prices). | Decide once A has a few weeks of real numbers |
| End of Summer Beta trials | **Passes / credits** and **Stripe custom pricing** (see 1 and 5 below) | Parked: come back to these |

## Ideas for bringing fees down

### For Stretchy Yoga

1. **Passes or credits (biggest lever, parked until end of Summer Beta).** Someone buys, say, 5 sessions in one payment, and each session draws from their balance. That's one card fee instead of five, which saves about $1.20 in fixed fees per person per 5 sessions. People-powered pricing still works: the final price comes off the balance, and any difference stays as credit.
   *Check first:* the rules on holding customers' money. In NZ, prepaid credit usually needs at least a 3-year expiry. Confirm with the accountant or lawyer.
2. **Pay by bank (account to account).** NZ open-banking payment providers (for example Akahu and Blinkpay) move money straight from someone's bank account. Their fees are often well below card rates. They don't support holds, so they'd suit passes and top-ups, not the hold-then-charge-the-final-price step.
3. **One payment per booking, not per place.** Booking for yourself and a friend is already one payment. Keep it that way as group features grow.
4. **Keep the free bits free.** Saving a card (Option C) and releasing a hold cost nothing. Failed attempts cost no money, only admin.
5. **Negotiate with Stripe at volume (parked until end of Summer Beta).** Once monthly volume is meaningful, Stripe offers custom pricing. One option passes on NZ's regulated (lower) card fees directly, instead of Stripe's flat blended rate.

### For white-label clients (stretchy.social)

6. **Each client uses their own Stripe account** (via Stripe Connect). The client is the seller, card fees come out of their payments, and Stretchy takes its platform fee automatically. Stretchy never carries card costs for other people's events. This is the standard model for platforms like this, and worth deciding early because it shapes how payments are built.
7. **Let clients choose how fees are covered:** built into the price (like B), absorbed by them, or shown separately. NZ is tightening rules on card surcharges, so building fees into the price is the safer default.
8. **Passes, memberships and pay-by-bank** carry across as platform features, and they're a selling point against Eventbrite or Momence fees.

## Questions for the accountant

- Is it fine to treat Stripe fees as a cost of each session, or should they sit in overall overheads?
- Do prices that include GST change how card fees are reported?
- What would we need in place to offer prepaid passes or credits (expiry, holding customers' money, GST on prepaid credit)?
- (From the currency question) Charging in AUD, GBP or USD while Stripe pays out in NZD, and GST on sessions held outside NZ.
