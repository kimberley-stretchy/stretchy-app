// ─────────────────────────────────────────────────────────────────────────────
// Session timing — ONE place that works out a session's key moments and how to
// write dates and times, so no page or email ever does this by hand.
//
// Every Stretchy has two moments, both counted back from its start time:
//   36 hours out — go / no-go on the minimum; free cancelling ends
//    2 hours out — joining closes; the final price is charged
//
// All formatting is in New Zealand time (Pacific/Auckland) and is daylight-
// saving safe: it uses the real time zone, never a fixed +12 / +13 offset.
// See COPY_REFRESH_HANDOVER.md section 1 and STRETCHY_WORDS.md.
// ─────────────────────────────────────────────────────────────────────────────

const NZ = "Pacific/Auckland";
const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

export const GO_NO_GO_HOURS = 36;
export const FINAL_CHARGE_HOURS = 2;

type DateInput = string | number | Date;
const toDate = (d: DateInput) => (d instanceof Date ? d : new Date(d));

// ── Key moments ──────────────────────────────────────────────────────────────

/** The go / no-go moment: 36 hours before the session starts. */
export function goNoGo(startsAt: DateInput): Date {
  return new Date(toDate(startsAt).getTime() - GO_NO_GO_HOURS * HOUR);
}

/** When joining closes and the final price is charged: 2 hours before. */
export function finalCharge(startsAt: DateInput): Date {
  return new Date(toDate(startsAt).getTime() - FINAL_CHARGE_HOURS * HOUR);
}

/** When the session ends: start + its length in minutes (60 if not set). */
export function endsAt(startsAt: DateInput, durationMins?: number | null): Date {
  return new Date(toDate(startsAt).getTime() + (durationMins || 60) * MINUTE);
}

/** A time some minutes before the start, e.g. 10 → "park", 5 → "say kia ora". */
export function minutesBefore(startsAt: DateInput, minutes: number): Date {
  return new Date(toDate(startsAt).getTime() - minutes * MINUTE);
}

// ── Phase ────────────────────────────────────────────────────────────────────

/**
 * Where a session is in its life:
 *   before36  — more than 36 hrs out. Free to cancel.
 *   between   — 36 → 2 hrs out. Still room to join; no free cancelling.
 *   after2    — inside 2 hrs (or already started). Joining closed, price charged.
 *   cancelled — called off.
 */
export type SessionTimePhase = "before36" | "between" | "after2" | "cancelled";

export function phase(startsAt: DateInput, state?: string | null, now: DateInput = new Date()): SessionTimePhase {
  if (state === "cancelled") return "cancelled";
  const t = toDate(now).getTime();
  if (t >= finalCharge(startsAt).getTime()) return "after2";
  if (t >= goNoGo(startsAt).getTime()) return "between";
  return "before36";
}

// ── NZ formatters ────────────────────────────────────────────────────────────

function nzParts(d: DateInput) {
  const parts = new Intl.DateTimeFormat("en-NZ", {
    timeZone: NZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(toDate(d));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    weekday: get("weekday").replace(".", ""),
    day: get("day"),
    month: get("month").replace(".", ""),
    hour24: Number(get("hour")) % 24,
    minute: Number(get("minute")),
  };
}

function clock(hour24: number, minute: number) {
  const meridiem = hour24 < 12 ? "am" : "pm";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { text: `${hour12}:${String(minute).padStart(2, "0")}`, meridiem };
}

/** "Fri 23 Oct" */
export function formatDay(d: DateInput): string {
  const p = nzParts(d);
  return `${p.weekday} ${p.day} ${p.month}`;
}

/** "6:05am" */
export function formatTime(d: DateInput): string {
  const p = nzParts(d);
  const c = clock(p.hour24, p.minute);
  return `${c.text}${c.meridiem}`;
}

/**
 * "6:15–7:15am". When the start and end fall either side of midday the first
 * time keeps its own am/pm: "11:30am–12:30pm".
 */
export function formatTimeRange(startsAt: DateInput, durationMins?: number | null): string {
  const s = nzParts(startsAt);
  const e = nzParts(endsAt(startsAt, durationMins));
  const sc = clock(s.hour24, s.minute);
  const ec = clock(e.hour24, e.minute);
  return sc.meridiem === ec.meridiem
    ? `${sc.text}–${ec.text}${ec.meridiem}`
    : `${sc.text}${sc.meridiem}–${ec.text}${ec.meridiem}`;
}

/** "Fri 23 Oct, 6:15am" — only for the "you can't cancel now" message. */
export function formatDayTime(d: DateInput): string {
  return `${formatDay(d)}, ${formatTime(d)}`;
}

/**
 * The date at the very front of a confirmation email's subject line, so it
 * reads at a glance in an inbox: "Fri 23 Oct, 6:15am · ". Empty if unknown.
 */
export function subjectDate(startsAt?: DateInput | null): string {
  return startsAt ? `${formatDay(startsAt)}, ${formatTime(startsAt)} · ` : "";
}

/** "Fri 23 Oct | 6:15–7:15am" — the bold header line on booking boxes and emails. */
export function formatDayAndRange(startsAt: DateInput, durationMins?: number | null): string {
  return `${formatDay(startsAt)} | ${formatTimeRange(startsAt, durationMins)}`;
}

/**
 * How to say "when" on the day itself, from the session's NZ start time:
 *   before 12:00 → "this morning" · 12:00–17:00 → "today" · after 17:00 → "tonight"
 */
export function dayWord(startsAt: DateInput): "this morning" | "today" | "tonight" {
  const p = nzParts(startsAt);
  const mins = p.hour24 * 60 + p.minute;
  if (mins < 12 * 60) return "this morning";
  if (mins <= 17 * 60) return "today";
  return "tonight";
}

// ── Everything together ──────────────────────────────────────────────────────

/** All the timing a page or email needs for one session, worked out once. */
export function sessionTimes(
  session: { starts_at: DateInput; duration_mins?: number | null; state?: string | null },
  now: DateInput = new Date()
) {
  const start = toDate(session.starts_at);
  return {
    start,
    end: endsAt(start, session.duration_mins),
    goNoGo: goNoGo(start),
    finalCharge: finalCharge(start),
    phase: phase(start, session.state, now),
    day: formatDay(start),
    timeRange: formatTimeRange(start, session.duration_mins),
    dayAndRange: formatDayAndRange(start, session.duration_mins),
    startTime: formatTime(start),
    endTime: formatTime(endsAt(start, session.duration_mins)),
    parkTime: formatTime(minutesBefore(start, 10)),
    arriveTime: formatTime(minutesBefore(start, 5)),
    dayWord: dayWord(start),
  };
}
