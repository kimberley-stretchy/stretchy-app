import { renderAttendeeEmail } from "../lib/attendeeEmailTemplates";
const base = { to: "x@example.com", name: "Amelia", sessionTitle: "Herne Bay | Morning", date: "", sessionId: "s", startsAt: "2026-10-22T17:15:00Z", durationMins: 60, minAttendees: 14, maxAttendees: 30, costBase: 199.49, revenueTarget: 120, held: 6, sessionState: "open", spots: 1 };
for (const t of ["hold_confirmed", "comp_hold_confirmed", "session_going_ahead", "session_confirmed_open"] as const) console.log(renderAttendeeEmail(t, { ...base, sessionState: t.startsWith("session") ? "confirmed" : "open" }).subject);
console.log(renderAttendeeEmail("hold_confirmed", { ...base, startsAt: undefined }).subject, "  ← no date known: unchanged");
