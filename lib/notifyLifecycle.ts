import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { sendPushToUser } from "@/lib/push-server";
import { HQ_EMAIL, REPLY_TO, APP_URL, page, box, label, button, h1, hey, msg, row } from "@/lib/stretchy-email";

// ─────────────────────────────────────────────────────────────────────────────
// LIFECYCLE NOTIFICATIONS — teacher / GEM / Stretchy HQ
//
// Uses the same design system as the attendee emails (lib/stretchy-email), and
// colour-matched to the attendee stage: recruit = purple (like the 38h nudge),
// confirmed = olive (like "going ahead"), cancelled = cream (like "not this
// time"), HQ "starting soon" = orange (like the 2h email). Fire-and-forget.
// ─────────────────────────────────────────────────────────────────────────────

const HQ_FROM = "Stretchy HQ <hello@stretchy.social>";

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export interface LifecycleSession {
  id: string;
  title: string;
  startsAt: string;
  locationName: string;
}

function fmtDate(startsAt: string): string {
  const d = new Date(startsAt);
  return (
    d.toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "long", day: "numeric", month: "long" }) +
    " at " +
    d.toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit", hour12: true })
  );
}

async function getHost(hostId: string): Promise<{ name: string; email: string | null; auth_user_id: string | null } | null> {
  const { data } = await getAdmin().from("hosts").select("name, email, auth_user_id").eq("id", hostId).single();
  return data ?? null;
}

function roleWord(role: "teacher" | "gem"): string {
  return role === "teacher" ? "teaching" : "GEM-ing";
}

async function sendHostEmail(to: string, subject: string, html: string, bcc?: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails
    .send({ from: HQ_FROM, to, reply_to: REPLY_TO, subject, html, ...(bcc ? { bcc } : {}) })
    .catch((e) => console.error("host email error:", e));
}

// ── HQ digest (internal, to Kimberley) ─────────────────────────────────────────
export async function notifyHQ(opts: {
  subject: string;
  scheme?: string;
  kicker: string;
  heading: string;
  rows: string[];
  cta?: { href: string; text: string };
}): Promise<void> {
  try {
    const html = page(
      opts.scheme ?? "cream",
      (sc) => `
        ${label(sc, opts.kicker)}
        ${h1(sc, opts.heading)}
        ${box(sc, opts.rows.map((l) => row(sc, l)).join(""))}
        ${opts.cta ? button(sc, opts.cta.href, opts.cta.text) : ""}
      `,
      { highlight: false }
    );
    await sendHostEmail(HQ_EMAIL, opts.subject, html);
  } catch (e) {
    console.error("notifyHQ error:", e);
  }
}

// ── Teacher/GEM: session confirmed (olive) ─────────────────────────────────────
export async function notifyHostConfirmed({
  hostId,
  role,
  session,
  gemName,
  style,
}: {
  hostId: string;
  role: "teacher" | "gem";
  session: LifecycleSession;
  gemName?: string;
  style?: string;
}): Promise<void> {
  try {
    const host = await getHost(hostId);
    if (!host || !host.email || host.email === HQ_EMAIL) return;
    const firstName = host.name?.split(" ")[0] ?? "there";
    const dateStr = fmtDate(session.startsAt);
    const runSheet = `${APP_URL}/host/session/${session.id}/run-sheet`;
    const html = page("olive", (sc) => `
      ${label(sc, "Stretchy HQ · Confirmed")}
      ${h1(sc, "It's on. ✅")}
      ${hey(sc, firstName)}
      ${msg(sc, `Good news — this one hit its minimum and is going ahead. You're confirmed for ${roleWord(role)} it.`)}
      ${box(sc, `${label(sc, "The session")}${row(sc, `<strong>${session.title}</strong>`)}${row(sc, `🗓 ${dateStr}`)}${row(sc, `📍 ${session.locationName}`)}${style ? row(sc, `🧘 ${style}`) : ""}${gemName && role === "teacher" ? row(sc, `💫 GEM on the day: ${gemName}`) : ""}`)}
      ${button(sc, runSheet, "Open your run sheet →")}
      ${msg(sc, "Any issues, let Kimberley know 💛")}
    `);
    await sendHostEmail(host.email, `It's on: ${session.title}`, html, HQ_EMAIL);
    if (host.auth_user_id) {
      sendPushToUser(host.auth_user_id, {
        title: "It's on ✅",
        body: `${session.title} is confirmed — you're ${role === "teacher" ? "teaching" : "on GEM"}.`,
        url: "/host/home",
        requireInteraction: true,
      }).catch((e) => console.error("notifyHostConfirmed push error:", e));
    }
  } catch (e) {
    console.error("notifyHostConfirmed error:", e);
  }
}

// ── Teacher/GEM: 38h "help fill it" (purple) ───────────────────────────────────
export async function notifyHostRecruit({
  hostId,
  role,
  session,
  needed,
  shareUrl,
  style,
}: {
  hostId: string;
  role: "teacher" | "gem";
  session: LifecycleSession;
  needed: number;
  shareUrl: string;
  style?: string;
}): Promise<void> {
  try {
    const host = await getHost(hostId);
    if (!host || !host.email || host.email === HQ_EMAIL) return;
    const firstName = host.name?.split(" ")[0] ?? "there";
    const dateStr = fmtDate(session.startsAt);
    const needLine = `${needed} more ${needed === 1 ? "person" : "people"}`;
    const html = page("purple", (sc) => `
      ${label(sc, "Stretchy HQ · Nearly there")}
      ${h1(sc, "So close. 👀")}
      ${hey(sc, firstName)}
      ${msg(sc, `The one you're ${roleWord(role)} is <strong>${needLine}</strong> short, and the 36-hour decision is about 2 hours away.`)}
      ${msg(sc, "If you can share it with anyone who'd come, now's the moment. Stretching bodies, minds and social circles works best when we're all together — the more who move, the better it gets. 🌞")}
      ${box(sc, `${label(sc, "The session")}${row(sc, `<strong>${session.title}</strong>`)}${row(sc, `🗓 ${dateStr}`)}${row(sc, `📍 ${session.locationName}`)}${style ? row(sc, `🧘 ${style}`) : ""}`)}
      ${button(sc, shareUrl, "Share this Stretchy →")}
    `);
    await sendHostEmail(host.email, `Nearly there: ${session.title} needs ${needed} more`, html);
    if (host.auth_user_id) {
      sendPushToUser(host.auth_user_id, {
        title: `${needed} more and it's on`,
        body: `${session.title} — share it, decision in ~2h.`,
        url: "/host/home",
      }).catch((e) => console.error("notifyHostRecruit push error:", e));
    }
  } catch (e) {
    console.error("notifyHostRecruit error:", e);
  }
}
