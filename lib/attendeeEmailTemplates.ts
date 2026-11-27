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
//   • No real dates or times for the 36 hr / 30 min moments.
//   • Every detail comes from the session; an empty value hides its row.
//   • Words follow STRETCHY_WORDS.md.
// Layout is table-based so mail clients render it reliably.
// ─────────────────────────────────────────────────────────────────────────────

import { page as basePage, h1, hey, msg, label, APP_URL, type Scheme, type AttendeeEmailType, type AttendeeEmailPayload, type EmailFooter } from "@/lib/stretchy-email";
import { sessionTimes, subjectDate } from "@/lib/sessionTimes";
import { calculatePrice, maxPriceToPromise, priceRightNow, priceHasDropped } from "@/lib/pricing";
import { venueLine, meetLine } from "@/lib/sessionDisplay";
import { generalShareMessage } from "@/lib/shareMessage";
import { SHOUT_LIVE, shoutPath, claimPath, againPath } from "@/lib/shoutWords";
import { placeCount, yourPlaces, youOrCrew, bringNote, moreToGoAhead, inAndRoom, untilPriceDrops } from "@/lib/places";

const MONO = "'JetBrains Mono',ui-monospace,Menlo,monospace";
const CHUBB = "'BN Chubb','Arial Black',Arial,sans-serif";
const money = (n: number) => `$${n.toFixed(2)}`;
const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Every attendee email gets the standard footer (how was this email, why
// you're getting it, your data). renderAttendeeEmail sets it for the email
// being built; page() below adds it.
let currentFooter: EmailFooter | undefined;
const page: typeof basePage = (scheme, inner, opts = {}) => basePage(scheme, inner, { ...opts, footer: currentFooter });

const HELD = "you held a place at Stretchy.";
const SAVED = "you saved this session at Stretchy.";
function footerFor(type: AttendeeEmailType, p: AttendeeEmailPayload): EmailFooter {
  switch (type) {
    case "almost_there":
    case "session_cancelled":
      return { type, reason: p.isHolder === false ? SAVED : HELD };
    case "session_confirmed_open": return { type, reason: SAVED };
    case "hold_cancelled": return { type, reason: "you cancelled a place at Stretchy." };
    case "booking_card_failed": return { type, reason: "you tried to hold a place at Stretchy." };
    case "first_stretchy_followup": return { type, reason: "you came to Stretchy." };
    case "shout_sent":
      return { type, reason: "you shouted someone a place at Stretchy.", data: `We only use ${esc(p.shoutTo ?? "their")}${p.shoutTo ? "'s" : ""} email for their place. We never sell or share details.` };
    case "shout_received":
      return {
        type,
        reason: `${esc(p.shoutFrom ?? "A mate")} shouted you a place. We only use your email for this place.`,
        settings: { href: `mailto:hello@stretchyyoga.co.nz?subject=${encodeURIComponent("Don't email me again")}`, text: "Don't email me again" },
      };
    case "shout_claimed":
    case "shout_final":
    case "shout_released":
    case "shout_unclaimed_nudge":
    case "shout_refunded":
      return { type, reason: "you shouted someone a place at Stretchy." };
    case "shout_called_off":
      return p.shoutRole === "mate"
        ? { type, reason: `${esc(p.shoutFrom ?? "A mate")} shouted you a place at Stretchy.` }
        : { type, reason: "you shouted someone a place at Stretchy." };
    case "buddy_intro":
    case "buddy_solo":
      return { type, reason: "you switched on Buddy me up for this session.", data: "We delete your buddy match a week after the session. We never sell or share your details." };
    default: return { type, reason: HELD };
  }
}

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
  // Confirmed (36 hrs out, or HQ kept it alive): it's going ahead, whatever the numbers.
  const goingAhead = p.sessionState === "confirmed" || p.sessionState === "locked";
  const opening = hasNumbers ? calculatePrice(p.costBase!, p.revenueTarget!, min) : null;
  const floor = hasNumbers ? calculatePrice(p.costBase!, p.revenueTarget!, max) : null;
  // The most this person can pay: at-minimum price before 36 hrs out, current after.
  const maxNow = hasNumbers ? maxPriceToPromise(p.costBase!, p.revenueTarget!, min, held, before36) : null;
  const id = p.sessionId ?? "";
  // The price right now (current headcount, floored at the minimum) — shown
  // next to the cap once more than the minimum are in.
  const rightNow = hasNumbers ? priceRightNow(p.costBase!, p.revenueTarget!, min, held) : null;
  return {
    n, min, max, held, hasNumbers, t, before36, goingAhead, opening, floor, maxNow, rightNow,
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
function outlineButton(sc: Scheme, href: string, text: string, bottom = 16) {
  return `<a href="${href}" style="display:block;text-align:center;background:transparent;border:2px solid ${sc.text};color:${sc.text} !important;-webkit-text-fill-color:${sc.text} !important;text-decoration:none;font-size:15px;font-weight:800;padding:13px 24px;border-radius:999px;margin:0 0 ${bottom}px;"><span style="color:${sc.text} !important;-webkit-text-fill-color:${sc.text} !important;text-decoration:none;">${text}</span></a>`;
}

/**
 * Shout a mate goes live later (SOCIAL_BOOKING_BRIEF.md 4; the switch is in
 * lib/shoutWords.ts). Until then its button stays out of real emails so nobody
 * taps through to nothing. Test sends set EMAIL_PREVIEW_ALL_ACTIONS=1.
 */
export { SHOUT_LIVE };
export const BUDDY_LIVE = true;
const previewAll = () => process.env.EMAIL_PREVIEW_ALL_ACTIONS === "1";

/** Small pill buttons in one row (filled: text colour, with background-colour text). */
function pillRow(sc: Scheme, items: { href: string; text: string }[], margin?: string) {
  const w = `${Math.floor(100 / items.length)}%`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"${margin ? ` style="margin:${margin};"` : ""}><tr>${items.map((b) =>
    `<td width="${w}" style="padding:0 4px;"><a href="${b.href}" style="display:block;text-align:center;background:${sc.text};color:${sc.bg} !important;-webkit-text-fill-color:${sc.bg} !important;text-decoration:none;font-size:13px;font-weight:800;padding:11px 6px;border-radius:999px;"><span style="color:${sc.bg} !important;-webkit-text-fill-color:${sc.bg} !important;">${b.text}</span></a></td>`
  ).join("")}</tr></table>`;
}

/**
 * "Who's coming with you?" + Share with a mate · Shout a mate · Buddy me up,
 * each opening the hold page with that step open. Hidden for people who
 * turned share prompts off.
 */
function whoCard(sc: Scheme, p: AttendeeEmailPayload, c: Ctx) {
  if (p.sharePromptsOff) return "";
  const base = c.manageUrl;
  const join = base.includes("?") ? "&" : "?";
  const items = [
    { href: c.shareUrl, text: "Share with a mate" },
    (SHOUT_LIVE || previewAll()) && { href: p.sessionId ? `${APP_URL}${shoutPath(p.sessionId)}` : `${APP_URL}/sessions`, text: "Shout a mate" },
    (BUDDY_LIVE || previewAll()) && { href: `${base}${join}buddy=1`, text: "Buddy me up" },
  ].filter(Boolean) as { href: string; text: string }[];
  return `<div style="border:2px solid ${sc.text};border-radius:16px;padding:14px 12px;margin:0 0 12px;"><p style="margin:0 4px 10px;font-family:${CHUBB};font-weight:900;font-size:20px;line-height:1;text-transform:uppercase;color:${sc.text};">Who's coming with you?</p>${pillRow(sc, items)}</div>`;
}

/** The only links at the bottom of every email. */
function links(sc: Scheme) {
  const a = (href: string, text: string) =>
    `<a href="${href}" target="_blank" rel="noopener noreferrer" style="color:${sc.text};font-weight:700;text-decoration:underline;">${text} ↗</a>`;
  // Same tint as the timing rows above them.
  return `<p style="font-size:13px;color:${sc.text};margin:6px 0 4px;opacity:${TINT};">${a(`${APP_URL}/#how-it-works`, "How it works")} &nbsp;&nbsp; ${a(`${APP_URL}/terms#cancellation`, "Cancellation policy")}</p>`;
}

/** Outlined card (social booking emails). */
function card(sc: Scheme, inner: string) {
  return `<div style="border:2px solid ${sc.text};border-radius:16px;padding:18px;margin:0 0 16px;background:transparent;">${inner}</div>`;
}
/** Small mono label at the top of a card. */
function cardLabel(sc: Scheme, text: string) {
  return `<p style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:${sc.text};margin:0 0 8px;">${text}</p>`;
}
/** Big display line (BN Chubb). */
function display(sc: Scheme, text: string, size: number, margin: string, upper = false) {
  return `<p style="margin:${margin};font-family:${CHUBB};font-weight:900;font-size:${size}px;line-height:1;${upper ? "text-transform:uppercase;" : ""}color:${sc.text};">${text}</p>`;
}
/** A quote in a card: "Ask me about my sourdough disaster." */
function quote(sc: Scheme, text: string, by?: string) {
  return `<p style="margin:0;font-size:17px;line-height:1.4;color:${sc.text};font-style:italic;">"${esc(text)}"${by ? ` <span style="font-style:normal;font-size:13px;">— ${esc(by)}</span>` : ""}</p>`;
}
function signOff(sc: Scheme, words = "See you there") {
  return `<p style="color:${sc.text};font-size:15px;line-height:1.55;margin:16px 0 22px;">${words},<br>The Stretchy team</p>`;
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
    t && meet && { label: t.arriveTime, bold: "Say kia ora", second: `${esc(meet)} Say hello to someone new.` },
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

// How the room's doing, in the session page's words:
//   going ahead, under the minimum → "Going ahead ✓ · 2 more people, then the price drops"
//   going ahead                    → "Going ahead ✓ · 17 in · still room to join"
//   before 36 hrs out              → "10 more to go ahead" / "17 in · still room to join"
function roomNow(c: Ctx): string {
  if (c.goingAhead) {
    const drops = c.min > 0 ? untilPriceDrops(c.held, c.min) : null;
    return drops ? `Going ahead ✓ · ${drops}` : `Going ahead ✓ · ${inAndRoom(c.held)}`;
  }
  return c.before36 ? moreToGoAhead(c.held, c.min) ?? inAndRoom(c.held) : inAndRoom(c.held);
}

// The "price now" row + the grey timing rows, in the session page's words.
function priceNowRow(c: Ctx): Row | null {
  if (c.maxNow == null) return null;
  const totalCents = Math.round(c.maxNow * 100) * c.n;
  const room = roomNow(c);
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
const ROW_ROOM: Row = { label: "36 hrs → 30 mins out", bold: "Still room to join", second: "More people can join and the price keeps dropping. No free cancelling from here." };
const ROW_FINAL = (c: Ctx, tail = ""): Row => ({ label: "30 mins out", bold: "Final price charged", second: `${c.opening != null ? `Never more than ${money(c.before36 ? c.opening : c.maxNow ?? c.opening)}.` : "Never more than the max price shown."}${tail}` });
const ROW_ROOM_NOW: Row = { label: "36 hrs → 30 mins out", bold: "Still room to join, right now", second: "Join now and you’re in straight away. The price keeps dropping." };
const ROW_FINAL_LATE = (c: Ctx): Row => ({ label: "30 mins out", bold: "Final price charged", second: `Joining closes.${c.maxNow != null ? ` Never more than ${money(c.maxNow)}.` : ""}` });
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
      ? [`<strong>We look forward to seeing ${youOrCrew(c.n)} at Stretchy.</strong> This one’s already going ahead, so you’re in straight away.`]
      : [
          c.min > 0 && c.held >= c.min
            ? `<strong>We look forward to seeing ${youOrCrew(c.n)} at Stretchy.</strong> We’ve hit the minimum of ${c.min} people, so it’s on track to go ahead. ${places.charAt(0).toUpperCase() + places.slice(1)} ${c.n === 1 ? "is" : "are"} held and <strong>we’ll confirm 36 hours out</strong>. Nothing’s charged yet.`
            : `<strong>We look forward to seeing ${youOrCrew(c.n)} at Stretchy.</strong> We haven’t hit the minimum number of people yet, so ${places} ${c.n === 1 ? "is" : "are"} held and <strong>we’ll confirm 36 hours out</strong>. Nothing’s charged yet.`,
        ])}
    ${dayBox(sc, p, c, priceNowRow(c) ? { row: priceNowRow(c)!, dots: true } : undefined)}
    ${whoCard(sc, p, c)}
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
      ${intro(sc, p, [`We need <strong>${people}</strong> before <strong>36 hours out</strong> for this one to go ahead. Know someone who’d love it? Now’s the time to send it their way.${p.isComp ? ` ${nothingToPay(p)}` : ""}`])}
      ${price(sc)}
      ${whoCard(sc, p, c)}
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
    ${intro(sc, p, [`${hitMin ? `We hit ${c.min}, so it’s` : "It’s"} going ahead and ${places} confirmed.${p.isComp ? ` ${nothingToPay(p)}` : ""} Here’s all the deets for the day.`])}
    ${dayBox(sc, p, c)}
    ${outlineButton(sc, c.manageUrl, "Manage my booking")}
    ${!p.isComp && c.maxNow != null ? priceBlock(sc, { big: money(c.maxNow), caption: "max per person · incl. GST", leftLabel: inAndRoom(c.held), c, endPrices: true }) : ""}
    ${p.isComp ? "" : greyRows(sc, [ROW_ROOM, { label: "30 mins out", bold: "Final price charged", second: c.maxNow != null ? `Never more than ${money(c.maxNow)}.` : null }])}
    ${whoCard(sc, p, c)}
    ${links(sc)}
  `);
  return { subject: `${subjectDate(p.startsAt)}It’s going ahead 🎉 ${p.sessionTitle}`, html };
}

// 5 — Still room (after 36 hrs, to people who tapped ♡)
function stillRoom(p: AttendeeEmailPayload, c: Ctx) {
  const hitMin = c.min > 0 && c.held >= c.min;
  const html = page("orange", (sc) => `
    ${h1(sc, "It’s going ahead, and there’s still room. 📉")}
    ${intro(sc, p, [`${esc(p.sessionTitle)} ${hitMin ? `hit ${c.min}, so it’s` : "is"} going ahead. There’s still room, and you can join up to <strong>30 minutes before</strong>. Come move with us.`])}
    ${c.maxNow != null ? priceBlock(sc, { big: money(c.maxNow), caption: "max per person · incl. GST", leftLabel: inAndRoom(c.held), c, endPrices: true }) : ""}
    ${filledButton(sc, c.sessionUrl, "Hold my place")}
    <div style="height:6px;"></div>
    ${greyRows(sc, [ROW_ROOM_NOW, ROW_FINAL_LATE(c)])}
    ${links(sc)}
  `);
  return { subject: `${subjectDate(p.startsAt)}It’s going ahead — ${p.sessionTitle}. Still room 🎉`, html };
}

// 6 / 6b — Your final price (30 mins out)
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
    ${intro(sc, p, [`<strong>See you${crew} shortly! ${c.held} of us are moving together ${dayWord}${p.isComp ? `. ${nothingToPay(p)}` : ", so the price dropped for everyone."} Here’s everything you need for today.</strong>`])}
    ${priceBlock(sc, {
      big: p.isComp ? (p.shoutFrom ? "Paid for" : "On us") : (c.n === 1 ? each : total),
      caption: p.isComp ? "nothing to pay" : c.n === 1 ? "charged now · incl. GST" : `charged now for ${c.n} places · ${each} each · incl. GST`,
      leftLabel: `${c.held} in`,
      c,
    })}
    ${shoutLinesBox(sc, p)}
    ${dayBox(sc, p, c)}
    ${outlineButton(sc, c.manageUrl, "Manage my booking")}
    ${links(sc)}
  `);
  return { subject, html };
}

/** "Your place is on us" / "Sam shouted you this one" — for places with nothing to pay. */
function nothingToPay(p: AttendeeEmailPayload) {
  return p.shoutFrom ? `${esc(p.shoutFrom)} shouted you this one, so there’s nothing to pay.` : "Your place is on us, so there’s nothing to pay.";
}

/** The giver's shouts, settled 30 mins out. */
function shoutLinesBox(sc: Scheme, p: AttendeeEmailPayload) {
  if (!p.shoutLines?.length) return "";
  return card(sc, p.shoutLines.map((l) => `<p style="margin:0 0 6px;font-size:14px;line-height:1.5;color:${sc.text};">🎁 ${esc(l)}</p>`).join(""));
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
  const saved = p.shoutFrom ? `${esc(p.shoutFrom)} has shouted you ${places}. It’s all paid for.` : p.giftFrom ? `${esc(p.giftFrom)} has shouted you ${places}, on Stretchy.` : `Stretchy HQ has saved you ${places}, on us.`;
  const html = page("purple", (sc) => `
    ${h1(sc, p.shoutFrom ? "You’re in. 🎁" : c.n === 1 ? "A place on us. 💛" : `${c.n} places on us. 💛`)}
    ${intro(sc, p, [c.goingAhead
      ? `${saved} Nothing to pay. <strong>It’s going ahead</strong>, so you’re all set. Here’s all the deets for the day.`
      : `${saved} Nothing to pay. ${need ? `It needs ${need.replace(" to go ahead", "")} people to go ahead, and we’ll` : "We’ll"} email you 36 hours out either way.`])}
    ${dayBox(sc, p, c, { row: { label: c.n === 1 ? "Your place" : "Your places", bold: p.shoutFrom ? `Shouted by ${esc(p.shoutFrom)}` : "On us", second: c.goingAhead ? `${roomNow(c)}.` : need ? `${need}.` : c.held > 0 ? `${inAndRoom(c.held)}.` : null }, dots: c.max > 0 })}
    ${p.newAccount ? filledButton(sc, loginUrl, "Set up my account") : filledButton(sc, c.manageUrl, "Manage my booking")}
    ${links(sc)}
  `);
  return { subject: p.shoutFrom ? `${subjectDate(p.startsAt)}You’re in — ${p.shoutFrom} shouted you 🎁` : `${subjectDate(p.startsAt)}We’ve held you ${places} — on us 💛`, html };
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
      "Still keen? If there’s still room, you can join again up to 30 minutes before it starts.",
    ])}
    ${filledButton(sc, c.sessionUrl, "Hold my place")}
    ${links(sc)}
  `, { highlight: false });
  return { subject: `Your place has been released — ${p.sessionTitle}`, html };
}

// 14 — How was your first Stretchy? (two days after someone's first session)
// "You moved the price": how many came and how far the price dropped (only
// when it did). Then rate it, same time next week, suggest, and share.
function firstStretchyFollowUp(p: AttendeeEmailPayload, c: Ctx) {
  const came = p.attendeeCount ?? 0;
  const final = p.unitPriceCents != null ? p.unitPriceCents / 100 : null;
  const moved = came > 0 && c.opening != null && final != null && final < c.opening;
  const share = generalShareMessage(APP_URL);
  const html = page("purple", (sc) => `
    ${h1(sc, "How was your first Stretchy? ☀️☕🍷")}${hey(sc, esc(p.name))}${moved ? card(sc, `${cardLabel(sc, "You moved the price 🙌")}${display(sc, `${came} OF YOU CAME`, 34, "0 0 6px")}${display(sc, `${money(c.opening!)} → ${money(final!)} EACH`, 22, "0 0 6px")}<p style="margin:0;font-size:14px;color:${sc.text};">More people, more vibes, more connection. 💛</p>`) : ""}${p.sessionId ? filledButton(sc, `${APP_URL}/rate/${p.sessionId}`, "⭐ Rate your Stretchy") : ""}${outlineButton(sc, p.nextSessionId ? `${APP_URL}/sessions/${p.nextSessionId}` : `${APP_URL}/sessions`, "🗓️ Same time next week?", 10)}${outlineButton(sc, `${APP_URL}/suggest`, "💡 Suggest a Stretchy", 10)}<div style="height:8px"></div>${card(sc, `${cardLabel(sc, "Share Stretchy 💛")}${display(sc, "STRETCHYYOGA.CO.NZ", 26, "0 0 12px")}${pillRow(sc, [
      { href: `https://wa.me/?text=${encodeURIComponent(share.body)}`, text: "WhatsApp" },
      { href: `sms:?&body=${encodeURIComponent(share.body)}`, text: "Text" },
      { href: `mailto:?subject=${encodeURIComponent(share.subject)}&body=${encodeURIComponent(share.body)}`, text: "Email" },
    ], "0 0 4px")}`)}${msg(sc, "👋 Did you say hello to someone new?")}${signOff(sc, "With gratitude")}
  `);
  return { subject: "How was your first Stretchy? ☀️☕🍷", html };
}

// 15 — Shout sent (to the person who shouted a mate a place). SOCIAL_BOOKING_BRIEF.md 4.
function shoutSent(p: AttendeeEmailPayload, c: Ctx) {
  const to = esc(p.shoutTo ?? "your mate");
  const claimUrl = p.shoutCode ? `${APP_URL}${claimPath(p.shoutCode)}` : null;
  const manageUrl = p.sessionId ? `${APP_URL}${shoutPath(p.sessionId)}` : `${APP_URL}/sessions`;
  const html = page("olive", (sc) => `
    ${h1(sc, "What a treat. 🎁")}${hey(sc, esc(p.name))}${msg(sc, `You've shouted ${to} a place at <strong>${esc(p.sessionTitle)}</strong>.`)}${p.shoutDeliver === "link" && claimUrl
      ? card(sc, `${cardLabel(sc, `One-time gift link for ${to}`)}<p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:${sc.text};word-break:break-all;"><a href="${claimUrl}" style="color:${sc.text};font-weight:700;">${claimUrl}</a></p>${pillRow(sc, [
          { href: `https://wa.me/?text=${encodeURIComponent(`I've shouted you a place at Stretchy 🎁 Claim it here: ${claimUrl}`)}`, text: "WhatsApp" },
          { href: `sms:?&body=${encodeURIComponent(`I've shouted you a place at Stretchy 🎁 Claim it here: ${claimUrl}`)}`, text: "Text" },
        ], "0 0 4px")}`)
      : card(sc, `<p style="margin:0;font-size:15px;line-height:1.5;color:${sc.text};">📣 <strong>Give ${to} a heads-up</strong>, and ask them to check junk.</p>`)}${dayBox(sc, p, c)}${p.shoutPaid ? card(sc, `${cardLabel(sc, "What you paid")}${display(sc, esc(p.shoutPaid), 32, "0 0 4px")}<p style="margin:0;font-size:13px;color:${sc.text};">Today, never more. Any difference comes back to your card 30 mins before.</p>`) : ""}${filledButton(sc, manageUrl, "Manage my shout")}${msg(sc, `We'll let you know when ${to} claims it.`)}${signOff(sc)}
  `);
  return { subject: `You've shouted ${p.shoutTo ?? "a mate"} a place 🎁`, html };
}

// 16 — Shout received (to the mate; the only email unless they claim). SOCIAL_BOOKING_BRIEF.md 4.
function shoutReceived(p: AttendeeEmailPayload, c: Ctx) {
  const from = esc(p.shoutFrom ?? "A mate");
  const claimUrl = p.shoutCode ? `${APP_URL}${claimPath(p.shoutCode)}` : c.sessionUrl;
  const html = page("orange", (sc) => `
    ${h1(sc, `${from} has a treat for you. 🎁`)}${hey(sc, esc(p.name))}${msg(sc, `${from} has shouted you a place at <strong>${esc(p.sessionTitle)}</strong>. It's all paid for.`)}${p.shoutNote ? card(sc, quote(sc, p.shoutNote, p.shoutFrom)) : ""}${dayBox(sc, p, c)}${msg(sc, "🧘 Yoga, then ☕ a Social Stretch.<br>💛 Never done yoga? Perfect. Every body welcome.")}${filledButton(sc, claimUrl, "Claim my place")}${msg(sc, `Takes a minute. No card needed.<br>Can't make it? <a href="${claimUrl}?cant=1" style="color:${sc.text};font-weight:700;">Let ${from} know</a>. We won't email you again.`)}${signOff(sc)}
  `);
  return { subject: `${p.shoutFrom ?? "A mate"} shouted you a place at Stretchy 🎁`, html };
}

// 16b — Your shout was claimed (to the giver). SOCIAL_BOOKING_BRIEF.md 4.
function shoutClaimed(p: AttendeeEmailPayload, c: Ctx) {
  const to = esc(p.shoutTo ?? "Your mate");
  const html = page("olive", (sc) => `
    ${h1(sc, `${to} claimed your shout. 🙌`)}${hey(sc, esc(p.name))}${msg(sc, `${to} is in for <strong>${esc(p.sessionTitle)}</strong>. We've sent them all the details for the day.`)}${dayBox(sc, p, c)}${filledButton(sc, p.sessionId ? `${APP_URL}${shoutPath(p.sessionId)}` : `${APP_URL}/sessions`, "Manage my shout")}${signOff(sc)}
  `);
  return { subject: `${p.shoutTo ?? "Your mate"} claimed your shout 🙌`, html };
}

// 16c — Your shout's final price (to a giver who isn't coming themselves; givers
// who are coming get the same lines in their final-price email).
function shoutFinal(p: AttendeeEmailPayload) {
  const html = page("olive", (sc) => `
    ${h1(sc, "Your shout's final price. 🎁")}${hey(sc, esc(p.name))}${msg(sc, `<strong>${esc(p.sessionTitle)}</strong> starts soon, so the final price is in.`)}${shoutLinesBox(sc, p)}${signOff(sc)}
  `);
  return { subject: `Your shout's final price — ${p.sessionTitle}`, html };
}

// 16d — Called off (SOCIAL_BOOKING_BRIEF.md 4, "Cancelling").
//   giver: we called the session off. Re-book {Name} or a refund, their choice.
//   mate:  the giver cancelled the shout they'd claimed. Told kindly.
function shoutCalledOff(p: AttendeeEmailPayload, c: Ctx) {
  if (p.shoutRole === "mate") {
    const from = esc(p.shoutFrom ?? "Your mate");
    const html = page("cream", (sc) => `
    ${h1(sc, "Change of plan. 💛")}${hey(sc, esc(p.name))}${msg(sc, `${from} can't shout you a place at <strong>${esc(p.sessionTitle)}</strong> after all, so it's been cancelled. You don't pay a thing.`)}${msg(sc, "Still keen? There's often room. Hold your own place, and the price keeps dropping as more people join.")}${filledButton(sc, c.sessionUrl, "Have a look")}${signOff(sc, "Hope to see you soon")}
  `);
    return { subject: `Change of plan — ${p.sessionTitle}`, html };
  }
  const to = esc(p.shoutTo ?? "your mate");
  const again = p.shoutId ? `${APP_URL}${againPath(p.shoutId)}` : `${APP_URL}/sessions`;
  const html = page("cream", (sc) => `
    ${h1(sc, "Not this time. 💛")}${hey(sc, esc(p.name))}${msg(sc, `We've had to call off <strong>${esc(p.sessionTitle)}</strong>, so ${to}'s place won't go ahead. If ${to} claimed it, we've let them know.`)}${p.shoutPaid ? card(sc, `${cardLabel(sc, "What you paid")}${display(sc, esc(p.shoutPaid), 32, "0 0 4px")}<p style="margin:0;font-size:13px;color:${sc.text};">Re-book ${to} at another session, or get it all back. Your choice.</p>`) : ""}${filledButton(sc, again, `Re-book ${to}`)}${outlineButton(sc, `${again}?refund=1`, "Refund me", 10)}${msg(sc, `No choice in 7 days? We'll refund you in full.`)}${signOff(sc, "Sorry about this")}
  `);
  return { subject: `Called off — ${p.shoutTo ?? "your mate"}'s place at ${p.sessionTitle}`, html };
}

// 16e — Your mate can't make it (to the giver). Up to 36 hrs out: refunded.
// Inside 36 hrs: no free cancelling, so the place is theirs to pass on.
function shoutReleased(p: AttendeeEmailPayload, c: Ctx) {
  const to = esc(p.shoutTo ?? "Your mate");
  const manageUrl = p.sessionId ? `${APP_URL}${shoutPath(p.sessionId)}` : `${APP_URL}/sessions`;
  const claimUrl = p.shoutCode ? `${APP_URL}${claimPath(p.shoutCode)}` : null;
  const html = page("cream", (sc) => p.shoutRefund ? `
    ${h1(sc, `${to} can't make it. 💛`)}${hey(sc, esc(p.name))}${msg(sc, `${to} can't make it to <strong>${esc(p.sessionTitle)}</strong>, so we've let their place go.`)}${card(sc, `${cardLabel(sc, "Back to your card")}${display(sc, esc(p.shoutRefund), 32, "0 0 4px")}<p style="margin:0;font-size:13px;color:${sc.text};">Refunded in full. It can take a few days to show.</p>`)}${filledButton(sc, manageUrl, "Shout someone else")}${signOff(sc)}
  ` : `
    ${h1(sc, `${to} can't make it. 💛`)}${hey(sc, esc(p.name))}${msg(sc, `${to} can't make it to <strong>${esc(p.sessionTitle)}</strong>. It's inside 36 hours, so no free cancelling, but the place is still yours to pass on.`)}${claimUrl ? card(sc, `${cardLabel(sc, "Send your gift link to someone else")}<p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:${sc.text};word-break:break-all;"><a href="${claimUrl}" style="color:${sc.text};font-weight:700;">${claimUrl}</a></p>${pillRow(sc, [
      { href: `https://wa.me/?text=${encodeURIComponent(`I've shouted you a place at Stretchy 🎁 Claim it here: ${claimUrl}`)}`, text: "WhatsApp" },
      { href: `sms:?&body=${encodeURIComponent(`I've shouted you a place at Stretchy 🎁 Claim it here: ${claimUrl}`)}`, text: "Text" },
    ], "0 0 4px")}`) : ""}${msg(sc, "Any difference from the final price comes back to your card 30 mins before.")}${outlineButton(sc, manageUrl, "Manage my shout", 10)}${signOff(sc)}
  `);
  return { subject: `${p.shoutTo ?? "Your mate"} can't make it — ${p.sessionTitle}`, html };
}

// 16f — Still unclaimed, 48 hrs out (to the giver, once).
function shoutUnclaimedNudge(p: AttendeeEmailPayload, c: Ctx) {
  const to = esc(p.shoutTo ?? "Your mate");
  const manageUrl = p.sessionId ? `${APP_URL}${shoutPath(p.sessionId)}` : `${APP_URL}/sessions`;
  const claimUrl = p.shoutCode ? `${APP_URL}${claimPath(p.shoutCode)}` : null;
  const html = page("olive", (sc) => `
    ${h1(sc, `${to} hasn't claimed it yet.`)}${hey(sc, esc(p.name))}${msg(sc, `The place you shouted ${to} at <strong>${esc(p.sessionTitle)}</strong> is still waiting. A quick nudge?`)}${claimUrl ? card(sc, `${cardLabel(sc, `Gift link for ${to}`)}<p style="margin:0 0 12px;font-size:14px;line-height:1.5;color:${sc.text};word-break:break-all;"><a href="${claimUrl}" style="color:${sc.text};font-weight:700;">${claimUrl}</a></p>${pillRow(sc, [
      { href: `https://wa.me/?text=${encodeURIComponent(`I've shouted you a place at Stretchy 🎁 Claim it here: ${claimUrl}`)}`, text: "WhatsApp" },
      { href: `sms:?&body=${encodeURIComponent(`I've shouted you a place at Stretchy 🎁 Claim it here: ${claimUrl}`)}`, text: "Text" },
    ], "0 0 4px")}`) : ""}${dayBox(sc, p, c)}${filledButton(sc, manageUrl, p.shoutDeliver === "email" ? "Send it again" : "Manage my shout")}${msg(sc, `Send it to someone else, or cancel. Free to cancel until 36 hours out.`)}${signOff(sc)}
  `);
  return { subject: `${p.shoutTo ?? "Your mate"} hasn't claimed their place yet`, html };
}

// 16g — Refunded (to the giver): they cancelled, chose a refund, or didn't choose in 7 days.
function shoutRefunded(p: AttendeeEmailPayload) {
  const to = esc(p.shoutTo ?? "your mate");
  const why =
    p.shoutWhy === "giver" ? `You've cancelled ${to}'s place at <strong>${esc(p.sessionTitle)}</strong>.${p.shoutDeliver === "link" ? " The gift link won't work any more." : ""}` :
    p.shoutWhy === "expired" ? `We called off <strong>${esc(p.sessionTitle)}</strong> a week ago, so we've refunded ${to}'s place.` :
    `Here's your refund for ${to}'s place at <strong>${esc(p.sessionTitle)}</strong>.`;
  const html = page("cream", (sc) => `
    ${h1(sc, "Refunded. 💛")}${hey(sc, esc(p.name))}${msg(sc, why)}${p.shoutRefund ? card(sc, `${cardLabel(sc, "Back to your card")}${display(sc, esc(p.shoutRefund), 32, "0 0 4px")}<p style="margin:0;font-size:13px;color:${sc.text};">Refunded in full. It can take a few days to show.</p>`) : ""}${filledButton(sc, `${APP_URL}/sessions`, "What's on")}${signOff(sc, "Hope to see you soon")}
  `);
  return { subject: `Refunded — ${p.shoutTo ?? "your mate"}'s place at ${p.sessionTitle}`, html };
}

// 17 — Meet your Stretchy Buddy (at 36 hrs out, once it's going ahead). SOCIAL_BOOKING_BRIEF.md 6.
function buddyIntro(p: AttendeeEmailPayload) {
  const buddies = p.buddies ?? [];
  const manage = p.sessionId ? `${APP_URL}/hold/${p.sessionId}` : `${APP_URL}/sessions`;
  const html = page("blue", (sc) => `
    ${h1(sc, "Meet your Stretchy Buddy. 👋")}${hey(sc, esc(p.name))}${msg(sc, `${esc(p.sessionTitle)} is on. ${buddies.length > 1 ? "Your buddies are" : "Your buddy is"}`)}${card(sc, buddies.map((b, i) => `${display(sc, esc(b.name), 22, b.hello ? "0 0 12px" : "0", true)}${b.hello ? quote(sc, b.hello) : ""}`).join(`<div style="height:14px"></div>`))}${msg(sc, "👀 Look out for each other, then grab a ☕ at the Social Stretch.")}${card(sc, `<p style="margin:0;font-size:13px;line-height:1.5;color:${sc.text};">🔒 We only shared first names and Say hello lines. Want to stay in touch? Connect in person, the old fashioned way.<br>Uneven numbers? Some of you are in a small group instead of a pair.</p>`)}${pillRow(sc, [
      { href: `${manage}?buddy=1`, text: "Change my hello" },
      { href: `${manage}?buddy=off`, text: "Turn off buddy" },
      { href: `mailto:hello@stretchyyoga.co.nz?subject=${encodeURIComponent("Stretchy Buddy: something's not right")}`, text: "Something not right?" },
    ], "0 0 4px")}${signOff(sc)}
  `);
  return { subject: "Meet your Stretchy Buddy 👋", html };
}

// 18 — Only one buddy-upper (at 36 hrs out). SOCIAL_BOOKING_BRIEF.md 6.
function buddySolo(p: AttendeeEmailPayload) {
  const manage = p.sessionId ? `${APP_URL}/hold/${p.sessionId}` : `${APP_URL}/sessions`;
  const html = page("blue", (sc) => `
    ${h1(sc, "Just you this time. 👋")}${hey(sc, esc(p.name))}${msg(sc, `${esc(p.sessionTitle)} is on. You're our only buddy-upper this time, so we'll pair you up next time.`)}${msg(sc, "If someone else switches on Buddy me up before joining closes, we'll match you up and let you know.")}${msg(sc, "👋 Say kia ora to your teacher and GEM. They'll look after you.")}${pillRow(sc, [
      { href: manage, text: "Manage my booking" },
      { href: `${manage}?buddy=off`, text: "Turn off buddy" },
    ], "0 0 4px")}${signOff(sc)}
  `);
  return { subject: "Buddy me up: just you this time", html };
}

export function renderAttendeeEmail(type: AttendeeEmailType, p: AttendeeEmailPayload): { subject: string; html: string } {
  currentFooter = footerFor(type, p);
  try {
    return renderBody(type, p);
  } finally {
    currentFooter = undefined;
  }
}

function renderBody(type: AttendeeEmailType, p: AttendeeEmailPayload): { subject: string; html: string } {
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
    case "first_stretchy_followup": return firstStretchyFollowUp(p, c);
    case "card_confirm_failed": return cardConfirmFailed(p, c);
    case "card_confirm_reminder": return cardConfirmReminder(p, c);
    case "card_place_released": return cardPlaceReleased(p, c);
    case "shout_sent": return shoutSent(p, c);
    case "shout_received": return shoutReceived(p, c);
    case "shout_claimed": return shoutClaimed(p, c);
    case "shout_final": return shoutFinal(p);
    case "shout_called_off": return shoutCalledOff(p, c);
    case "shout_released": return shoutReleased(p, c);
    case "shout_unclaimed_nudge": return shoutUnclaimedNudge(p, c);
    case "shout_refunded": return shoutRefunded(p);
    case "buddy_intro": return buddyIntro(p);
    case "buddy_solo": return buddySolo(p);
  }
}
