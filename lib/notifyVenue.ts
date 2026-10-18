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
//
// Who to email: the contact typed on the session in HQ if there is one;
// otherwise the venue contact on file for that location in the Team portal
// (HQ → Team portal → Locations: the contact email, or else the venue email).
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

// "Ōrākei" → "orakei", so a session's area matches its Team portal location
// however it's spelt.
const plain = (v?: string | null) => (v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** The venue contacts on file for this session's location in the Team portal. */
async function portalContacts(admin: SupabaseClient, s: SessionRow): Promise<Record<Which, string | null>> {
  const none = { venue: null, social: null };
  const { data, error } = await admin
    .from("portal_locations")
    .select("name, yoga_contact_email, yoga_venue_email, social_contact_email, social_venue_email");
  if (error || !data) return none;
  const area = plain(String(s.title ?? "").split("|")[0]);
  const where = plain(`${s.location_name ?? ""} ${s.location_address ?? ""}`);
  const loc =
    data.find((l) => plain(l.name) && plain(l.name) === area) ??
    data.find((l) => plain(l.name) && (area.includes(plain(l.name)) || where.includes(plain(l.name))));
  if (!loc) return none;
  const pick = (...v: (string | null)[]) => v.map((x) => (x ?? "").trim()).find((x) => isEmail(x)) ?? null;
  return {
    venue: pick(loc.yoga_contact_email, loc.yoga_venue_email),
    social: pick(loc.social_contact_email, loc.social_venue_email),
  };
}

/** Who gets this venue's emails: the session's own contact, else the Team portal's. */
function contactFor(s: SessionRow, which: Which, portal: Record<Which, string | null>): string | null {
  const own = s[EMAIL_COL[which]];
  if (isEmail(own)) return own.trim().toLowerCase();
  return portal[which] ? portal[which]!.toLowerCase() : null;
}
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
    const portal = await portalContacts(admin, s);

    for (const which of ["venue", "social"] as Which[]) {
      const to = contactFor(s, which, portal);
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
    const portal = await portalContacts(admin, s);
    for (const which of ["venue", "social"] as Which[]) {
      const to = contactFor(s, which, portal);
      if (!to) continue;
      if (which === "social" && !s.social_stretch_venue) continue;
      const e = renderVenueUpdate(s, which, kind, held);
      // "Going ahead" carries the calendar entry again (same entry, so it
      // updates the pencilled-in one rather than adding a second).
      await send({
        to, subject: e.subject, html: e.html, sessionId, type: `venue_${kind}_${which}`,
        ...(kind === "confirmed" ? { ics: { name: `stretchy-${which === "venue" ? "session" : "social-stretch"}.ics`, content: buildIcsContent(e.part.event) } } : {}),
      });
    }
  } catch (e) {
    console.error("notifyVenues error:", e);
  }
}

/** How far ahead venues get their calendar hold, for sessions already in HQ. */
export const VENUE_HOLD_DAYS_AHEAD = 14;

/**
 * Run by the session-check job: every live session in the next two weeks
 * whose venues haven't had their hold yet gets one now. Each venue hears about
 * each session once (venue_invited_email / social_venue_invited_email), so
 * a weekly series arrives one week at a time rather than all at once.
 */
export async function sendUpcomingVenueHolds(admin: SupabaseClient, now: Date = new Date()): Promise<number> {
  let sent = 0;
  try {
    const { data } = await admin
      .from("sessions")
      .select("id")
      .in("state", ["open", "confirmed"])
      .not("is_draft", "is", true)
      .gt("starts_at", now.toISOString())
      .lte("starts_at", new Date(now.getTime() + VENUE_HOLD_DAYS_AHEAD * 86_400_000).toISOString());
    for (const row of data ?? []) sent += (await sendVenueHolds(admin, row.id)).length;
  } catch (e) {
    console.error("sendUpcomingVenueHolds error:", e);
  }
  return sent;
}

/** Read-only: who each venue email for a session would go to. For checks. */
export async function previewVenueRecipients(admin: SupabaseClient, sessionId: string) {
  const loaded = await load(admin, sessionId);
  if (!loaded) return null;
  const portal = await portalContacts(admin, loaded.s);
  return {
    venue: contactFor(loaded.s, "venue", portal),
    social: loaded.s.social_stretch_venue ? contactFor(loaded.s, "social", portal) : null,
    alreadyInvited: { venue: loaded.s.venue_invited_email ?? null, social: loaded.s.social_venue_invited_email ?? null },
  };
}
