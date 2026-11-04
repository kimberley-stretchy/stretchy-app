import type { SupabaseClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { page, h1, hey, msg, label, box, button, row, FROM, REPLY_TO, APP_URL } from "@/lib/stretchy-email";
import { logEmail } from "@/lib/emailLog";

// The "It's on" heads-up: HQ → Future sessions → Email heads-up. Tells the people
// who asked to hear about a suggested session that it's now on the schedule,
// pulling the real dates, times and Social Stretch from the sessions themselves. A
// "group" is every upcoming session with the same title (Ōrākei | Morning).
// The email log records who got which group, so nobody is told twice.

const NZ = "Pacific/Auckland";
const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const plain = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const tidy = (v: string | null | undefined) => (v ?? "").replace(/\s+/g, " ").trim();

type SessionRow = {
  id: string; title: string; starts_at: string; duration_mins: number | null; location_name: string | null;
  location_address: string | null; description: string | null; min_attendees: number;
  social_stretch_venue: string | null; social_stretch_note: string | null;
};
export type SessionGroup = { key: string; title: string; sessions: SessionRow[] };

/** The email log type for one group. */
export const headsUpType = (key: string) => `suggestion_heads_up_${key}`;

export async function upcomingGroups(admin: SupabaseClient): Promise<SessionGroup[]> {
  const { data } = await admin
    .from("sessions")
    .select("id, title, starts_at, duration_mins, location_name, location_address, description, min_attendees, social_stretch_venue, social_stretch_note")
    .in("state", ["open", "confirmed"])
    .eq("is_draft", false)
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(500);
  const groups = new Map<string, SessionGroup>();
  for (const s of (data ?? []) as SessionRow[]) {
    const title = tidy(s.title);
    const key = plain(title).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const g = groups.get(key) ?? { key, title, sessions: [] };
    g.sessions.push(s);
    groups.set(key, g);
  }
  return Array.from(groups.values());
}

/** Best guess at which sessions answer a suggestion, e.g. "Saint Heliers & Eastern Bays · Evening" → St Heliers | Evening. */
export function matchGroup(neighbourhood: string | null, time: string | null, groups: { key: string; title: string }[]): string | null {
  const place = plain(neighbourhood ?? "").replace(/\bsaint\b/g, "st");
  const when = plain(time ?? "");
  const wantsEvening = when.includes("evening");
  const wantsMorning = when.includes("morning") || when.includes("am");
  const timed = (g: { title: string }) => {
    const t = plain(g.title);
    if (wantsEvening) return t.includes("evening");
    if (wantsMorning) return t.includes("morning");
    return true;
  };
  const area = (g: { title: string }) => plain(g.title).split("|")[0].trim();
  return (
    groups.find((g) => timed(g) && place.includes(area(g)))?.key ??
    // Ōrākei and St Heliers are both in the Eastern Bays.
    (place.includes("eastern") ? groups.find((g) => timed(g) && ["orakei", "st heliers"].includes(area(g)))?.key : undefined) ??
    null
  );
}

function day(iso: string) {
  return new Date(iso).toLocaleDateString("en-NZ", { timeZone: NZ, weekday: "short", day: "numeric", month: "short" }).replace(",", "");
}
function time(iso: string) {
  return new Date(iso).toLocaleTimeString("en-NZ", { timeZone: NZ, hour: "numeric", minute: "2-digit", hour12: true }).replace(" ", "").toLowerCase();
}
function timeRange(s: SessionRow) {
  const end = new Date(new Date(s.starts_at).getTime() + (s.duration_mins ?? 60) * 60_000).toISOString();
  return `${time(s.starts_at).replace(/(am|pm)$/, "")}–${time(end)}`;
}
/** "next week", "this week", or the date itself. */
function startsPhrase(iso: string, now = new Date()) {
  const monday = (d: Date) => {
    const nz = new Date(d.toLocaleString("en-US", { timeZone: NZ }));
    nz.setHours(0, 0, 0, 0);
    nz.setDate(nz.getDate() - ((nz.getDay() + 6) % 7));
    return nz.getTime();
  };
  const weeks = Math.round((monday(new Date(iso)) - monday(now)) / (7 * 86_400_000));
  return weeks === 0 ? `this week (${day(iso)})` : weeks === 1 ? `next week (${day(iso)})` : `on ${day(iso)}`;
}
const SCHEMES: [string, string][] = [["herne", "purple"], ["orakei", "orange"], ["ponsonby", "dkblue"], ["heliers", "olive"]];

const SHOW = 6;

export function renderHeadsUp(g: SessionGroup, name?: string | null): { subject: string; html: string } {
  const first = g.sessions[0];
  const [where, when] = g.title.split("|").map((p) => p.trim());
  const plural = when ? `${when.toLowerCase()}s` : "sessions";
  const firstName = name && !name.includes("@") ? name.trim().split(" ")[0] : "there";
  const social = [tidy(first.social_stretch_venue), tidy(first.social_stretch_note)].filter(Boolean).join(" · ");
  const scheme = SCHEMES.find(([k]) => plain(where).includes(k))?.[1] ?? "orange";
  const subject = `From ${day(first.starts_at)}: ${where} ${plural} are on 🙌`;
  const more = g.sessions.length - SHOW;

  const html = page(scheme, (sc) => `
    ${h1(sc, "It’s happening. 🙌")}
    ${hey(sc, esc(firstName))}
    ${msg(sc, `You asked us to let you know if this one went ahead. Good news: <strong>${esc(where)} ${esc(plural)}</strong> are on the schedule, starting <strong>${esc(startsPhrase(first.starts_at))}</strong>.`)}
    ${button(sc, `${APP_URL}/sessions/${first.id}`, "Hold my place")}
    ${box(sc, `
      ${label(sc, "The schedule")}
      ${g.sessions.slice(0, SHOW).map((s) => row(sc, `<strong>${esc(day(s.starts_at))}</strong> · ${esc(timeRange(s))}`)).join("")}
      ${more > 0 ? row(sc, `<a href="${APP_URL}/sessions" style="color:${sc.text};font-weight:700;">+ ${more} more</a>`) : ""}
    `)}
    ${box(sc, `
      ${label(sc, "The details")}
      ${first.location_name ? row(sc, `<strong>Where:</strong> ${esc(tidy(first.location_name))}${first.location_address ? `, ${esc(tidy(first.location_address))}` : ""}`) : ""}
      ${first.description ? row(sc, `<strong>What:</strong> ${esc(tidy(first.description))}`) : ""}
      ${social ? row(sc, `<strong>Social Stretch after:</strong> ${esc(social)}`) : ""}
    `)}
    ${msg(sc, `Hold your place now and see <strong>people-powered pricing</strong> in action: the more who join, the better for everyone. So bring your mates!`)}    <p style="color:${sc.text};font-size:15px;line-height:1.55;margin:0 0 18px;">See you there,<br>The Stretchy team</p>
    <p style="color:${sc.text};font-size:12px;line-height:1.5;margin:0 0 6px;opacity:.8;">You’re getting this one-off email because you asked to hear if this session went ahead. Questions? Just reply.</p>
    <p style="font-size:12px;margin:0 0 6px;"><a href="${APP_URL}/#how-it-works" style="color:${sc.text};">How it works ↗</a> · <a href="${APP_URL}/terms#cancellation" style="color:${sc.text};">Cancellation policy ↗</a></p>
  `, { highlight: false });
  return { subject, html };
}

/** Sends one heads-up and logs it. Never throws. */
export async function sendHeadsUp(g: SessionGroup, to: string, name?: string | null, logType?: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) return false;
  const { subject, html } = renderHeadsUp(g, name);
  try {
    const { data, error } = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: FROM, to, reply_to: REPLY_TO, subject, html });
    await logEmail({ recipient: to, emailType: logType ?? headsUpType(g.key), subject, resendId: data?.id ?? null, status: error ? "error" : "sent", error: error ? (error as { message?: string }).message ?? String(error) : null });
    return !error;
  } catch (e) {
    console.error("Heads-up email error:", e);
    return false;
  }
}
