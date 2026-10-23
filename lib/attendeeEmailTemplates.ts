// ─────────────────────────────────────────────────────────────────────────────
// The attendee emails (COPY_REFRESH_HANDOVER.md section 7). Same look as before
// — one brand colour per email, big headline, outlined boxes, pill buttons, the
// "highlight of your week" block and footer (all from lib/stretchy-email.ts) —
// with the website's new pieces inside: the day box with "How it goes", the live
// people dots, the reversed price block and the grey timing rows.
//
// Rules that hold for every email:
//   • "Hey {name}," → a warm intro → "See you there, The Stretchy team".
//   • Links at the bottom are only How it works ↗ and Cancellation policy ↗.
//   • No real dates or times for the 36 hr / 2 hr moments.
//   • Every detail comes from the session; an empty value hides its row.
//   • Words follow STRETCHY_WORDS.md.
// Layout is table-based so mail clients render it reliably.
// ─────────────────────────────────────────────────────────────────────────────

import { page, h1, hey, msg, label, APP_URL, type Scheme, type AttendeeEmailType, type AttendeeEmailPayload } from "@/lib/stretchy-email";
import { sessionTimes, subjectDate } from "@/lib/sessionTimes";
import { calculatePrice, maxPriceToPromise, priceRightNow, priceHasDropped } from "@/lib/pricing";
import { venueLine, meetLine } from "@/lib/sessionDisplay";
import { placeCount, yourPlaces, youOrCrew, bringNote, moreToGoAhead, inAndRoom } from "@/lib/places";

const MONO = "'JetBrains Mono',ui-monospace,Menlo,monospace";
const money = (n: number) => `$${n.toFixed(2)}`;
const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ── Everything a template needs, worked out once from the payload ────────────
function context(p: AttendeeEmailPayload) {
  const n = placeCount(p.spots);
  const min = p.minAttendees ?? 0;
  const max = p.maxAttendees ?? 0;
  // attendeeCount is passed when the live count would be wrong at send time
  // (holds already marked charged or released).
  const held = p.attendeeCount ?? p.held ?? 0;
  const hasNumbers = p.costBase != null && p.revenueTarget != null && min > 0 && max > 0;
  const t = p.startsAt ? sessionTimes({ starts_at: p.startsAt, duration_mins: p.durationMins, state: p.sessionState }) : null;
  const before36 = t ? t.phase === "before36" : true;
  const opening = hasNumbers ? calculatePrice(p.costBase!, p.revenueTarget!, min) : null;
  const floor = hasNumbers ? calculatePrice(p.costBase!, p.revenueTarget!, max) : null;
  // The most this person can pay: at-minimum price before 36 hrs out, current after.
  const maxNow = hasNumbers ? maxPriceToPromise(p.costBase!, p.revenueTarget!, min, held, before36) : null;
  const id = p.sessionId ?? "";
  // The price right now (current headcount, floored at the minimum) — shown
  // next to the cap once more than the minimum are in.
  const rightNow = hasNumbers ? priceRightNow(p.costBase!, p.revenueTarget!, min, held) : null;
  return {
    n, min, max, held, hasNumbers, t, before36, opening, floor, maxNow, rightNow,
    sessionUrl: id ? `${APP_URL}/sessions/${id}` : `${APP_URL}/sessions`,
    manageUrl: id ? `${APP_URL}/hold/${id}` : `${APP_URL}/sessions`,
    shareUrl: id ? `${APP_URL}/hold/${id}?share=1` : `${APP_URL}/sessions`,
  };
}
type Ctx = ReturnType<typeof context>;

// ── Building blocks ──────────────────────────────────────────────────────────

/** "Hey {name}," + intro paragraphs + the team sign-off (not bold). */
function intro(sc: Scheme, p: AttendeeEmailPayload, paragraphs: string[]) {
  return `${hey(sc, esc(p.name))}
    ${paragraphs.map((t) => msg(sc, t)).join("")}
    <p style="color:${sc.text};font-size:15px;line-height:1.55;margin:0 0 22px;">See you there,<br>The Stretchy team</p>`;
}

type Row = { label: string; bold: string; second?: string | null };

/** Rows: mono label left; bold value + a quieter second line right. */
function rows(color: string, list: (Row | null | false | undefined)[], opts: { rule?: string; flat?: boolean } = {}) {
  const shown = list.filter(Boolean) as Row[];
  if (shown.length === 0) return "";
  const rule = opts.rule ?? color;
  // flat: the caller tints the whole block, so the second line isn't dimmed again.
  const secondOpacity = opts.flat ? 1 : 0.75;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
    ${shown.map((r) => `<tr>
      <td valign="top" width="88" style="padding:10px 10px 10px 0;border-top:2px solid ${rule};font-family:${MONO};font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;line-height:1.35;color:${color};">${r.label}</td>
      <td valign="top" style="padding:10px 0;border-top:2px solid ${rule};font-size:14px;line-height:1.4;color:${color};">
        <strong style="display:block;font-size:14px;color:${color};">${r.bold}</strong>
        ${r.second ? `<span style="display:block;font-size:13px;color:${color};opacity:${secondOpacity};">${r.second}</span>` : ""}
      </td>
    </tr>`).join("")}
  </table>`;
}

/**
 * The room, drawn live at send time: filled = held, shaded = still needed to go
 * ahead, outline = room to full, with a dashed line after the minimum.
 * (Outlook on Windows ignores rounded corners and shows squares — that's fine.)
 */
function peopleDots(color: string, held: number, min: number, max: number) {
  if (max <= 0) return "";
  const cells: string[] = [];
  for (let i = 0; i < max; i++) {
    const style = i < held
      ? `background:${color};border:1.5px solid ${color};`
      : i < min
      ? `background:${color};border:1.5px solid ${color};opacity:.45;`
      : `border:1.5px solid ${color};opacity:.35;`;
    cells.push(`<td align="center" style="padding:0;font-size:0;line-height:0;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;${style}"></span></td>`);
    if (i === min - 1 && min < max) {
      cells.push(`<td align="center" width="6" style="padding:0;font-size:0;line-height:0;"><span style="display:inline-block;width:0;height:15px;border-left:2px dashed ${color};"></span></td>`);
    }
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="table-layout:fixed;border-collapse:collapse;margin:8px 0;"><tr>${cells.join("")}</tr></table>`;
}

/** Two short labels at either end of a line (mono, small). */
function ends(color: string, left: string, right: string, strongLeft = false) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>
    <td align="left" style="font-family:${MONO};font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:${color};${strongLeft ? "" : "opacity:.75;"}">${left}</td>
    <td align="right" style="font-family:${MONO};font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:${color};opacity:.75;white-space:nowrap;">${right}</td>
  </tr></table>`;
}

/**
 * The prices under the dots once past the minimum: the at-minimum price left,
 * "CURRENT $21.30" in the middle, the full-room price right. (Email can't
 * place it under the exact dot the way the website does, so it sits centred.)
 * Without a dropped price it's just the two ends.
 */
function endsWithCurrent(color: string, c: Ctx) {
  if (c.opening == null || c.floor == null) return "";
  const dropped = c.rightNow != null && c.held < c.max && priceHasDropped(c.rightNow, c.opening);
  if (!dropped) return ends(color, money(c.opening), money(c.floor));
  const cell = (align: string, text: string, strong = false) =>
    `<td align="${align}" style="font-family:${MONO};font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:${color};${strong ? "" : "opacity:.75;"}white-space:nowrap;">${text}</td>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>
    ${cell("left", money(c.opening))}${cell("center", `Current ${money(c.rightNow!)}`, true)}${cell("right", money(c.floor))}
  </tr></table>`;
}

/** Outlined box (no price in it). */
function outlineBox(sc: Scheme, inner: string) {
  return `<div style="border:2px solid ${sc.text};border-radius:16px;padding:16px;margin:0 0 16px;">${inner}</div>`;
}

/**
 * Any box showing a price is REVERSED: filled with the email's text colour, with
 * its own text, lines and dots in the email's background colour.
 */
function priceBlock(sc: Scheme, o: { big: string; caption: string; leftLabel: string; c: Ctx; endPrices?: boolean }) {
  const fg = sc.bg;
  const { c } = o;
  return `<div style="background:${sc.text};border-radius:16px;padding:16px;margin:0 0 16px;">
    <p style="font-family:${MONO};font-size:38px;font-weight:800;line-height:1;color:${fg};margin:0;">${o.big}</p>
    <p style="font-size:13px;color:${fg};opacity:.8;margin:5px 0 12px;">${o.caption}</p>
    ${c.max > 0 ? ends(fg, o.leftLabel, `${c.max} max`, true) : ""}
    ${peopleDots(fg, c.held, c.min, c.max)}
    ${o.endPrices ? endsWithCurrent(fg, c) : ""}
  </div>`;
}

/**
 * The session-page timing rows, with no dates. The whole block is one 50% tint
 * — labels, both lines of text, every dividing line including the last, and the
 * two links below it — on every colour (black text and white text alike).
 */
const TINT = 0.5;
function greyRows(sc: Scheme, list: (Row | null | false | undefined)[]) {
  const html = rows(sc.text, list, { flat: true });
  return html ? `<div style="margin:0 0 16px;border-bottom:2px solid ${sc.text};opacity:${TINT};">${html}</div>` : "";
}

/** Filled main button: the email's text colour, with text in its background colour. */
function filledButton(sc: Scheme, href: string, text: string) {
  return `<a href="${href}" style="display:block;text-align:center;background:${sc.text};color:${sc.bg} !important;-webkit-text-fill-color:${sc.bg} !important;text-decoration:none;font-size:15px;font-weight:800;padding:15px 24px;border-radius:999px;margin:0 0 10px;"><span style="color:${sc.bg} !important;-webkit-text-fill-color:${sc.bg} !important;text-decoration:none;">${text}</span></a>`;
}
function outlineButton(sc: Scheme, href: string, text: string) {
  return `<a href="${href}" style="display:block;text-align:center;background:transparent;border:2px solid ${sc.text};color:${sc.text} !important;-webkit-text-fill-color:${sc.text} !important;text-decoration:none;font-size:15px;font-weight:800;padding:13px 24px;border-radius:999px;margin:0 0 16px;"><span style="color:${sc.text} !important;-webkit-text-fill-color:${sc.text} !important;text-decoration:none;">${text}</span></a>`;
}

/** The only links at the bottom of every email. */
function links(sc: Scheme) {
  const a = (href: string, text: string) =>
    `<a href="${href}" target="_blank" rel="noopener noreferrer" style="color:${sc.text};font-weight:700;text-decoration:underline;">${text} ↗</a>`;
  // Same tint as the timing rows above them.
  return `<p style="font-size:13px;color:${sc.text};margin:6px 0 4px;opacity:${TINT};">${a(`${APP_URL}/#how-it-works`, "How it works")} &nbsp;&nbsp; ${a(`${APP_URL}/terms#cancellation`, "Cancellation policy")}</p>`;
}

/**
 * The day, in one outlined box: date | time, venue | suburb, then "How it goes".
 * Used only in emails 1, 1b, 1c, 4, 6, 6b and 9.
 */
function dayBox(sc: Scheme, p: AttendeeEmailPayload, c: Ctx, extra?: { row: Row; dots?: boolean }) {
  const t = c.t;
  const venue = venueLine({ location_name: p.venue, location_address: p.locationAddress, title: p.sessionTitle });
  const bringTitle = (p.bringTitle ?? "").trim();
  const hasBring = !!bringTitle || !!(p.bringNote ?? "").trim();
  const bringSecond = hasBring ? bringNote(p.bringNote, c.n) : null;
  const where = [p.locationAddress, p.directions].map((v) => (v ?? "").trim()).filter(Boolean).join(". ").replace(/\.\./g, ".");
  const meet = meetLine(p.teacherName, p.gemName);
  const classTitle = [p.styleLine ?? p.teacherStyle, p.level].filter(Boolean).join(", ");
  const social = (p.socialStretchVenue ?? "").split("·")[0].trim();

  const list: (Row | null | false | undefined)[] = [
    hasBring && { label: "Bring with you", bold: esc(bringTitle || "For the day"), second: bringSecond ? esc(bringSecond) : null },
    t && (p.venue || where) && { label: t.parkTime, bold: `Arrive at ${esc(p.venue ?? "the venue")}`, second: where ? esc(where) : null },
    t && meet && { label: t.arriveTime, bold: "Say kia ora", second: esc(meet) },
    t && classTitle && { label: t.startTime, bold: esc(classTitle), second: `${p.durationMins || 60} minutes. Go at your own pace.` },
    t && social && { label: t.endTime, bold: `Social Stretch at ${esc(social)}`, second: "Coffee and chats. Pay your own way." },
    extra?.row,
  ];

  return outlineBox(sc, `
    <p style="font-size:15px;font-weight:800;color:${sc.text};margin:0;">${t ? t.dayAndRange : esc(p.date)}</p>
    ${venue ? `<p style="font-size:13px;color:${sc.text};opacity:.75;margin:2px 0 12px;">${esc(venue)}</p>` : `<div style="height:12px;"></div>`}
    ${label(sc, "How it goes")}
    ${rows(sc.text, list)}
    ${extra?.dots ? peopleDots(sc.text, c.held, c.min, c.max) : ""}
    ${extra?.dots && c.rightNow != null && c.opening != null && priceHasDropped(c.rightNow, c.opening) ? endsWithCurrent(sc.text, c) : ""}
  `);
}

// The "price now" row + the grey timing rows, in the session page's words.
function priceNowRow(c: Ctx): Row | null {
  if (c.maxNow == null) return null;
  const totalCents = Math.round(c.maxNow * 100) * c.n;
  const room = c.before36 ? moreToGoAhead(c.held, c.min) ?? inAndRoom(c.held) : inAndRoom(c.held);
  const drop = c.floor != null && c.held < c.max ? ` Drops to ${money(c.floor)}${c.n > 1 ? " each" : ""} if all ${c.max} fill.` : "";
  if (c.rightNow != null && priceHasDropped(c.rightNow, c.maxNow)) {
    return c.n === 1
      ? { label: "Price now", bold: `${money(c.maxNow)} max per person`, second: `Current ${money(c.rightNow)}. ${room}.${drop}` }
      : { label: "Price now", bold: `${money(totalCents / 100)} max for your ${c.n} places`, second: `${money(c.maxNow)} max per person, current ${money(c.rightNow)} each. ${room}.${drop}` };
  }
  return c.n === 1
    ? { label: "Price now", bold: `${money(c.maxNow)} max per person`, second: `${room}.${drop}` }
    : { label: "Price now", bold: `${money(totalCents / 100)} max for your ${c.n} places`, second: `${money(c.maxNow)} max per person. ${room}.${drop}` };
}
const ROW_FREE = (c: Ctx): Row => ({ label: "Up to 36 hrs out", bold: "Free to cancel", second: `If we get ${c.min} people, we’re on. Not enough people? You pay nothing.` });
const ROW_ROOM: Row = { label: "36 → 2 hrs out", bold: "Still room to join", second: "More people can join and the price keeps dropping. No free cancelling from here." };
const ROW_FINAL = (c: Ctx, tail = ""): Row => ({ label: "2 hrs out", bold: "Final price charged", second: `${c.opening != null ? `Never more than ${money(c.before36 ? c.opening : c.maxNow ?? c.opening)}.` : "Never more than the max price shown."}${tail}` });
const ROW_ROOM_NOW: Row = { label: "36 → 2 hrs out", bold: "Still room to join, right now", second: "Join now and you’re in straight away. The price keeps dropping." };
const ROW_FINAL_LATE = (c: Ctx): Row => ({ label: "2 hrs out", bold: "Final price charged", second: `Joining closes.${c.maxNow != null ? ` Never more than ${money(c.maxNow)}.` : ""}` });
// Option C: nothing is held when you book; the hold goes on at 36 hrs out.
const PENDING = " Nothing is held on your card until it’s going ahead.";

// ── The emails ───────────────────────────────────────────────────────────────

// 1 / 1b / 1c — Place held (and "You're in" for someone joining inside 36 hrs)
function placeHeld(p: AttendeeEmailPayload, c: Ctx) {
  const late = !c.before36;
  const places = yourPlaces(c.n);
  const headline = late ? "You’re in. 🙌" : c.n === 1 ? "Your place is held. 🙌" : `Your ${c.n} places are held. 🙌`;
  const subject = subjectDate(p.startsAt) + (late ? `You’re in — ${p.sessionTitle}` : c.n === 1 ? `Your place is held — ${p.sessionTitle}` : `Your ${c.n} places are held — ${p.sessionTitle}`);
  const html = page("blue", (sc) => `
    ${h1(sc, headline)}
    ${intro(sc, p, late
      ? [`<strong>We look forward to seeing ${youOrCrew(c.n)} at Stretchy.</strong> This one’s already going ahead, so you’re in straight away. Here’s all the deets you need to know, and the more people who join, the better it gets for all.`]
      : [
          c.min > 0 && c.held >= c.min
            ? `<strong>We look forward to seeing ${youOrCrew(c.n)} at Stretchy.</strong> We’ve hit the minimum of ${c.min} people, so it’s on track to go ahead. ${places.charAt(0).toUpperCase() + places.slice(1)} ${c.n === 1 ? "is" : "are"} held and <strong>we’ll confirm 36 hours out</strong>. Nothing’s charged yet.`
            : `<strong>We look forward to seeing ${youOrCrew(c.n)} at Stretchy.</strong> We haven’t hit the minimum number of people yet, so ${places} ${c.n === 1 ? "is" : "are"} held and <strong>we’ll confirm 36 hours out</strong>. Nothing’s charged yet.`,
          "Here’s all the deets you need to know. And don’t forget, the more people who move together, the better it gets for all. So share Stretchy around!",
        ])}
    ${dayBox(sc, p, c, priceNowRow(c) ? { row: priceNowRow(c)!, dots: true } : undefined)}
    ${filledButton(sc, c.shareUrl, "Share with a mate")}
    ${outlineButton(sc, c.manageUrl, "Manage my booking")}
    ${greyRows(sc, late
      ? [{ label: "Up to 36 hrs out", bold: "Going ahead ✓", second: "Free cancelling has closed." }, ROW_ROOM_NOW, ROW_FINAL_LATE(c)]
      : [ROW_FREE(c), ROW_ROOM, ROW_FINAL(c, PENDING)])}
    ${links(sc)}
  `);
  return { subject, html };
}

// 2 — So close (people holding) · 3 — Could it be you? (people who tapped ♡)
function soClose(p: AttendeeEmailPayload, c: Ctx) {
  const needed = Math.max(p.needed ?? (c.min - c.held), 1);
  const people = `${needed} more ${needed === 1 ? "person" : "people"}`;
  const subject = `${needed} more and ${p.sessionTitle} is on 👀`;
  const price = c.maxNow != null
    ? (sc: Scheme) => priceBlock(sc, { big: money(c.maxNow!), caption: "max per person · incl. GST", leftLabel: `${needed} more to go ahead`, c, endPrices: true })
    : () => "";
  if (p.isHolder) {
    const html = page("purple", (sc) => `
      ${h1(sc, "So close. 👀")}
      ${intro(sc, p, [`We need <strong>${people}</strong> before <strong>36 hours out</strong> for this one to go ahead. Know someone who’d love it? Now’s the time to send it their way.${p.isComp ? " Your place is on us, so there’s nothing to pay." : ""}`])}
      ${price(sc)}
      ${filledButton(sc, c.shareUrl, "Share with a mate")}
      ${outlineButton(sc, c.manageUrl, "Manage my booking")}
      ${p.isComp ? "" : greyRows(sc, [ROW_FREE(c), ROW_FINAL(c)])}
      ${links(sc)}
    `);
    return { subject, html };
  }
  const html = page("purple", (sc) => `
    ${h1(sc, "Could it be you? 👀")}
    ${intro(sc, p, [`We need <strong>${people}</strong> before <strong>36 hours out</strong> for ${esc(p.sessionTitle)} to go ahead. Fancy it? We’d love to see you there.`])}
    ${price(sc)}
    ${filledButton(sc, c.sessionUrl, "Hold my place")}
    <div style="height:6px;"></div>
    ${greyRows(sc, [ROW_FREE(c), ROW_ROOM, ROW_FINAL(c)])}
    ${links(sc)}
  `);
  return { subject, html };
}

// 4 — It's going ahead (36 hrs out, to people holding)
function goingAhead(p: AttendeeEmailPayload, c: Ctx) {
  const places = c.n === 1 ? "your place is" : `your ${c.n} places are`;
  const hitMin = c.min > 0 && c.held >= c.min;
  const html = page("olive", (sc) => `
    ${h1(sc, "It’s going ahead. 🎉")}
    ${intro(sc, p, [`${hitMin ? `We hit ${c.min}, so it’s` : "It’s"} going ahead and ${places} confirmed.${p.isComp ? " It’s on us, so there’s nothing to pay." : ""} Here’s all the deets for the day.`])}
    ${dayBox(sc, p, c)}
    ${outlineButton(sc, c.manageUrl, "Manage my booking")}
    ${!p.isComp && c.maxNow != null ? priceBlock(sc, { big: money(c.maxNow), caption: "max per person · incl. GST", leftLabel: inAndRoom(c.held), c, endPrices: true }) : ""}
    ${p.isComp ? "" : greyRows(sc, [ROW_ROOM, { label: "2 hrs out", bold: "Final price charged", second: c.maxNow != null ? `Never more than ${money(c.maxNow)}.` : null }])}
    ${filledButton(sc, c.shareUrl, "Share with a mate")}
    ${links(sc)}
  `);
  return { subject: `${subjectDate(p.startsAt)}It’s going ahead 🎉 ${p.sessionTitle}`, html };
}

// 5 — Still room (after 36 hrs, to people who tapped ♡)
function stillRoom(p: AttendeeEmailPayload, c: Ctx) {
  const hitMin = c.min > 0 && c.held >= c.min;
  const html = page("orange", (sc) => `
    ${h1(sc, "It’s going ahead, and there’s still room. 📉")}
    ${intro(sc, p, [`${esc(p.sessionTitle)} ${hitMin ? `hit ${c.min}, so it’s` : "is"} going ahead. There’s still room, and you can join up to <strong>2 hours before</strong>. Come move with us.`])}
    ${c.maxNow != null ? priceBlock(sc, { big: money(c.maxNow), caption: "max per person · incl. GST", leftLabel: inAndRoom(c.held), c, endPrices: true }) : ""}
    ${filledButton(sc, c.sessionUrl, "Hold my place")}
    <div style="height:6px;"></div>
    ${greyRows(sc, [ROW_ROOM_NOW, ROW_FINAL_LATE(c)])}
    ${links(sc)}
  `);
  return { subject: `${subjectDate(p.startsAt)}It’s going ahead — ${p.sessionTitle}. Still room 🎉`, html };
}

// 6 / 6b — Your final price (2 hrs out)
function finalPrice(p: AttendeeEmailPayload, c: Ctx) {
  // The exact amount charged comes from the lock-in job; the fallback is the
  // same sum it does (final price at the headcount, never under the minimum).
  const eachCents = p.unitPriceCents ?? (c.hasNumbers ? Math.round(calculatePrice(p.costBase!, p.revenueTarget!, Math.max(c.held, c.min)) * 100) : null);
  const each = eachCents != null ? money(eachCents / 100) : (p.price ?? "");
  const total = eachCents != null ? money((eachCents * c.n) / 100) : (p.totalPrice ?? each);
  const dayWord = c.t?.dayWord ?? "today";
  const crew = c.n === 1 ? "" : " and your crew";
  const subject = p.isComp
    ? `See you shortly — ${p.sessionTitle}`
    : c.n === 1 ? `Your final price: ${each} — ${p.sessionTitle}` : `Your final price: ${total} for ${c.n} — ${p.sessionTitle}`;
  const html = page("orange", (sc) => `
    ${h1(sc, p.isComp ? "See you shortly. 🕺" : "Your final price. 🕺")}
    ${intro(sc, p, [`<strong>See you${crew} shortly! ${c.held} of us are moving together ${dayWord}${p.isComp ? ". Your place is on us, so there’s nothing to pay." : ", so the price dropped for everyone."} Here’s everything you need for today.</strong>`])}
    ${priceBlock(sc, {
      big: p.isComp ? "On us" : (c.n === 1 ? each : total),
      caption: p.isComp ? "nothing to pay" : c.n === 1 ? "charged now · incl. GST" : `charged now for ${c.n} places · ${each} each · incl. GST`,
      leftLabel: `${c.held} in`,
      c,
    })}
    ${dayBox(sc, p, c)}
    ${outlineButton(sc, c.manageUrl, "Manage my booking")}
    ${links(sc)}
  `);
  return { subject, html };
}

// 7 — Not this time (36 hrs out, called off)
function notThisTime(p: AttendeeEmailPayload, c: Ctx) {
  const why = p.calledOffByHQ
    ? `Sorry, we’ve had to call ${esc(p.sessionTitle)} off.`
    : `${esc(p.sessionTitle)} didn’t reach ${c.min > 0 ? `${c.min} people` : "its minimum"}, so it’s not going ahead this time.`;
  const html = page("cream", (sc) => `
    ${h1(sc, "Not this time. 💛")}
    ${intro(sc, p, [
      `${why} <strong>You pay nothing.</strong> If your bank shows a pending amount, it’ll drop off in a few days.`,
      "We’d love to see you at the next one.",
    ])}
    ${c.max > 0 && !p.calledOffByHQ ? outlineBox(sc, `${ends(sc.text, `${c.held} of ${c.min} · not this time`, `${c.max} max`, true)}${peopleDots(sc.text, c.held, c.min, c.max)}`) : ""}
    ${filledButton(sc, `${APP_URL}/sessions`, "See what’s next")}
    ${links(sc)}
  `, { highlight: false });
  return { subject: `Not this time — ${p.sessionTitle}`, html };
}

// 8 — Hold cancelled (by the person), or some places cancelled
function holdCancelled(p: AttendeeEmailPayload) {
  const remaining = p.remainingSpots ?? 0;
  const partial = remaining > 0;
  const cancelled = p.cancelledSpots ?? 1;
  const html = page("cream", (sc) => `
    ${h1(sc, partial ? "Booking updated. 👋" : "Hold cancelled. 👋")}
    ${intro(sc, p, [partial
      ? `Done. ${cancelled === 1 ? "1 place" : `${cancelled} places`} cancelled and nothing charged. You still have ${remaining === 1 ? "1 place" : `${remaining} places`} held for ${esc(p.sessionTitle)}.`
      : "Done. Nothing charged, and your place has gone back to the group. If your bank shows a pending amount, it’ll drop off in a few days. Hope to see you at another Stretchy soon."])}
    ${partial && p.sessionId ? filledButton(sc, `${APP_URL}/hold/${p.sessionId}`, "Manage my booking") : filledButton(sc, `${APP_URL}/sessions`, "Browse sessions")}
    ${links(sc)}
  `, { highlight: false });
  return { subject: partial ? `Booking updated — ${p.sessionTitle}` : `Hold cancelled — ${p.sessionTitle}`, html };
}

// 9 — A place on us (HQ comp)
function placeOnUs(p: AttendeeEmailPayload, c: Ctx) {
  const loginUrl = `${APP_URL}/login${p.sessionId ? `?next=/hold/${p.sessionId}` : ""}`;
  const need = c.min > 0 ? moreToGoAhead(c.held, c.min) : null;
  const places = c.n === 1 ? "a place" : `${c.n} places`;
  const html = page("purple", (sc) => `
    ${h1(sc, c.n === 1 ? "A place on us. 💛" : `${c.n} places on us. 💛`)}
    ${intro(sc, p, [`Stretchy HQ has saved you ${places}, on us. Nothing to pay. ${c.min > 0 ? `It still needs ${c.min} people to go ahead, and we’ll` : "We’ll"} email you 36 hours out either way.`])}
    ${dayBox(sc, p, c, { row: { label: c.n === 1 ? "Your place" : "Your places", bold: "On us", second: need ? `${need}.` : c.held > 0 ? `${inAndRoom(c.held)}.` : null }, dots: c.max > 0 })}
    ${p.newAccount ? filledButton(sc, loginUrl, "Set up my account") : filledButton(sc, c.manageUrl, "Manage my booking")}
    ${links(sc)}
  `);
  return { subject: `${subjectDate(p.startsAt)}We’ve held you ${places} — on us 💛`, html };
}

// 10 — Your card didn't go through (a booking attempt that failed at the card step)
function cardFailed(p: AttendeeEmailPayload, c: Ctx) {
  const places = c.n === 1 ? "your place" : `your ${c.n} places`;
  const html = page("cream", (sc) => `
    ${h1(sc, "Your card didn’t go through.")}
    ${intro(sc, p, [
      `We couldn’t hold ${places} for <strong>${esc(p.sessionTitle)}</strong> because your card didn’t go through. ${esc(p.declineReason ?? "Your bank declined it.")}`,
      "<strong>Nothing was charged, and no place is held yet.</strong> Want to try again? It only takes a minute, and a different card works too.",
    ])}
    ${filledButton(sc, c.sessionUrl, "Hold my place")}
    ${links(sc)}
  `, { highlight: false });
  return { subject: `Your card didn’t go through — ${p.sessionTitle}`, html };
}

// 11 — We couldn't confirm your card (36 hrs out: it's going ahead, their card said no)
function cardConfirmFailed(p: AttendeeEmailPayload, c: Ctx) {
  const places = c.n === 1 ? "your place" : `your ${c.n} places`;
  const by = p.cardDeadline ? `by <strong>${esc(p.cardDeadline)}</strong>` : "at least 12 hours before it starts";
  const html = page("cream", (sc) => `
    ${h1(sc, "We couldn’t confirm your card.")}
    ${intro(sc, p, [
      `Good news first: <strong>${esc(p.sessionTitle)}</strong> is going ahead. 🎉 But when we went to confirm your card for ${places}, it didn’t go through. ${esc(p.declineReason ?? "Your bank declined it.")}`,
      `<strong>Nothing has been charged, and ${places === "your place" ? "your place is" : `${places} are`} still held for now.</strong> To keep ${c.n === 1 ? "it" : "them"}, update your card ${by}. It only takes a minute, and a different card works too.`,
      `If we don’t have a working card by then, ${c.n === 1 ? "your place goes" : "your places go"} back to the group.`,
    ])}
    ${filledButton(sc, `${c.manageUrl}/card`, "Update my card")}
    ${links(sc)}
  `, { highlight: false });
  return { subject: `Action needed: we couldn’t confirm your card — ${p.sessionTitle}`, html };
}

// 12 — Reminder: still no working card
function cardConfirmReminder(p: AttendeeEmailPayload, c: Ctx) {
  const places = c.n === 1 ? "your place" : `your ${c.n} places`;
  const by = p.cardDeadline ? `by <strong>${esc(p.cardDeadline)}</strong>` : "at least 12 hours before it starts";
  const html = page("cream", (sc) => `
    ${h1(sc, "Your place still needs a card.")}
    ${intro(sc, p, [
      `A quick reminder: we still couldn’t confirm your card for <strong>${esc(p.sessionTitle)}</strong>. Update it ${by} to keep ${places}.`,
      `After that, ${c.n === 1 ? "your place goes" : "your places go"} back to the group.`,
    ])}
    ${filledButton(sc, `${c.manageUrl}/card`, "Update my card")}
    ${links(sc)}
  `, { highlight: false });
  return { subject: `Reminder: your place needs a card — ${p.sessionTitle}`, html };
}

// 13 — Your place has been released (no working card by the deadline)
function cardPlaceReleased(p: AttendeeEmailPayload, c: Ctx) {
  const html = page("cream", (sc) => `
    ${h1(sc, c.n === 1 ? "Your place has been released." : "Your places have been released.")}
    ${intro(sc, p, [
      `We couldn’t confirm a card for <strong>${esc(p.sessionTitle)}</strong> in time, so ${c.n === 1 ? "your place has" : `your ${c.n} places have`} gone back to the group.`,
      "Still keen? If there’s still room, you can join again up to 2 hours before it starts.",
    ])}
    ${filledButton(sc, c.sessionUrl, "Hold my place")}
    ${links(sc)}
  `, { highlight: false });
  return { subject: `Your place has been released — ${p.sessionTitle}`, html };
}

// 14 — How was your first Stretchy? (two days after someone's first session)
// Two ways to answer: the quick questions at /rate/[session] ("Rate it quick-smart"), or simply reply to the email (replies go to Kimberley).
function firstStretchyFollowUp(p: AttendeeEmailPayload) {
  const html = page("purple", (sc) => `
    ${h1(sc, "How was your first Stretchy? ☀️☕🍷")}
    ${hey(sc, esc(p.name))}
    ${msg(sc, "Thanks for coming to Stretchy. We’d love to hear how it went.")}
    ${p.sessionId ? filledButton(sc, `${APP_URL}/rate/${p.sessionId}`, "Rate it quick-smart") : ""}
    ${msg(sc, `Or email us back here with any feedback you may have (on the session, the experience, the booking system or whatever you like). You can also suggest where and how we show up next: <a href="${APP_URL}/suggest" style="color:${sc.text};font-weight:700;">Suggest a Stretchy</a>.`)}
    ${outlineButton(sc, `${APP_URL}/suggest`, "Suggest a Stretchy")}
    ${msg(sc, "And if you really enjoyed it, tell ya mates and help us grow the Stretchy community.")}
    ${outlineButton(sc, `${APP_URL}/sessions`, "See what’s on next")}
    <p style="color:${sc.text};font-size:15px;line-height:1.55;margin:0 0 22px;">With gratitude,<br>The Stretchy team</p>
  `, { highlight: false });
  return { subject: "How was your first Stretchy? ☀️☕🍷", html };
}

export function renderAttendeeEmail(type: AttendeeEmailType, p: AttendeeEmailPayload): { subject: string; html: string } {
  const c = context(p);
  switch (type) {
    case "hold_confirmed": return placeHeld(p, c);
    case "almost_there": return soClose(p, c);
    case "session_going_ahead": return goingAhead(p, c);
    case "session_confirmed_open": return stillRoom(p, c);
    case "price_locked": return finalPrice(p, c);
    case "session_cancelled": return notThisTime(p, c);
    case "hold_cancelled": return holdCancelled(p);
    case "comp_hold_confirmed": return placeOnUs(p, c);
    case "booking_card_failed": return cardFailed(p, c);
    case "first_stretchy_followup": return firstStretchyFollowUp(p);
    case "card_confirm_failed": return cardConfirmFailed(p, c);
    case "card_confirm_reminder": return cardConfirmReminder(p, c);
    case "card_place_released": return cardPlaceReleased(p, c);
  }
}
