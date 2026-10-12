# Stretchy 2.0 copy & booking refresh: handover for Claude Code

**Signed off by Kimberley, 12 Oct 2026.** This file is the final spec. It replaces the older layered notes, now in `COPY_REFRESH_HANDOVER_working-notes.md`. If the two disagree, this file wins.

**Visual reference:** `docs/copy-refresh-mock.html` in this repo (open it in a browser). The same mock is on claude.ai: https://claude.ai/artifact/Uknogfs1ibRHvNJSxPBXPT
**Words:** follow `STRETCHY_WORDS.md` for every customer-facing word.

---

## 0. How to work

- Kimberley is new to coding. Explain each step in plain language before doing it.
- Work on a new branch (e.g. `copy-refresh-oct26`). **Do not deploy to production.** Push a Vercel preview and send Kimberley the link.
- **Database change (section 6) needs Kimberley's OK before it runs on the live database.** Show her the SQL first.
- Build in this order, and show Kimberley a preview after each group:
  1. Shared helpers (section 1)
  2. Homepage + What's on (sections 2–3)
  3. Session page + Manage my booking (sections 4–5)
  4. HQ field (section 6)
  5. Emails (section 7)
  6. Terms, FAQ and other screens (sections 8–9)
  7. Checks (section 10)
- Any AI agent touching live attendee data must run on commercial terms (API or Team/Enterprise), never a personal login.

---

## 1. Shared rules and helpers (build first)

**`lib/sessionTimes.ts`**
- `goNoGo = starts_at − 36h` and `finalCharge = starts_at − 2h`.
- `phase`: `before36 | between | after2 | cancelled`.
- NZ formatters (Pacific/Auckland, daylight-saving safe): "Fri 23 Oct", "6:15–7:15am", "6:05am".
- `dayWord`: before 12:00 → "this morning", 12:00–17:00 → "today", after 17:00 → "tonight".

**Everything is dynamic.** No session detail is ever hard-coded. If a value is empty, hide the row (never show "TBC").

| Mock shows | Comes from |
|---|---|
| Herne Bay \| Morning | session title |
| Fri 23 Oct · 6:15–7:15am | `starts_at`, `starts_at + duration_mins` |
| Bayfield Primary School Hall · Herne Bay | `location_name` · suburb |
| Park on Jervois Road… | `getting_there` (skip the row if empty) |
| Vinyasa yoga, all levels · 60 min | style + level · `duration_mins` |
| Gamo Farani Tomlin | `teacherName` |
| GEM name | `gemName` (drop the GEM words if none) |
| Honey Sundays · café · from 7:15am | `social_stretch_venue` + type · end time (skip if no Social Stretch) |
| Your mat & water / Plus any props… | HQ fields `bring_title` / `bring_note` (section 6) |
| 14 / 30 | `min_attendees` / `max_attendees` |
| 4 in · 10 more to go ahead | held · min − held |
| $22.82 / $10.65 / $17.75 | max price / floor price / final price (all from `lib/pricing.ts`, server side) |

**Rules for "never more than $X"**
- Before 36 hrs out, X is always the price **at the minimum** (e.g. $22.82). Cancellations before 36 hrs can push the current price back up, so never promise a lower ceiling then.
- After 36 hrs out nobody can cancel, so X is the current price.
- The lock-in cron must never charge more than was authorised.

**Holding more than one place** (`my_hold_quantity` / `spots` = n). Everywhere:

| | n = 1 | n > 1 |
|---|---|---|
| Headline | "Your place is held." | "Your {n} places are held." |
| Phrasing | "your place" | "your {n} places"; intros say "you and your crew" |
| Price row | "$X max per person" | bold "${X×n} max for your {n} places", then grey "$X max per person. …" |
| Bring row | as written in HQ | grey line starts "For all {n} of you." |
| Cancel button | "Cancel my hold" | "Change or cancel places" (opens the existing picker) |
| Dots | — | the person's own n places get a thin ink outline |
| Final price email | — | big number = total; small line "charged now for {n} places · $X each · incl. GST" |

**Links**
- "How it works ↗" → `/#how-it-works`.
- "Cancellation policy ↗" → `/terms#cancellation`.
- Both always open in a new tab (`target="_blank" rel="noopener noreferrer"`) with a small ↗.
- Booking, manage and share buttons stay in the same tab.

**`CapacityPips`**
- Add a `showMinLine` prop: a dashed vertical ink line after the last minimum pip.
- Add a `mine` prop: outline the person's own pips.
- Keep the three pip states: filled = held, sand = still needed, outline = room to full.

---

## 2. Homepage

**How it works (`components/marketing/HowItWorks.tsx`).** Keep the blue band, the card style and `PriceSimulator`. Go from 4 cards to 5.

- **Heading:** "The more we move together, the better it gets for all."
- **Intro (bold):** "Every Stretchy needs a certain number of people to go ahead. Once we've got them, it's on, and everyone who joins after makes it cheaper for the whole room. (Yes, people-powered pricing.)"

| Card | Label | Title | Body |
|---|---|---|---|
| 01 | Now | Hold your place | "We save your card and show you the most you'll pay." + See what's on button |
| 02 | 36 hrs out | Going ahead, or not | "If we get enough people, we're on. Not enough? It's called off and you pay nothing. Free cancelling ends here." |
| 03 | 36 → 2 hrs out | Still room to join | "More people can join, and the price keeps dropping for everyone." |
| 04 | 2 hrs out | Final price charged | "Joining closes and we charge your card the final price. The more who joined, the less it is. Never more than the max price shown." |
| 05 | On the day | Move, then the Social Stretch | "Your teacher guides the practice, our Good Energy Managers bring the vibes. Then coffee after, pay your own way." |

- `PriceSimulator` moves into card 03. Use "people" not "PEEPS", ends labelled "14 · goes ahead" / "30 · full", note "Example: Herne Bay mornings."
- **Footer line:** "🌏 🧘 🙏 The Stretchy pricing model rewards community, while making sure teachers, community venues and our Good Energy Managers are paid fairly for their expertise & energy, plus the running costs of Stretchy." **No charity sentence here.** The Cancer Support NZ band lower on the homepage stays as it is.
- **Cancelling line:** "**Cancelling:** free until 36 hours out. After that you're in, and you'll pay the final price. If we ever cancel, you don't pay. Cancellation policy ↗"

**What's on next card (`components/marketing/WhatsOnNext.tsx`).** Keep the live design (photo, date tile, title, Movement/Social rows, price + button, dots). Change only:
- Top-right pill and the label above the dots: "{n} MORE TO GO AHEAD". Once the minimum is reached: "GOING AHEAD ✓ · STILL ROOM TO JOIN".
- Dashed min line in the pips.
- The time line ("6:15 AM–7:15 AM · 60 MIN · ALL LEVELS") 25% larger, ink at 75%.
- Price caption "max per person · incl. GST". Button "Hold my place". Under the dots: max price left, floor price right.

**Third card.** Remove "NOT OPEN YET", "Places open 36 hours before" and the dead "Notify me" button. Show an "Also coming up" card instead:
- dashed border; text, chips and button all ink at 75%
- date, time, title, "$X max · {min} needed"
- a normal "Hold my place" button → `/sessions/{id}`

**Pop-up order (`TestingPopup.tsx` + `CookieNotice.tsx`).** Never show both at once.
- When the pop-up closes (sign-up, "Maybe later" or ×), fire `window.dispatchEvent(new Event("stretchy:popup-closed"))`. `CookieNotice` waits for that event if the pop-up is going to show.
- Otherwise the cookie notice shows straight away, as now.

---

## 3. What's on list (`app/sessions/page.tsx`)

- Cards use the same label language as the homepage: "{n} more to go ahead" / "Going ahead ✓ · still room to join", "$X max", and pips with the min line.
- Add a "How it works ↗" link (new tab) under "{n} sessions coming up".

---

## 4. Session page (`app/sessions/[id]/page.tsx`)

Top to bottom:

1. **Title** (BN Chubb). Between 36 and 2 hrs out, an olive "Going ahead ✓" chip sits above it.
2. **Rows on the background**, no emojis, no box. Mono coloured label on the left; bold value plus grey second line on the right, aligned with each other. 2px sand dividers.
   - WHEN (purple): date / time · duration · level
   - WHERE (ink): venue / suburb
   - MOVEMENT (#0000FF): style / with {teacher}
   - SOCIAL (orange): venue · type / "From {end} · pay your own way"
   - **No GEM row on this page.**
3. **Price block in a 2px ink outline box** (cream, 22px radius), exactly like the homepage card:
   - "$22.82" + "max per person · incl. GST"
   - "{n} MORE TO GO AHEAD" / "{max} MAX" (between 36 and 2 hrs out: "{held} IN · STILL ROOM TO JOIN")
   - pips with the min line
   - max price / floor price under the ends
4. **"Hold my place"**, full width, directly under the box (not sticky).
5. **Timing rows**, same row style. **Everything grey (ink 60%): labels and both lines.**
   - Before 36 hrs:
     - UP TO 36 HRS OUT — **Free to cancel** / "If we get {min} people, we're on. Not enough people? You pay nothing."
     - 36 → 2 HRS OUT — **Still room to join** / "More people can join and the price keeps dropping. No free cancelling from here."
     - 2 HRS OUT — **Final price charged** / "Never more than ${maxAtMin}."
   - Between 36 and 2 hrs:
     - "Going ahead ✓" / "Free cancelling has closed."
     - "Still room to join, right now" / "Join now and you're in straight away. The price keeps dropping."
     - "Final price charged" / "Joining closes. Never more than ${current}."
6. **Links:** How it works ↗ · Cancellation policy ↗, in grey.

---

## 5. Manage my booking (`app/hold/[id]/page.tsx`)

**The whole page background is yellow (#FCBB16).** Divider lines inside the box are ink. Filled buttons have yellow text.

1. **Headline** (BN Chubb): "Your place is held." / "Your {n} places are held." Nothing else above the box.
2. **Outline box** (yellow inside):
   - Bold "Fri 23 Oct | 6:15–7:15am"
   - Grey "Bayfield Primary School Hall | Herne Bay"
   - Mono label "HOW IT GOES", then rows (mono time label left; bold + grey right):
     - BRING WITH YOU — `bring_title` / `bring_note`
     - {start − 10 min} — "Park on …" / address + `getting_there`
     - {start − 5 min} — "Say kia ora" / "Meet your teacher, {teacher}, and your GEM ({gem})." (teacher first; drop the GEM part if none)
     - {start} — "{style}, {level}" / "{duration} minutes. Go at your own pace."
     - {end} — "Social Stretch at {venue}" / "Coffee and chats. Pay your own way."
     - PRICE NOW — "$X max per person" (or the multi-place total) / "{n} more to go ahead. Drops to ${floor} if all {max} fill." Between 36 and 2 hrs: "{held} in · still room to join."
   - Small pips with the min line (+ `mine` outline).
3. **Buttons:**
   - "Share with a mate": filled, full width. It opens the existing share panel (copy invite link with live price, Text, Email, Facebook, Instagram, TikTok).
   - "Cancel my hold" / "Change or cancel places": the same size, transparent, **2px dashed ink**.
   - **After 36 hrs out the cancel button is hidden.**
4. **Links:** How it works ↗ · Cancellation policy ↗, in grey.
5. There are no timing rows and no "Can't make it?" block on this page.

---

## 6. HQ: "Bring with you" per session (needs Kimberley's OK for the migration)

- **Migration** `lib/supabase/migrations/2026-10-12_bring_with_you.sql`: add `bring_title text` and `bring_note text` (both nullable) to `sessions`.
- **`app/admin/sessions/new/page.tsx`** (create + edit): add a "Bring with you" section next to "Getting there", with two inputs.
  - Pre-fill by movement type:
    - Yoga/Pilates: "Your mat & water" / "Plus any props you like, and $$ for coffee after."
    - Run club: "Running shoes & water" / "And $$ for coffee after."
    - Other: "Comfy clothes & water" / "And $$ for the Social Stretch after."
  - HQ can overwrite. Carry the values over when a session is duplicated.
- **`app/api/admin/sessions/route.ts`:** save and return both fields alongside `getting_there`.
- **`lib/sessionEmailContext.ts`:** add `bringTitle` / `bringNote`.
- **Shows on:** Manage my booking and the email run-through. Hide the row if both are empty.

---

## 7. Emails (`lib/stretchy-email.ts`)

**Keep the current look:**
- one brand colour per email
- big 900-weight headline
- 2px outlined boxes
- pill buttons
- the "Welcome to the highlight of your week." block and footer

**No timeline strip and no emojis in rows.** Emails do **not** show real dates or times for the 36 hr and 2 hr moments.

**Every email:**
- "Hey {name}," on its own line, then a warm intro, then "See you there,<br>The Stretchy team" (not bold).
- Links at the bottom: **only** How it works ↗ · Cancellation policy ↗. No Manage link, no FAQ.

**Building blocks** (table-based HTML for mail clients):
- **`dayBox`:** outlined box.
  - "Fri 23 Oct | 6:15–7:15am" (bold), venue | suburb (75% opacity), "HOW IT GOES" label.
  - Rows: Bring with you · Park · Say kia ora · class · Social Stretch, all from the session as in section 5. Optional extra row and dots.
  - **Only used in emails 1, 1b, 1c, 4, 6, 6b and 9.**
- **`peopleDots(held, min, max, mine)`:** drawn live at send time.
  - filled (text colour) = held
  - 45% shaded = still needed
  - 35% outline = room to full
  - dashed line after the min
  - Outlook shows squares; that's fine.
- **`priceBlock`:** a **reversed** box. Fill = the email's text colour; text, lines and dots = the email's background colour.
  - Contents: big mono price + "max per person · incl. GST", "{label}" / "{max} MAX", dots, end prices.
  - Colours: blue email → black box, sky text · purple → white, purple text · olive → white, olive text · orange → black, orange text · cream → black, cream text.
- **`greyRows`:** the session-page timing rows at 75% opacity, with no dates.
- **Buttons:**
  - Filled main button, with text in the email's background colour (purple text on a white button, etc.).
  - "Manage my booking" as an outline button **directly under** "Share with a mate".
  - "Every mate who joins…" is removed everywhere.

**Per email** (full copy in the mock):

1. **Place held** (blue). Subject "Your place is held — {title}". H1 "Your place is held. 🙌".
   - Intro: "**We look forward to seeing you at Stretchy.** We haven't hit the minimum number of people yet, so your place is held and **we'll confirm 36 hours out**. Nothing's charged yet." / "Here's all the deets you need to know. And don't forget, the more people who move together, the better it gets for all. So share Stretchy around!"
   - Then: sign-off → dayBox + PRICE NOW row + dots → Share → Manage → greyRows (Free to cancel · Still room to join · Final price charged + "Your bank might show a pending amount before then. That's a hold, not a payment.") → links.
2. **1b You're in** (late joiner, 36 → 2 hrs; blue). Same layout. Intro says it's already going ahead. Rows use the "between" wording. **Must not offer free cancelling.** Send it from `app/api/holds/route.ts` when `hoursUntil <= 36`.
3. **1c / multi-place** versions of 1 and 6: see the table in section 1.
4. **2 So close** (purple, ~38 hrs, to people holding). "So close. 👀"
   - Intro: "We need **{n} more people** before **36 hours out** for this one to go ahead. Know someone who'd love it? Now's the time to send it their way."
   - Then: priceBlock → Share → Manage → greyRows (Free to cancel + "If we get {min}…" · Final price charged) → links.
5. **3 Could it be you?** (purple, people who tapped ♡). priceBlock → "Hold my place" → greyRows (all three).
6. **4 It's going ahead** (olive, 36 hrs). Subject "It's going ahead 🎉 {title}".
   - Intro: "We hit {min}, so it's going ahead and your place is confirmed. Here's all the deets for the day."
   - Then: dayBox → Manage (outline) → priceBlock ("{held} in · still room to join") → greyRows (Still room to join … No free cancelling from here · Final price charged) → Share.
7. **5 Still room** (orange, after 36 hrs, interested people). Subject "It's going ahead — {title}. Still room 🎉". "…hit {min}, so it's going ahead. There's still room, and you can join up to 2 hours before." priceBlock → Hold my place → greyRows (Still room to join, right now · Final price charged / "Joining closes. Never more than ${current}.").
8. **6 Your final price** (orange, 2 hrs). Subject "Your final price: ${final} — {title}". **Intro in bold:** "See you shortly! {held} of us are moving together {dayWord}, so the price dropped for everyone. Here's everything you need for today." Then: priceBlock "charged now · incl. GST" + "{held} in" + dots → dayBox → Manage. **No "You saved" line.**
9. **7 Not this time** (cream). "…didn't reach {min} people, so it's not going ahead this time. **You pay nothing.** If your bank shows a pending amount, it'll drop off in a few days." / "We'd love to see you at the next one." Dots box "{held} of {min} · not this time" → "See what's next".
10. **8 Hold cancelled** (cream). "Done. Nothing charged, and your place has gone back to the group. If your bank shows a pending amount, it'll drop off in a few days. Hope to see you at another Stretchy soon." → Browse sessions.
11. **9 A place on us** (purple). "Stretchy HQ has saved you a place, on us. Nothing to pay. It still needs {min} people to go ahead, and we'll email you 36 hours out either way." dayBox with a "YOUR PLACE · On us · {n} more to go ahead" row + dots → "Set up my account". **No Share button.**

Also update the push notification text in `app/api/cron/lock-in/route.ts` and `session-check` to match `STRETCHY_WORDS.md`.

---

## 8. Terms & FAQ (`app/terms/page.tsx`, `app/faq/page.tsx`)

The policy stays the same. Only the wording changes to match. Give the Payment & cancellation section `id="cancellation"` and update "Last updated".

**Short version:** "Stretchy connects people who want to move with people who teach. You hold a place, the price drops as the room fills, and everyone pays the same final price, charged 2 hours before the session. If a session doesn't reach its minimum by 36 hours before, it's called off and you pay nothing."

**Payment & cancellation:**
1. **Hold your place.** We save your card and show you the most you'll pay. Nothing is charged yet. Your bank may show a pending amount for a few days. That's a hold, not a payment.
2. **Up to 36 hours before: free to cancel.** No charge, no questions.
3. **36 hours before: going ahead, or not.** If we have the minimum number of people, we're on. If not, it's called off and you pay nothing. Free cancelling ends here.
4. **36 to 2 hours before: still room to join.** More people can join and the price keeps dropping for everyone. If you join in this window, it's already going ahead, so there's no free cancelling.
5. **2 hours before: final price charged.** Joining closes and we charge your card the final price. It's never more than the max price shown. You'll get a receipt.
6. **Can't make it after 36 hours?** The price stands. We don't refund change-of-mind cancellations after this point, because by then we've committed to your teacher, your GEM and your venue. That's what keeps the pricing fair for everyone who shows up. (This doesn't affect your legal rights. See below.)
7. **If we cancel, you don't pay.** If you've already been charged, we refund you in full, back to the card you paid with.
8. **Something serious come up?** Illness, an emergency, life. Get in touch and we'll look at it case by case.

**FAQ.** Replace or add these answers (copy in mock Part 4):
- When do I get charged?
- What if I need to cancel?
- Can I still join after 36 hours?
- What if a session doesn't reach its minimum?
- Why is there a pending amount on my bank?
- I'm holding more than one place. How does that work?

Leave "Your rights", Health & safety and the other sections as they are. **Points 6 and "Your rights" still need a lawyer's review.** Don't change their meaning.

---

## 9. Other screens to bring in line

- **`components/HowToStretchy.tsx`** (used on What's on and session pages): the same 5 steps and cancelling line as the homepage, or remove it if the session page no longer uses it.
- **`components/HoldModal.tsx`:** button "Hold my place". Replace "NO CHARGE YET · CANCEL ANY TIME UP TO 36H OUT" with the session-page timing rows, or just "Free to cancel up to 36 hours out" (between 36 and 2 hrs: "Already going ahead. No free cancelling from here.").
- **`app/onboarding/setup/page.tsx` "HOW YOU'LL PAY":** use Terms points 1–5 wording.
- **`app/notifications/going-ahead` + `cancelled`:** match emails 4 and 7.
- **Late cancel error in `app/api/holds/route.ts`:** "Free cancelling closed 36 hours out ({goNoGo}). Your place is confirmed and the final price is charged 2 hours before ({finalCharge}). Something serious come up? Get in touch." This is the only place real dates for these moments appear.
- **Remove these strings everywhere customer-facing:** "locked in", "locked & loaded", "minimum viable mats", "better-er", "card authorisation", "not open yet", "no charge yet" (on buttons), "PEEPS", "spots to minimum".

---

## 10. Checks before Kimberley signs off

1. **"HOLDING 0 SPOTS" on `/hold/[id]`.** `my_hold_quantity` is 0 when the signed-in person has no active hold, and the page shows it.
   - If 0, redirect to `/sessions/[id]` (or show "You're not holding a place for this one" + Hold my place).
   - Confirm a real holder always sees their true number.
2. **Joining closes at 2 hrs out and at max.** `POST /api/holds` doesn't appear to block holds after the 2-hour charge or past `max_attendees`. Add both, with friendly messages.
3. **Never charge more than authorised.** Confirm the lock-in cron caps at the authorised amount, and that a before-36-hrs cancellation can't push anyone above the at-minimum price.
4. **Late joiner email.** Holds made inside 36 hrs get email 1b, not email 1.
5. **Multi-place.** Test with 1, 2 and 3 places: headline, totals, dots outline, "Change or cancel places", final charge total.
6. **Evening session.** Create a 6pm test session and check the times, "tonight" and "How it goes" read correctly.
7. **Movement types.** Create one yoga and one run-club test session. Check the "Bring with you" pre-fill, then edit it and check it flows to Manage my booking and a test email.
8. **Email test sends.** Send all 9 (+1b, multi) to kimberley@stretchyyoga.co.nz. Check them in Gmail and Apple Mail, in light and dark mode.
9. **Links.** Every How it works / Cancellation policy link opens in a new tab and lands on the right section.
10. **Strings.** `grep -ri "locked in\|locked & loaded\|minimum viable\|better-er\|card authorisation\|not open yet\|no charge yet\|peeps\|spots to minimum"` across `app components lib` returns nothing customer-facing.

**Done when** Kimberley has approved the Vercel preview (homepage, What's on, a session page before 36 hrs and between 36 and 2 hrs, Manage my booking for 1 and 3 places, HQ form) and the test emails. Then merge and deploy.
