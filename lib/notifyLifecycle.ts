import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { sendPushToUser } from "@/lib/push-server";
import { HQ_EMAIL, APP_URL, REPLY_TO } from "@/lib/stretchy-email";

// ─────────────────────────────────────────────────────────────────────────────
// LIFECYCLE NOTIFICATIONS — teacher / GEM / Stretchy HQ
//
// The attendee-facing emails live in lib/stretchy-email.ts. This module covers
// everyone *running* the session: the assigned teacher, the GEM, and HQ
// (Kimberley). Every function here is fire-and-forget — it never throws and
// never blocks the caller — matching notifyHostScheduled / notifyHostCancelled.
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

// Small on-brand HQ email shell.
function hqShell(label: string, accent: string, heading: string, rows: string[], cta?: { href: string; text: string }): string {
  return `
    <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;background:#F7F0E8;padding:32px;border-radius:16px;">
      <p style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:800;letter-spacing:.14em;color:${accent};margin:0 0 12px;">${label}</p>
      <h1 style="font-size:24px;font-weight:900;color:#14110F;margin:0 0 16px;">${heading}</h1>
      ${rows
        .map(
          (r) =>
            `<p style="color:rgba(20,17,15,.75);font-size:14px;margin:0 0 8px;line-height:1.5;">${r}</p>`
        )
        .join("")}
      ${
        cta
          ? `<a href="${cta.href}" style="display:inline-block;margin-top:12px;background:#14110F;color:#F7F0E8;text-decoration:none;font-size:13px;font-weight:700;padding:12px 22px;border-radius:999px;">${cta.text}</a>`
          : ""
      }
    </div>
  `;
}

// Generic HQ (Kimberley) heads-up email.
export async function notifyHQ(opts: {
  subject: string;
  label: string;
  accent?: string;
  heading: string;
  rows: string[];
  cta?: { href: string; text: string };
}): Promise<void> {
  try {
    if (!process.env.RESEND_API_KEY) return;
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails
      .send({
        from: HQ_FROM,
        to: HQ_EMAIL,
        reply_to: REPLY_TO,
        subject: opts.subject,
        html: hqShell(opts.label, opts.accent ?? "#902F8A", opts.heading, opts.rows, opts.cta),
        text: `${opts.heading}\n\n${opts.rows.join("\n")}${opts.cta ? `\n\n${opts.cta.text}: ${opts.cta.href}` : ""}`,
      })
      .catch((e) => console.error("notifyHQ email error:", e));
  } catch (e) {
    console.error("notifyHQ error:", e);
  }
}

// Teacher/GEM: the session hit its minimum and is going ahead.
export async function notifyHostConfirmed({
  hostId,
  role,
  session,
}: {
  hostId: string;
  role: "teacher" | "gem";
  session: LifecycleSession;
}): Promise<void> {
  try {
    const host = await getHost(hostId);
    if (!host || !host.email || host.email === HQ_EMAIL) return; // skip the HQ placeholder host
    const firstName = host.name?.split(" ")[0] ?? "there";
    const dateStr = fmtDate(session.startsAt);

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails
        .send({
          from: HQ_FROM,
          to: host.email,
          bcc: HQ_EMAIL,
          reply_to: REPLY_TO,
          subject: `It's on: ${session.title}`,
          text: `Hi ${firstName},\n\nGood news — ${session.title} (${dateStr}, ${session.locationName}) hit its minimum and is going ahead. You're confirmed for ${roleWord(role)} it.\n\nYour run sheet: ${APP_URL}/host/session/${session.id}/run-sheet\n\nStretchy HQ`,
          html: hqShell(
            "STRETCHY HQ · CONFIRMED ✅",
            "#716F39",
            session.title,
            [
              `Hi ${firstName} — good news, this one hit its minimum and is <strong>going ahead</strong>. You're confirmed for ${roleWord(role)} it.`,
              `🗓 ${dateStr}`,
              `📍 ${session.locationName}`,
              `Any issues, let Kimberley know 💛`,
            ],
            { href: `${APP_URL}/host/session/${session.id}/run-sheet`, text: "Open your run sheet →" }
          ),
        })
        .catch((e) => console.error("notifyHostConfirmed email error:", e));
    }

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

// Teacher/GEM: 38h "help fill it" heads-up — their session is short with ~2h to
// the decision. Nudges them to share it around before it's called off.
export async function notifyHostRecruit({
  hostId,
  role,
  session,
  needed,
  shareUrl,
}: {
  hostId: string;
  role: "teacher" | "gem";
  session: LifecycleSession;
  needed: number;
  shareUrl: string;
}): Promise<void> {
  try {
    const host = await getHost(hostId);
    if (!host || !host.email || host.email === HQ_EMAIL) return;
    const firstName = host.name?.split(" ")[0] ?? "there";
    const dateStr = fmtDate(session.startsAt);
    const needLine = `${needed} more ${needed === 1 ? "person" : "people"}`;

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails
        .send({
          from: HQ_FROM,
          to: host.email,
          reply_to: REPLY_TO,
          subject: `Nearly there: ${session.title} needs ${needed} more`,
          text: `Hi ${firstName},\n\n${session.title} (${dateStr}, ${session.locationName}) that you're ${roleWord(role)} needs ${needLine} to lock in — and the 36h decision is about 2 hours away. If you can share it with anyone who'd come, now's the moment.\n\nShare: ${shareUrl}\n\nStretchy HQ`,
          html: hqShell(
            "STRETCHY HQ · NEARLY THERE",
            "#902F8A",
            `${session.title} needs ${needLine}`,
            [
              `Hi ${firstName} — the one you're ${roleWord(role)} is <strong>${needed}</strong> short, and the 36-hour decision is about 2 hours away.`,
              `If you can share it with anyone who'd come, now's the moment. Stretching bodies, minds and social circles works best when we're all together — the more who move, the better it gets. 🌞`,
              `🗓 ${dateStr}`,
              `📍 ${session.locationName}`,
            ],
            { href: shareUrl, text: "Share this Stretchy →" }
          ),
        })
        .catch((e) => console.error("notifyHostRecruit email error:", e));
    }

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

// Teacher/GEM: 2-hour reminder before the session starts.
export async function notifyHostReminder2h({
  hostId,
  role,
  session,
}: {
  hostId: string;
  role: "teacher" | "gem";
  session: LifecycleSession;
}): Promise<void> {
  try {
    const host = await getHost(hostId);
    if (!host || !host.email || host.email === HQ_EMAIL) return;
    const firstName = host.name?.split(" ")[0] ?? "there";
    const dateStr = fmtDate(session.startsAt);

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails
        .send({
          from: HQ_FROM,
          to: host.email,
          reply_to: REPLY_TO,
          subject: `Starting soon: ${session.title} 🧘`,
          text: `Hi ${firstName},\n\nYou're on in about 2 hours — ${session.title}, ${dateStr}, ${session.locationName}. You're ${roleWord(role)} this one.\n\nYour run sheet: ${APP_URL}/host/session/${session.id}/run-sheet\n\nSee you there — Stretchy HQ`,
          html: hqShell(
            "STRETCHY HQ · STARTING SOON",
            "#902F8A",
            `${session.title} — in ~2 hours`,
            [
              `Hi ${firstName} — you're on in about 2 hours. You're ${roleWord(role)} this one.`,
              `🗓 ${dateStr}`,
              `📍 ${session.locationName}`,
            ],
            { href: `${APP_URL}/host/session/${session.id}/run-sheet`, text: "Open your run sheet →" }
          ),
        })
        .catch((e) => console.error("notifyHostReminder2h email error:", e));
    }

    if (host.auth_user_id) {
      sendPushToUser(host.auth_user_id, {
        title: "Starting in ~2 hours",
        body: `${session.title} — ${dateStr}`,
        url: `/host/session/${session.id}/run-sheet`,
        requireInteraction: true,
      }).catch((e) => console.error("notifyHostReminder2h push error:", e));
    }
  } catch (e) {
    console.error("notifyHostReminder2h error:", e);
  }
}
