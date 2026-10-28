import { Resend } from "resend";
import { page, h1, hey, msg, button, FROM, REPLY_TO, HQ_EMAIL } from "@/lib/stretchy-email";
import { logEmail } from "@/lib/emailLog";
import { LAUNCH_LINE, LINKS, NZ_VIBES } from "@/lib/australia";

// The Stretchy Australia waitlist emails: the welcome to the person, and a
// short alert to HQ with their answers. Copy agreed with Kimberley, Oct 2026.

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export type AuSignup = {
  name: string; email: string; sydney_areas: string[]; sydney_other?: string | null; times: string[];
  other_cities: string[]; other_city_note?: string | null; is_teacher: boolean; is_gem: boolean;
  team_tip?: string | null; venue_tip?: string | null; heard_from?: string | null; heard_group?: string | null;
  opt_in: boolean; state?: string | null;
};

export function renderAuWelcome(name: string): { subject: string; html: string } {
  const first = name && !name.includes("@") ? name.trim().split(" ")[0] : "there";
  const subject = "You’re on the Stretchy Sydney waitlist 🇦🇺";
  const html = page("orange", (sc) => `
    ${h1(sc, "You’re on the list. 🇦🇺")}
    ${hey(sc, esc(first))}
    ${msg(sc, `Thanks for joining the Stretchy Australia waitlist. We’re launching in Sydney soon (yes, this side of summer!), and your answers help us choose where and when the first sessions run.`)}
    ${msg(sc, `<strong>What Stretchy is:</strong> community yoga where the price drops as more people join. If enough people book, it’s on. Then there’s a Social Stretch after: coffee and good chats with the group.`)}
    ${msg(sc, "You’ll be first to hear about launch dates. Questions? Just reply to this email.")}
    ${button(sc, LINKS.auInstagram.href, `Follow ${LINKS.auInstagram.label}`)}
    ${msg(sc, `${NZ_VIBES} <a href="${LINKS.nzInstagram.href}" style="color:${sc.text};font-weight:800;">${LINKS.nzInstagram.label}</a> 🌿 · <a href="${LINKS.tiktok.href}" style="color:${sc.text};font-weight:700;">${LINKS.tiktok.label}</a>`)}
    <p style="color:${sc.text};font-size:15px;line-height:1.55;margin:0 0 22px;">Talk soon,<br>Kimberley and the Stretchy team</p>
  `, { highlight: false });
  return { subject, html };
}

function alertHtml(r: AuSignup): string {
  const rows: [string, string | null][] = [
    ["Sydney areas", [...r.sydney_areas, r.sydney_other ? `“${r.sydney_other}”` : ""].filter(Boolean).join(", ") || null],
    ["Times", r.times.join(", ") || null],
    ["Elsewhere in Australia", [...r.other_cities, r.other_city_note ? `“${r.other_city_note}”` : ""].filter(Boolean).join(", ") || null],
    ["Teaches", r.is_teacher ? "Yes" : null],
    ["Wants to be a GEM", r.is_gem ? "Yes" : null],
    ["Knows a teacher or GEM", r.team_tip ?? null],
    ["Knows a location", r.venue_tip ?? null],
    ["Heard about us", r.heard_from ? `${r.heard_from}${r.heard_group ? ` (${r.heard_group})` : ""}` : null],
    ["News opt-in", r.opt_in ? "Yes" : "No"],
    ["Visiting from", r.state ?? null],
  ];
  return `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:620px;margin:0 auto;padding:24px;background:#F7F0E8;border-radius:16px;color:#14110F">
    <p style="font-family:monospace;font-size:11px;letter-spacing:.12em;margin:0 0 6px">STRETCHY AUSTRALIA · WAITLIST</p>
    <h1 style="font-size:24px;margin:0 0 6px">${esc(r.name)}</h1>
    <p style="margin:0 0 16px"><a href="mailto:${esc(r.email)}" style="color:#14110F">${esc(r.email)}</a></p>
    <table style="border-collapse:collapse">${rows.filter(([, v]) => v).map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;font-family:monospace;font-size:12px;vertical-align:top;color:#555;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0;font-size:14px">${esc(v!)}</td></tr>`).join("")}</table>
    <p style="margin:18px 0 0;font-size:13px">Everyone, with tallies: https://www.stretchyyoga.co.nz/admin/australia</p>
  </div>`;
}

async function send(o: { to: string; subject: string; html: string; type: string; replyTo?: string }) {
  if (!process.env.RESEND_API_KEY) return;
  const r = await new Resend(process.env.RESEND_API_KEY).emails
    .send({ from: FROM, to: o.to, reply_to: o.replyTo ?? REPLY_TO, subject: o.subject, html: o.html })
    .catch((e) => ({ data: null, error: e }));
  await logEmail({ recipient: o.to, emailType: o.type, subject: o.subject, resendId: r.data?.id ?? null, status: r.error ? "error" : "sent", error: r.error ? String((r.error as { message?: string }).message ?? r.error) : null });
}

/** Welcome to the person + alert to HQ. Never throws. */
export async function sendAuWaitlistEmails(r: AuSignup): Promise<void> {
  const w = renderAuWelcome(r.name);
  await Promise.allSettled([
    send({ to: r.email, subject: w.subject, html: w.html, type: "au_waitlist_welcome" }),
    send({ to: HQ_EMAIL, subject: `New Sydney waitlist: ${r.name}${r.is_teacher ? " · teacher" : ""}${r.is_gem ? " · GEM" : ""}`, html: alertHtml(r), type: "au_waitlist_alert", replyTo: r.email }),
  ]);
}
