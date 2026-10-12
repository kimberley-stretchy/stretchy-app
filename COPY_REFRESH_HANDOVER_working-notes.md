# Copy refresh handover: booking, timing & emails (Oct 2026)

**Status: DO NOT DEPLOY until Kimberley signs off the mock.** Build on a branch, show her a Vercel preview, then merge.

Mock (visual reference for every change below): https://claude.ai/artifact/Uknogfs1ibRHvNJSxPBXPT
Word list (follow it everywhere): `STRETCHY_WORDS.md` in this folder.

## v2 changes from Kimberley (12 Oct) — these override anything below
- **No timeline bars anywhere** (no horizontal strip on the site, no "you are here" strip in emails). Timing lives in one **Key dates** box per session: "$X max" + the 36 hrs out row + the 2 hrs out row, each with relative time AND real date/time. On the hold page and email 1 this box also holds the "most you'll pay" and the pending-amount line (one box, not three).
- **Drop "36 to go. 2 to pay."** everywhere. How it works heading = "The more who join, the less you pay." Optional subline (Kimberley to confirm): "We confirm 36 hours before. You pay 2 hours before."
- **Charity**: remove the $10 / Cancer Support sentence from How it works (home + HowToStretchy). Keep it ONLY on the homepage Cancer Support NZ band. No charity lines in emails or session pages.
- **"Also coming up" card**: dashed border, text, chips and button all in ink at 75% (`rgba(20,17,15,.75)` / `text-ink/75`, `border-ink/75`) — not the faint ink/30–60 used now.
- **Links**: every "How it works", "Cancellation policy" and "FAQ" link on the site and in emails opens in a new tab: `target="_blank" rel="noopener noreferrer"` + a small ↗. Booking, manage and share links stay in the same tab.
- **Dates are always per session**: calculate from `starts_at` via `lib/sessionTimes.ts`, NZ time (DST-safe). Never hard-code a date. Use "tonight"/"tomorrow" only when true.
- **Brand**: site mocks use BN Chubb / Space Grotesk / JetBrains Mono (existing). Emails keep the current `lib/stretchy-email.ts` look (system font, 900 h1, mono labels, outlined boxes, pill buttons, highlight block + footer).

## v4 decisions from Kimberley (12 Oct) — these override sections 1 and 3 where they differ
Mock v4 is the reference: https://claude.ai/artifact/Uknogfs1ibRHvNJSxPBXPT

**How it works (homepage blue band):** keep the existing layout + PriceSimulator. 4 cards → 5 (Now / 36 hrs out / 36 → 2 hrs out / 2 hrs out / On the day). The slider moves to card 3 ("Still room to join"), labels "14 · goes ahead" / "30 · full", "PEEPS" → "people". Intro paragraph is **bold**: "Every Stretchy needs a certain number of people to go ahead. Once we've got them, it's on, and everyone who joins after makes it cheaper for the whole room. (Yes, people-powered pricing.)" Remove the charity part of the 🌏🧘🙏 line; keep the fair-pay part.

**What's on next card (`WhatsOnNext.tsx`):** keep the live card design (photo, date tile, title, Movement/Social rows, price + button, dots). Changes only:
- Top-right pill and the label above the dots: "10 MORE TO GO AHEAD" (replaces "10 SPOTS TO GO AHEAD" / "10 SPOTS TO MINIMUM"). Once the minimum is reached: "GOING AHEAD ✓ · STILL ROOM TO JOIN".
- Dashed vertical line after the last minimum pip (after pip 14) in `CapacityPips` — add an optional `showMinLine` prop, used everywhere the pips appear.
- Time/duration/level line (e.g. "6:15 AM–7:15 AM · 60 MIN · ALL LEVELS") 25% larger and ink at 75%.
- Price caption: "max per person · incl. GST". Button: "Hold my place".
- Under the dots keep "$22.82" left / "$10.65" right.

**Shared visual language (v6):** one 2px ink outline box (cream fill, 22px radius, like the homepage card). Inside or outside it, info is shown as homepage-style rows: a coloured mono label on the left (WHEN purple, WHERE/PARKING/BRING ink, MOVEMENT hot blue #0000FF, GEM olive, SOCIAL orange), then emoji + bold value + a grey second line, separated by 2px sand (#E1D5C6) rules.

**Session page (`app/sessions/[id]/page.tsx`) — v8, APPROVED. Top to bottom:**
1. Title (BN Chubb). Between 36h and 2h a "Going ahead ✓" chip sits above it.
2. Rows on the background, no emojis, bold value + grey second line aligned: WHEN (purple) date / time · duration · level; WHERE (ink) venue / suburb; MOVEMENT (#0000FF) style / with teacher; SOCIAL (orange) venue · type / "From 7:15am · pay your own way". **No GEM row on this page.**
3. 2px ink outline box (cream) around the price block = homepage card: "$22.82" + "max per person · incl. GST"; "10 MORE TO GO AHEAD" / "30 MAX" (36h→2h: "17 IN · STILL ROOM TO JOIN"); round pips + dashed min line; "$22.82" / "$10.65".
4. "Hold my place" full-width button directly under the box (not sticky).
5. Timing rows, same row style, with **everything in grey (ink 60%): the mono labels AND both value lines**:
   - UP TO 36 HRS OUT — "Free to cancel" / "Then it's going ahead or called off. Not enough people? You pay nothing."
   - 36 → 2 HRS OUT — "Still room to join" / "More people can join and the price keeps dropping. No free cancelling from here."
   - 2 HRS OUT — "Final price charged" / "Never more than $X."
   Between 36h and 2h: "Going ahead ✓ / Free cancelling has closed." · "Still room to join, right now / Join now and you're in straight away. The price keeps dropping." · "Final price charged / Joining closes. Never more than $X."
6. How it works ↗ · Cancellation policy ↗ (new tab), also in grey.

**Manage my booking (`app/hold/[id]/page.tsx`) — v8, M3:**
1. Big BN Chubb headline only: "Your place is held." (no tick, no sub-copy).
2. Outline box: date in BN Chubb ("Fri 23 Oct"), then bold "{start}–{end} | {suburb}" (e.g. "6:15–7:15am | Herne Bay", time first, not "Morning"), then the venue on its own grey line ("Bayfield Primary School Hall"), then "HOW IT GOES" rows (mono time label left, bold + grey right), all times calculated from the session start (works for evenings):
   - BRING WITH YOU — "Your mat & water" / "Plus any props you like, and $$ for coffee after."
   - start − 10 min — "Park on {getting_there}" / venue address + parking notes
   - start − 5 min — "Say kia ora" / "Meet your teacher, {teacher}, and your GEM ({gem})." (GEM part only if assigned)
   - start — "{style}, {level}" / "{duration} minutes. Go at your own pace."
   - end — "Social Stretch at {venue}" / "Coffee and chats. Pay your own way."
   - PRICE NOW — "$X max per person" / "N more to go ahead. Drops to $Y if all {max} fill." + small pips with min line (after 36h: "N in · still room to join").
3. Full-width "Share with a mate" (filled) and full-width "Cancel my hold" (same size, transparent, 2px DASHED ink outline). No "Can't make it?" block, no timing rows here. After 36h the cancel button is hidden.
4. How it works ↗ · Cancellation policy ↗ in grey.

**Emails:** where an email shows a "Key dates" box, use the same ✋ / 💳 rows and wording as the session page.

## v16 (12 Oct): "Bring with you" is filled in per session in Stretchy HQ

Kimberley decided: HQ fills this in for every session. Build it the same way `getting_there` already works.

1. **Database:** new migration in `lib/supabase/migrations/` (e.g. `2026-10-12_bring_with_you.sql`) adding to `sessions`:
   - `bring_title text` (the bold line, e.g. "Your mat & water")
   - `bring_note text` (the grey line, e.g. "Plus any props you like, and $$ for coffee after.")
   Both nullable. Show Kimberley the SQL and wait for her OK before running it on the live database.
2. **HQ form (`app/admin/sessions/new/page.tsx`, also used for edit):** add a "Bring with you" section next to "Getting there", with two inputs (bold line + note).
   - **Pre-fill by movement type** when creating a session so HQ rarely has to type. Yoga/Pilates → "Your mat & water" / "Plus any props you like, and $$ for coffee after." Run club → "Running shoes & water" / "And $$ for coffee after." Other → "Comfy clothes & water" / "And $$ for the Social Stretch after." HQ can overwrite.
   - When copying or duplicating a session, carry the values across.
3. **API (`app/api/admin/sessions/route.ts`):** accept, save and return `bring_title` / `bring_note` alongside `getting_there` (create + update + select lists).
4. **Where it shows:**
   - Manage my booking "How it goes" → BRING WITH YOU row.
   - Email `dayBox` (emails 1, 1b, 4, 6, 9) → BRING WITH YOU row, via `lib/sessionEmailContext.ts` (add `bringTitle` / `bringNote` next to `directions`).
   - When someone holds more than one place, show the HQ bold line as written and start the grey line with "For all {n} of you. " (e.g. "Your mat & water" / "For all 3 of you. Plus any props you like…"). Update the multi-place mock wording ("Mats & water for all 3 of you") to this rule.
   - If both fields are empty, hide the row (never "TBC").
5. **Test:** create one yoga and one run-club test session in HQ, check the pre-fill, edit the text, then check Manage my booking and a test "Place held" email show the edited text.

## v15 (12 Oct) — more than one place + everything dynamic. Override everything below where they differ.

### Holding more than one place (quantity = `my_hold_quantity` / `spots`)
Every page and email must read the number of places held (n):
- n = 1: "Your place is held." · "your place" · "Your mat & water" · "$X max per person" · "Cancel my hold".
- n > 1: "Your {n} places are held." · "your {n} places" · "Mats & water for all {n} of you" · price row bold "$X×n max for your {n} places" then grey "$X max per person. …" · button "Change or cancel places" (opens the existing quantity picker in `app/hold/[id]/page.tsx`) · intros say "you and your crew".
- Final price email with n > 1: big number = total charged, small line "charged now for {n} places · $X each · incl. GST". Subject "Your final price: ${total} for {n} — {title}".
- Dots: the person's own places get a thin ink outline (`mine` = n) so they can see themselves in the room.
- Comp holds with n > 1: "We've held you {n} places — on us 💛".
- Price maths always server-side (`lib/pricing.ts`); never multiply in the browser for anything that's charged.

### Everything dynamic (nothing hard-coded)
Pull every value from the session / venue / people records at render or send time. Mock example → source:
- "Herne Bay | Morning" → session title · "Fri 23 Oct" → NZ date of `starts_at` · "6:15–7:15am" → `starts_at` to `starts_at + duration_mins` (NZ time, am/pm).
- "Bayfield Primary School Hall" → `location_name` · "Herne Bay" → suburb · address + parking line → `getting_there` (skip the PARK row if empty; label "Getting there" when it isn't about parking).
- How it goes times: Park = start − 10 min, Say kia ora = start − 5 min, class = start, Social Stretch = end time (or the session's social stretch time if set).
- "Vinyasa yoga, all levels" → style + movement type + level · "60 minutes" → `duration_mins` · teacher → `teacherName` · GEM → `gemName` (drop the GEM part of the sentence if none).
- "Honey Sundays · café" → `social_stretch_venue` + type · "Coffee and chats" stays generic. Skip the Social row if no social stretch.
- BRING WITH YOU → HQ fields `bring_title` / `bring_note` (see v16).
- 14 / 30 → `min_attendees` / `max_attendees` · "10 more" → min − held · "17 in" → held · $22.82 → current max price · $10.65 → floor price · $17.75 → final price. "If we get {min} people, we're on."
- "this morning" / "today" / "tonight" → from the start hour (before 12 = this morning, 12–17 = today, after 17 = tonight).
- Never show a row with an empty value or "TBC". Hide it.

### Share
"Share with a mate" (Manage page + emails) opens the existing share options from the live hold page: copy invite link (with live price), Text, Email, Facebook, Instagram, TikTok. Keep that panel; it just sits behind the one button now.

### Bug to check on the live hold page
Kimberley saw "HOLDING 0 SPOTS" on `/hold/[id]`. `my_hold_quantity` comes back 0 when the signed-in person has no active hold (e.g. viewing as HQ, or the hold was cancelled), and the page shows it instead of `?? 1`. Fix: if quantity is 0, redirect to `/sessions/[id]` (or show "You're not holding a place for this one" + Hold my place). Also confirm a real holder never sees 0 (check the `holds` lookup by `user_id`).

## v14 tweaks (12 Oct) — override everything below where they differ
- Manage my booking (yellow page): all divider lines inside the box are ink/black (not sand). Filled buttons on yellow use yellow text.
- So close email (2): grey rows are UP TO 36 HRS OUT (Free to cancel / If we get {min} people, we're on…) AND 2 HRS OUT (Final price charged / Never more than $X).
- Filled (reversed) buttons in every email: button text is the email's background colour, not black/white. Blue email → black button, sky text. Purple → white button, purple text. Olive → white button, olive text. Orange → black button, orange text. Cream → black button, cream text. Outline buttons unchanged.

## v13 tweaks (12 Oct) — override everything below where they differ
- "UP TO 36 HRS OUT" row everywhere (session page + emails): **Free to cancel** / "If we get {min} people, we're on. Not enough people? You pay nothing." ({min} = session minimum.)
- Manage my booking: whole page background yellow (#FCBB16, the `yellow` token); the outline box is also yellow inside.
- It's going ahead email (4): after Manage my booking, show the price block (current max price, "{held} in · still room to join", dots, end prices) and then the same grey rows as other emails: 36 → 2 HRS OUT "Still room to join / More people can join and the price keeps dropping. No free cancelling from here." and 2 HRS OUT "Final price charged / Never more than $X." Then Share with a mate. (This replaces the earlier "no price in this email" rule.)
- ALL emails: any box showing a price is REVERSED: filled with the email's text colour and text/lines/dots in the email's background colour. Blue email → black box, sky text. Purple → white box, purple text. Olive → white box, olive text. Orange → black box, orange text. Cream → black box, cream text. Boxes without a price stay outlined.

## v12 tweaks (12 Oct) — override everything below where they differ
- Date + time on ONE line everywhere (Manage my booking + email boxes): "Fri 23 Oct | 6:15–7:15am", then "Bayfield Primary School Hall | Herne Bay" in grey.
- Email sign-off NOT bold: "See you there,<br>The Stretchy team".
- Place held intro: "**We look forward to seeing you at Stretchy.** We haven't hit the minimum number of people yet, so your place is held and **we'll confirm 36 hours out**. Nothing's charged yet." (no date).
- Emails do NOT repeat real dates/times for the 36 hr / 2 hr moments. Timing rows read "Free to cancel" / "Still room to join" / "Final price charged". Intros say "before 36 hours out", "up to 2 hours before", "we'll email you 36 hours out either way".
- It's going ahead (4) order: intro + sign-off → dayBox (run-through) → Manage my booking (outline) → room box ("14 in · still room to join", dots, "**The price can keep dropping.** More people can join right up to 2 hours before, and every one drops the price for everyone." + "No cancelling from here. Free cancelling has now closed and your place is confirmed.") → Share with a mate (filled).
- Final price (6): intro paragraph bold. Price box REVERSED: black (#14110F) fill with orange text, label and dots. Remove the "You saved $X" line entirely (trial dropped).
- A place on us (9): remove Share button; use the full dayBox run-through with a "YOUR PLACE · On us · N more to go ahead" row + dots; then "Set up my account".
- Run-through (dayBox) appears in: 1, 1b, 4, 6, 9.

## v11 tweaks (12 Oct) — override v8/v10 where they differ
- Manage my booking box header: "Fri 23 Oct" and "6:15–7:15am" on separate lines, SAME style and size (bold 15px body font, not BN Chubb), then "Bayfield Primary School Hall | Herne Bay" in grey. Same header in the email `dayBox`.
- Emails: every email opens "Hey {name}," on its own line, then a warm short intro (copy in mock v11), then sign-off "See you there,<br>**The Stretchy team**". Place held intro must say the minimum isn't met yet, the place is held, and we confirm 36 hrs out ({goNoGo}).
- Remove "Every mate who joins drops the price for everyone. 🙌" from ALL emails (the intro carries the share message).
- "Manage my booking" (outline) sits directly under "Share with a mate" (filled) in every email that has both.
- The full "How it goes" run-through (`dayBox`) ONLY in: Place held (1 and 1b), It's going ahead (4), Final price (6). All others drop it; the comp email (9) uses a short date/time/venue box with the dots instead.

## v10 emails (12 Oct) — overrides section 5 where they differ
Mock v10 "Emails" section is the reference. Keep the current `lib/stretchy-email.ts` look (one brand colour per email, big 900-weight headline, outlined boxes, pill buttons, highlight block + footer). NO timeline strip, NO emojis in rows.
Shared building blocks (table-based HTML for mail clients):
- `dayBox(session, extraRows?, showDots?)`: outlined box. Date in BN Chubb-style caps ("FRI 23 OCT"), bold "{start}–{end} | {suburb}", venue on its own line (75% opacity), "HOW IT GOES" label, then rows (mono label left, bold + 75% second line right): Bring with you · {start−10} Park… · {start−5} Say kia ora (teacher first, then GEM if assigned) · {start} style · {end} Social Stretch. Optional extra row (e.g. PRICE NOW) + dots.
- `peopleDots(held, min, max)`: LIVE at send time. One cell per place up to max; filled (current text colour) = held, shaded (45%) = still needed to reach min, outline (35%) = room to full; dashed vertical line after the min. Use a table of cells with border-radius (Outlook shows squares — acceptable).
- `priceBlock(price, label, held)`: outlined box, big mono price + "max per person · incl. GST", label row "{label}" / "{max} MAX", dots, end prices.
- `greyRows(rows)`: the session-page timing rows at 75% opacity, WITH real dates in emails (e.g. "Free to cancel until Wed 21 Oct, 6:15pm").
- Buttons: one filled main action + one outline secondary ("Manage my booking"). "Every mate who joins drops the price for everyone. 🙌" (bold, centred) under every Share button.
- Footer links: ONLY "How it works ↗" and "Cancellation policy ↗" (new tab). Remove "Manage my booking" and "FAQ" from the link row.
Per email (copy in mock): 1 Place held (dayBox + PRICE NOW + dots, Share, mate line, greyRows TIMING, Manage) · 1b You're in (late joiner, TIMING_LATE) · 2 So close (priceBlock, Share, grey "Free to cancel until tonight, 6:15pm", Manage) · 3 Could it be you? (priceBlock, Hold my place, greyRows) · 4 It's going ahead (dots only — NO price, NO charge time; Share; dayBox; Manage) · 5 Going ahead + still room (priceBlock, Hold my place, late rows) · 6 Your final price (price charged + "You saved $X because N people came instead of {min}" only if N>min; dots; dayBox; mate line; Manage) · 7 Not this time (dots "{held} of {min} · not this time", pay nothing + pending line) · 8 Hold cancelled · 9 A place on us (dayBox with YOUR PLACE "On us" row + dots, Set up my account, Share).

## The idea we're teaching
Five beats, the same words everywhere:
1. Now: Hold your place. We save your card and show you the most you'll pay.
2. 36 hours out: Go or no-go. Enough people? It's going ahead. Not enough? It's called off and you pay nothing.
3. 36 → 2 hours out: Still room to join. More people can join and the price keeps dropping for everyone.
4. 2 hours out: Final price, paid. We charge your card the final price. The more who joined, the less it is. Never more than you saw.
5. On the day: Move, then the Social Stretch. Coffee after. Pay your own way.

Cancelling (2 lines, used everywhere):
> Free to cancel until 36 hours out (Wed 21 Oct, 6:15pm). After that you're in, and you'll pay the final price.
> If we ever cancel, you don't pay.
Followed by a link: "Our cancellation policy →" to `/terms#cancellation`.

## 0. Shared helper (do first)
Add `lib/sessionTimes.ts` with `getKeyTimes(startsAt)` returning `{ goNoGo: startsAt - 36h, finalPrice: startsAt - 2h }` plus formatters that output NZ time like "Wed 21 Oct, 6:15pm" (use `Pacific/Auckland`, see `lib/nzTime.ts`). Also `getPhase(startsAt, state)` → `before36 | between | after2 | cancelled`. Use it on the site and in every email so dates are never worked out by hand.

## 1. Homepage
- `components/marketing/HowItWorks.tsx`: replace the 4 steps with the 5 beats above. Heading "The more who join, the less you pay." Remove "UP TO 36 HRS OUT", "UP TO 2 HRS OUT", "minimum viable mats", "$22.82 EACH / 14 PEEPS". Replace the cancellation paragraph with the 2-line version + policy link. Delete the charity sentence ("registered charity or social enterprise…") from this section entirely; the Cancer Support NZ band further down the homepage stays.
- `components/marketing/WhatsOnNext.tsx`:
  - Remove the "NOT OPEN YET" / "Places open 36 hours before" / dead "Notify me" block. Replace with an **"Also coming up"** card (dashed border, everything in ink at 75%) showing date, time, title, "$X max · 14 needed" and a normal **Hold my place** button linking to `/sessions/{id}`.
  - Session card price block: "**$22.82 max**" then "drops to $10.65 if it fills · 4 of 14 needed". Once going ahead: "Going ahead ✓ · still room to join".
  - Label under the pips: "Goes ahead at 14 · Full at 30" (replace the unlabelled $22.82 / $10.65 and "10 SPOTS TO MINIMUM").
  - Button text: "Hold my place". Under it, small: "Free to cancel until 36 hrs out (Wed 21 Oct, 6:15pm)".
- `app/page.tsx`: `getUpcomingSessions` currently labels session #3 as "notify". Keep showing 3, just render the third with the new card.
- Hero line "Actually. 👀" is Kimberley's. Leave it.

## 2. Pop-up then cookies (mobile + desktop)
`components/marketing/TestingPopup.tsx` and `components/CookieNotice.tsx`: never show both at once. If the email pop-up is going to show (not yet dismissed in localStorage and we're on a page that renders it), the cookie notice waits. When the pop-up closes (sign-up done, "Maybe later" or ×), dispatch `window.dispatchEvent(new Event("stretchy:popup-closed"))`, and CookieNotice listens for it before showing. On pages without the pop-up, or if it was dismissed before, the cookie notice shows straight away as now.

## 3. What's on + session page
- `components/HowToStretchy.tsx`: same 5 beats + 2-line cancelling + policy link.
- `app/sessions/page.tsx` list: add a "How it works ↗" link (new tab) under "16 sessions coming up". Cards: "4 of 14 needed" / "$22.82 max"; going-ahead sessions get a "Going ahead ✓" chip and "N in · still room to join".
- `app/sessions/[id]/page.tsx`:
  - Add ONE "Key dates" box under the price ladder (see mock). Header: "Never more than $X. N of 14 needed." Rows: "36 hrs out · {goNoGo} — Going ahead, or not. Not enough people? It's called off and you pay nothing. Last chance to cancel free." and "2 hrs out · {finalPrice} — Final price charged. Joining closes." Between 36h and 2h: header "It's going ahead. N people are in. Never more than $X, and still dropping."; the 36h row greyed with "Going ahead ✓ Free cancelling has closed."; plus a yellow note "Joining now? You're in straight away, so there's no free cancelling."
  - Under it: "How it works ↗" and "Cancellation policy ↗" (new tab).
  - Sticky bar: "$X max" + "N more to go ahead" (or "N places left"), button "Hold my place" (remove "— no charge yet"), small line "Free to cancel until {goNoGo}" before 36h, "Joining closes {finalPrice}" after.
- `components/HoldModal.tsx`: button "Hold my place"; replace "NO CHARGE YET · CANCEL ANY TIME UP TO 36H OUT" with "Free to cancel until {goNoGo}" (or the late-joiner line between 36h and 2h).
- `app/hold/[id]/page.tsx`: replace the long paragraph (line ~259) and the price block with ONE Key dates box: "$X max" + "Drops as more people join. N of 14 needed.", the 36 hrs row, and the 2 hrs row which carries "Your bank might show a pending amount before then. That's a hold, not a payment." After 36h, swap the cancel button for "You're in. Cancelling closed {goNoGo}. Something serious come up? Get in touch." + policy link. Cancelled screens: "Nothing was charged. If your bank shows a pending amount, it'll drop off in a few days." (remove "card authorisation").
- `app/onboarding/setup/page.tsx` "HOW YOU'LL PAY": align with the 5 beats, add the pending line, add the "still room to join" line, link the policy.
- `app/notifications/going-ahead` + `cancelled` pages: same words as emails 4 and 7.
- `app/api/holds/route.ts` line ~257 error: "Free cancelling closed 36 hrs out ({goNoGo}). Your place is confirmed and the final price is charged {finalPrice}. Something serious come up? Get in touch."

## 4. Terms + FAQ (policy wording, no policy change)
- `app/terms/page.tsx`: give the "Payment & cancellation" section `id="cancellation"` (this is where every "Cancellation policy" / "Why?" link points).
  - Short version: change "once it's locked in at the 36-hour mark" → "set 2 hours before the session".
  - Bullet 2: "36 hours before: if enough people have joined, it's going ahead and free cancelling ends. The price at that point is the most you'll pay. It can still drop, never rise."
  - New bullet after it: "Between 36 and 2 hours before, more people can still join. If you join in this window, it's already going ahead, so there's no free cancelling."
  - Add to bullet 1: "Your bank may show this as a pending amount for a few days. It's a hold, not a payment."
  - Refund line: make Terms and FAQ say the same thing: "If we cancel, you don't pay. If you've already been charged, we refund you in full, back to the card you paid with."
- `app/faq/page.tsx`: match the above; add a Q "Can I still join after 36 hours?" Answer: "Yes, right up to 2 hours before, as long as there's room. It's already going ahead, so there's no free cancelling once you join."
- Bump "Last updated" date. Clause 5 (no refund after 36h) + Consumer Guarantees Act wording still need a lawyer review. Don't change their meaning.

## 5. Emails (`lib/stretchy-email.ts`)
Add two shared pieces and use them where the mock shows them (NO timeline strip):
- `keyDatesBox(sc, {price, needed, times, phase})`: one outlined box: "Key dates" label, "$X max", short line, then the 36 hrs out and 2 hrs out rows (table-based HTML for mail clients). Used in emails 1 and 1b.
- `handyLinks(sc, variant)`: row at the bottom: Manage my booking (`/hold/{id}`) · How it works (`/#how-it-works`) · Cancellation policy (`/terms#cancellation`) · FAQ (`/faq`). How it works / policy / FAQ get `target="_blank"` and a ↗. Cancelled/not-going-ahead emails: What's on · How it works · FAQ.
- Replace `CANCEL_WINDOW` and `cancellationBlock` with the short version + policy link.

Per email (copy is in the mock):
1. `hold_confirmed` (before 36h): subject "Your place is held — {title}". H1 "Your place is held. 🙌". One Key dates box (price + 36h row + 2h row with the pending line). Remove the separate price box, cancellation block and "better-er".
1b. **NEW** `hold_confirmed_late` (holds made between 36h and 2h): subject "You're in — {title}". Must not mention free cancelling. Send this from `app/api/holds/route.ts` when `hoursUntil <= 36`.
2. `almost_there` holder: "So close 👀"; use the real time ("tonight, 6:15pm") instead of "about 2 hours from now".
3. `almost_there` non-holder: H1 "Could it be you? 👀"; button "Hold my place". No "$0".
4. `session_going_ahead`: subject + H1 "It's going ahead 🎉". **No dollar price and no charge time** (Kimberley's call). Body: more people can still join and drop the price; "Free cancelling has now closed, so your place is confirmed." Keep What to bring / first-Stretchy box.
5. `session_confirmed_open`: H1 "It's going ahead, and there's still room 📉"; you can join until {finalPrice}; button "Hold my place"; line "Heads up: it's already going ahead, so there's no free cancelling once you join." No "$0".
6. `price_locked`: subject "Your final price: $X — {title}". Price box FIRST. **Trial**: "You saved $Y because N people came instead of {min}." where Y = price(min) − final price per place, only if N > min (otherwise skip the line). Remove "locked & loaded" / "You're locked in".
7. `session_cancelled`: "You pay nothing." + pending line.
8. `hold_cancelled`: "Done. Nothing charged. Your place has gone back to the group." + pending line. Remove "card authorisation".
9. `comp_hold_confirmed`: "It still needs 14 people to go ahead. We'll email you on {goNoGo} either way." No strip.
Also align push notification text in `app/api/cron/lock-in/route.ts` (~line 232) and `session-check` to the word list.

## 6. Things to check while you're in there (not copy)
- `app/api/holds/route.ts` POST doesn't appear to block holds after the 2-hour charge or when the session is full (max). Confirm with Kimberley, then add: joining closes at 2h out, and no holds past max.
- Card holds are made with `capture_method: "manual"` at booking, so people see a pending amount, and holds lapse after ~7 days for sessions booked far ahead (the lock-in cron re-charges). The "pending" copy above covers this. Don't promise more than that.

## 7. Done when
- Kimberley has approved a Vercel preview of the homepage, What's on, a session page (before 36h and between 36h–2h), the hold page, and test sends of all 9 emails to her inbox.
- `grep -ri "locked in\|locked & loaded\|minimum viable\|better-er\|card authorisation\|not open yet\|no charge yet"` across `app components lib` returns nothing customer-facing.
