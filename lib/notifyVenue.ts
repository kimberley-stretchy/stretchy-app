import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildIcsContent, googleCalendarUrl, type CalendarEvent } from "@/lib/calendar";
import { REPLY_TO, HQ_EMAIL, page, box, label, button, h1, msg, row } from "@/lib/stretchy-email";
import { logEmail } from "@/lib/emailLog";
import { formatDay, formatTime } from "@/lib/sessionTimes";

// ─────────────────────────────────────────────────────────────────────────────
// Keeping a session's two venues in the loop.
//
// Each session can have a contact email for the yoga venue and one for the
// Social Stretch venue (they're different places). Each gets:
//   • a "pencilled in" email with a calendar hold for THEIR part — the class
//     for the yoga venue, the hour after it for the Social Stretch venue —
//     once, when the session is live and their email is on it;
//   • "it's going ahead" with numbers, or "called off", at 36 hours out
//     (or whenever HQ cancels).
// HQ is copied on every one. Nothing here throws: a venue email must never get
// in the way of saving a session or confirming it.
// ─────────────────────────────────────────────────────────────────────────────

const FROM = "Stretchy HQ <hello@stretchyyoga.co.nz>";
const SOCIAL_MINUTES = 60; // how long we hold the Social Stretch venue for
const isEmail = (v: unknown): v is string => typeof v === "string" && /^\S+@\S+\.\S+$/.test(v.trim());
const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

type Which = "venue" | "social";
type SessionRow = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** The times, place and wording for one venue's part of a session. */
export function venuePart(s: SessionRow, which: Which) {
  const classStart = new Date(s.starts_at);
  const classEnd = s.ends_at ? new Date(s.ends_at) : new Date(classStart.getTime() + (s.duration_mins ?? 60) * 60_000);
  const start = which === "venue" ? classStart : classEnd;
  const end = which === "venue" ? classEnd : new Date(classEnd.getTime() + SOCIAL_MINUTES * 60_000);
  const place = which === "venue" ? s.location_name : (s.social_stretch_venue ?? "").split("·")[0].trim();
  const when = `${formatDay(start)}, ${formatTime(start)}–${formatTime(end)}`;
  const what = which === "venue" ? "Stretchy session" : "Stretchy Social Stretch";
  const event: CalendarEvent = {
    title: `${what}${place ? ` at ${place}` : ""}`,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
    location: which === "venue" ? [s.location_name, s.location_address].filter(Boolean).join(", ") : place,
    description: [
      which === "venue"
        ? `Stretchy session: ${s.title}${s.description ? ` (${s.description})` : ""}.`
        : `The group heads to you after ${s.title} for the Social Stretch.`,
      `${s.min_attendees} people needed for it to go ahead, ${s.max_attendees} at most.`,
      "Stretchy confirms 36 hours before, either way.",
      "Questions: kimberley@stretchyyoga.co.nz",
    ].join("\n"),
    uid: `${s.id}-${which}`,
  };
  return { place, when, what, event };
}

async function send(o: { to: string; subject: string; html: string; sessionId: string; type: string; ics?: { name: string; content: string } }) {
  if (!process.env.RESEND_API_KEY) return { error: "RESEND_API_KEY missing" };
  const r = await new Resend(process.env.RESEND_API_KEY).emails
    .send({
      from: FROM,
      to: o.to,
      bcc: HQ_EMAIL,
      reply_to: REPLY_TO,
      subject: o.subject,
      html: o.html,
      ...(o.ics ? { attachments: [{ filename: o.ics.name, content: Buffer.from(o.ics.content).toString("base64") }] } : {}),
    })
    .catch((e) => ({ data: null, error: e }));
  await logEmail({ sessionId: o.sessionId, recipient: o.to, emailType: o.type, subject: o.subject, resendId: r.data?.id ?? null, status: r.error ? "error" : "sent", error: r.error ? String((r.error as { message?: string }).message ?? r.error) : null });
  return r;
}

/** The "pencilled in" email (or "it's on", if the session is already going ahead). */
export function renderVenueHold(s: SessionRow, which: Which, held: number) {
  const p = venuePart(s, which);
  const goingAhead = s.state === "confirmed" || s.state === "locked";
  const subject = `${goingAhead ? "Going ahead" : "Pencilled in"}: ${p.what} — ${p.when}`;
  const html = page("cream", (sc) => `
    ${label(sc, `Stretchy HQ · ${which === "venue" ? "Venue" : "Social Stretch venue"}`)}
    ${h1(sc, goingAhead ? "It’s going ahead. 🎉" : "Pencilled in. 🗓")}
    ${msg(sc, "Kia ora,")}
    ${msg(sc, which === "venue"
      ? `Stretchy ${goingAhead ? "is running" : "has pencilled in"} a session at <strong>${esc(p.place)}</strong>. Here are the details, with a calendar hold attached.`
      : `After our session nearby, we’d love to bring the group to <strong>${esc(p.place)}</strong> for the Social Stretch. Here are the details, with a calendar hold attached.`)}
    ${box(sc, `${label(sc, which === "venue" ? "The session" : "The Social Stretch")}
      ${row(sc, `<strong>${esc(s.title)}</strong>`)}
      ${row(sc, `🗓 ${p.when}`)}
      ${row(sc, `📍 ${esc(p.event.location)}`)}
      ${row(sc, goingAhead
        ? `👥 ${held} booked so far, ${s.max_attendees} at most. People can join until 2 hours before.`
        : `👥 Goes ahead with ${s.min_attendees} people, ${s.max_attendees} at most.`)}`)}
    ${goingAhead ? "" : msg(sc, "<strong>We’ll confirm 36 hours before, either way</strong>, so you’re never left guessing.")}
    ${button(sc, googleCalendarUrl(p.event), "Add to Google Calendar →")}
    ${msg(sc, "Using Apple Calendar or Outlook? Open the attached file instead.")}
    ${msg(sc, "Anything we should know? Just reply to this email.")}
    ${msg(sc, "Ngā mihi,<br>Kimberley and the Stretchy team")}
  `, { highlight: false });
  return { subject, html, part: p };
}

/** "It's going ahead" / "Called off", at 36 hours out or when HQ cancels. */
export function renderVenueUpdate(s: SessionRow, which: Which, kind: "confirmed" | "cancelled", held: number) {
  const p = venuePart(s, which);
  const on = kind === "confirmed";
  const subject = `${on ? "Going ahead" : "Called off"}: ${p.what} — ${p.when}`;
  const html = page(on ? "olive" : "cream", (sc) => `
    ${label(sc, `Stretchy HQ · ${which === "venue" ? "Venue" : "Social Stretch venue"}`)}
    ${h1(sc, on ? "It’s going ahead. 🎉" : "Called off this time.")}
    ${msg(sc, "Kia ora,")}
    ${msg(sc, on
      ? `Good news: <strong>${esc(s.title)}</strong> is going ahead${which === "social" ? `, and we’ll be heading to <strong>${esc(p.place)}</strong> afterwards` : ` at <strong>${esc(p.place)}</strong>`}.`
      : `<strong>${esc(s.title)}</strong> isn’t going ahead this time, so please release the hold in your calendar. Thanks for pencilling us in, and we hope to be back soon.`)}
    ${box(sc, `${label(sc, on ? "The details" : "The hold to release")}
      ${row(sc, `🗓 ${p.when}`)}
      ${row(sc, `📍 ${esc(p.event.location)}`)}
      ${on ? row(sc, `👥 <strong>${held} booked so far</strong>, ${s.max_attendees} at most. People can join until 2 hours before, so the number may grow.`) : ""}`)}
    ${msg(sc, "Any questions? Just reply to this email.")}
    ${msg(sc, "Ngā mihi,<br>Kimberley and the Stretchy team")}
  `, { highlight: false });
  return { subject, html, part: p };
}

async function load(admin: SupabaseClient, sessionId: string): Promise<{ s: SessionRow; held: number } | null> {
  const [{ data: s }, { data: holds }] = await Promise.all([
    admin.from("sessions").select("*").eq("id", sessionId).maybeSingle(),
    admin.from("holds").select("quantity").eq("session_id", sessionId).eq("state", "active"),
  ]);
  if (!s) return null;
  return { s, held: (holds ?? []).reduce((n, h) => n + (h.quantity ?? 1), 0) };
}

const EMAIL_COL: Record<Which, string> = { venue: "venue_email", social: "social_venue_email" };
const INVITED_COL: Record<Which, string> = { venue: "venue_invited_email", social: "social_venue_invited_email" };

/**
 * Send the calendar hold to any venue contact that hasn't had one yet. Called
 * after a session is created or edited in HQ. Drafts and cancelled sessions
 * stay quiet. Returns who was sent one.
 */
export async function sendVenueHolds(admin: SupabaseClient, sessionId: string): Promise<Which[]> {
  const sent: Which[] = [];
  try {
    const loaded = await load(admin, sessionId);
    if (!loaded) return sent;
    const { s, held } = loaded;
    if (s.is_draft || s.state === "cancelled" || new Date(s.starts_at).getTime() < Date.now()) return sent;

    for (const which of ["venue", "social"] as Which[]) {
      const to = isEmail(s[EMAIL_COL[which]]) ? (s[EMAIL_COL[which]] as string).trim() : null;
      if (!to || to === s[INVITED_COL[which]]) continue;
      if (which === "social" && !s.social_stretch_venue) continue;
      const e = renderVenueHold(s, which, held);
      const r = await send({ to, subject: e.subject, html: e.html, sessionId, type: `venue_hold_${which}`, ics: { name: `stretchy-${which === "venue" ? "session" : "social-stretch"}.ics`, content: buildIcsContent(e.part.event) } });
      if (!r.error) {
        await admin.from("sessions").update({ [INVITED_COL[which]]: to }).eq("id", sessionId);
        sent.push(which);
      }
    }
  } catch (e) {
    console.error("sendVenueHolds error:", e);
  }
  return sent;
}

/** Tell both venues the session is going ahead, or called off. */
export async function notifyVenues(admin: SupabaseClient, sessionId: string, kind: "confirmed" | "cancelled", heldBefore?: number): Promise<void> {
  try {
    const loaded = await load(admin, sessionId);
    if (!loaded) return;
    const { s } = loaded;
    const held = heldBefore ?? loaded.held;
    for (const which of ["venue", "social"] as Which[]) {
      const to = isEmail(s[EMAIL_COL[which]]) ? (s[EMAIL_COL[which]] as string).trim() : null;
      if (!to) continue;
      if (which === "social" && !s.social_stretch_venue) continue;
      const e = renderVenueUpdate(s, which, kind, held);
      await send({ to, subject: e.subject, html: e.html, sessionId, type: `venue_${kind}_${which}` });
    }
  } catch (e) {
    console.error("notifyVenues error:", e);
  }
}
