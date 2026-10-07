/**
 * Calendar link utilities — no API key needed.
 * Pass ISO 8601 date strings (e.g. "2026-06-08T09:00:00+12:00")
 */

export interface CalendarEvent {
  title: string;
  startISO: string;   // e.g. "2026-06-08T09:00:00+12:00"
  endISO: string;     // e.g. "2026-06-08T10:00:00+12:00"
  location: string;   // venue address
  description?: string;
  uid?: string;       // stable id so re-sent invites update instead of duplicating
}

export type SessionForCalendar = {
  id?: string;
  title: string;            // e.g. "Herne Bay | Morning"
  starts_at: string;
  ends_at: string;
  location_name: string;
  location_address?: string | null;
  description?: string | null;  // style, e.g. "Vinyasa · all levels"
  getting_there?: string | null;
  what_to_bring?: string[] | null;
  social_stretch_venue?: string | null;
  social_stretch_note?: string | null;
};

const APP_URL = "https://www.stretchyyoga.co.nz";

function nzTime(iso: string) {
  return new Date(iso)
    .toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit", hour12: true })
    .replace(/\s/g, "")
    .toLowerCase();
}

/**
 * One calendar event for a session, used by every invite (teacher/GEM
 * "You're scheduled" emails and the attendee's Add-to-calendar buttons) so
 * they all carry the same details: area, full address, yoga time, teacher, GEM.
 */
export function sessionCalendarEvent(
  s: SessionForCalendar,
  people: { teacherName?: string | null; gemName?: string | null; uidSuffix?: string } = {}
): CalendarEvent {
  const area = s.title.split("|")[0].trim() || s.location_name;
  const address = s.location_address?.trim();
  const location = address && !address.toLowerCase().includes(s.location_name.toLowerCase())
    ? `${s.location_name}, ${address}`
    : address || s.location_name;
  const social = s.social_stretch_venue
    ? [s.social_stretch_venue, s.social_stretch_note].filter(Boolean).join(" — ")
    : null;

  const lines = [
    `Yoga: ${nzTime(s.starts_at)}–${nzTime(s.ends_at)}${s.description ? ` · ${s.description}` : ""}`,
    `Teacher: ${people.teacherName || "To be confirmed"}`,
    `GEM: ${people.gemName || "GEM to come"}`,
    `Where: ${location}`,
    s.getting_there ? `Getting there: ${s.getting_there}` : null,
    s.what_to_bring?.length ? `Bring: ${s.what_to_bring.join(", ")}` : null,
    social ? `Social Stretch: ${social}` : null,
    s.id ? `Session details: ${APP_URL}/sessions/${s.id}` : null,
  ].filter(Boolean);

  return {
    title: `Stretchy - ${area}`,
    startISO: s.starts_at,
    endISO: s.ends_at,
    location,
    description: lines.join("\n"),
    uid: s.id ? `${s.id}${people.uidSuffix ? `-${people.uidSuffix}` : ""}` : undefined,
  };
}

/** Escape text for an .ics property value (RFC 5545 §3.3.11). */
function icsText(v: string) {
  return v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Fold lines longer than 75 bytes, as calendar apps expect. */
function icsFold(line: string) {
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const b = new TextEncoder().encode(ch).length;
    if (bytes + b > (out.length ? 74 : 75)) { out.push(cur); cur = ""; bytes = 0; }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}

/** Convert ISO string to the compact format Google Calendar expects: YYYYMMDDTHHmmssZ */
function toGCalDate(iso: string) {
  const d = new Date(iso);
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

/** Google Calendar "Add to Calendar" URL */
export function googleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toGCalDate(event.startISO)}/${toGCalDate(event.endISO)}`,
    location: event.location,
    details: event.description ?? "See you there — and stick around for the Social Stretch after.",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Generate .ics file content for Apple Calendar / Outlook */
export function buildIcsContent(event: CalendarEvent): string {
  const uid = `${event.uid ?? Date.now()}@stretchyyoga.co.nz`;
  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const start = toGCalDate(event.startISO);
  const end   = toGCalDate(event.endISO);
  const desc  = event.description ?? "See you there — and stick around for the Social Stretch after.";

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Stretchy//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${icsText(event.title)}`,
    `LOCATION:${icsText(event.location)}`,
    `DESCRIPTION:${icsText(desc)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].map(icsFold).join("\r\n");
}

/** Trigger a browser download of a .ics file */
export function downloadIcs(event: CalendarEvent) {
  const content = buildIcsContent(event);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `${event.title.replace(/\s+/g, "-").toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
