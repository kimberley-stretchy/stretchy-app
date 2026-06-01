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
  const uid = `${Date.now()}@stretchy.social`;
  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const start = toGCalDate(event.startISO);
  const end   = toGCalDate(event.endISO);
  const desc  = (event.description ?? "See you there — and stick around for the Social Stretch after.").replace(/\n/g, "\\n");

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
    `SUMMARY:${event.title}`,
    `LOCATION:${event.location}`,
    `DESCRIPTION:${desc}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
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
