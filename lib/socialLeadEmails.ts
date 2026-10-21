import { Resend } from "resend";
import { page, h1, hey, msg, button, HQ_EMAIL, REPLY_TO } from "@/lib/stretchy-email";
import { logEmail } from "@/lib/emailLog";
import { TYPES, spendLabel, type LeadType, type Currency } from "@/lib/socialLeads";
import { RESEARCH_QUESTIONS } from "@/lib/socialResearch";

// The two stretchy.social emails (+ the hot-lead alert). Sent from the
// verified stretchyyoga.co.nz address until stretchy.social is verified in
// Resend; set STRETCHY_SOCIAL_FROM to switch (e.g. "Stretchy Social <hello@stretchy.social>").
const FROM = process.env.STRETCHY_SOCIAL_FROM || "Stretchy Social <hello@stretchyyoga.co.nz>";
const IG = "https://www.instagram.com/stretchy.yoga/";
// Lead alerts go to Stretchy HQ, copied to Kimberley's Studio Dawn inbox.
const ALERT_CC = "kimberley@studiodawn.org";
const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

type Row = Record<string, unknown> & { id: string; type: LeadType; name: string; email: string; organisation?: string | null };

const LABELS: Record<string, string> = {
  organisation: "Organisation", group_type: "Group", region: "City or region", country: "Country", group_size: "People per event",
  beta_start: "Could start testing", brings: "Brings", about: "About them", message: "Message", opt_in: "Opted in to updates",
  founding: "Founding sign-up (first 50)", stage: "Where they're at", frequency: "How often", access: "Who can come",
  pay_now: "How people pay now", current_tools: "Uses now", currency: "Currency", monthly_spend: "Monthly spend",
  takes_cut: "Tools take a cut", integrations: "Needs to connect to", headache: "Biggest headache", chat_ok: "Up for a chat",
  heard_from: "Heard about us from",
};

function rowsHtml(r: Row): string {
  return Object.entries(LABELS)
    .map(([k, label]) => {
      let v = r[k];
      if (v == null || v === "" || (Array.isArray(v) && v.length === 0)) return "";
      if (k === "monthly_spend") v = spendLabel(String(v), (r.currency as Currency) || "NZD");
      const text = Array.isArray(v) ? v.join(", ") : v === true ? "Yes" : v === false ? "No" : String(v);
      return `<tr><td style="padding:6px 12px 6px 0;font-family:monospace;font-size:12px;vertical-align:top;color:#555;white-space:nowrap">${esc(label)}</td><td style="padding:6px 0;font-size:14px">${esc(text)}</td></tr>`;
    })
    .join("");
}

async function send(o: { to: string; subject: string; html: string; type: string; replyTo?: string; cc?: string }) {
  if (!process.env.RESEND_API_KEY) return;
  const r = await new Resend(process.env.RESEND_API_KEY).emails
    .send({ from: FROM, to: o.to, ...(o.cc ? { cc: o.cc } : {}), reply_to: o.replyTo ?? REPLY_TO, subject: o.subject, html: o.html })
    .catch((e) => ({ data: null, error: e }));
  await logEmail({ recipient: o.to, emailType: o.type, subject: o.subject, resendId: r.data?.id ?? null, status: r.error ? "error" : "sent", error: r.error ? String((r.error as { message?: string }).message ?? r.error) : null });
}

/** To Kimberley (cc Studio Dawn), on every submission: "New Stretchy Social [type]: [name], [organisation]". */
export async function alertHQ(r: Row, opts: { step2?: boolean; hot?: boolean } = {}) {
  const who = [r.name, r.organisation].filter(Boolean).join(", ");
  const subject = opts.hot
    ? `🔥 Hot lead, Stretchy Social: ${who}`
    : opts.step2
      ? `Stretchy Social ${r.type}, extra answers: ${who}`
      : `New Stretchy Social ${r.type}: ${who}`;
  const html = `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:620px;margin:0 auto;padding:24px;background:#F7F1EA;border-radius:16px;color:#16110F">
    <p style="font-family:monospace;font-size:11px;letter-spacing:.12em;margin:0 0 6px">STRETCHY.SOCIAL · ${esc(TYPES[r.type].label.toUpperCase())}</p>
    <h1 style="font-size:24px;margin:0 0 6px">${esc(r.name)}</h1>
    <p style="margin:0 0 16px"><a href="mailto:${esc(r.email)}" style="color:#16110F">${esc(r.email)}</a></p>
    ${opts.hot ? `<p style="margin:0 0 16px;font-weight:700">Up for a 20-minute chat, and spends 150+ a month on event tools. Worth a call this week.</p>` : ""}
    <table style="border-collapse:collapse">${rowsHtml(r)}</table>
    <p style="margin:18px 0 0;font-size:13px">Reply to this email to answer them directly. All leads: https://www.stretchyyoga.co.nz/admin/social</p>
  </div>`;
  await send({ to: HQ_EMAIL, cc: ALERT_CC, subject, html, type: opts.hot ? "social_lead_hot" : "social_lead_alert", replyTo: r.email });
}

/** To the person: a short thanks for their button, what happens next, and Instagram. No marketing. */
export async function confirmToPerson(r: Row) {
  const t = TYPES[r.type];
  const first = r.name.trim().split(" ")[0] || "there";
  const html = page("cream", (sc) => `
    ${h1(sc, esc(t.thanksTitle))}
    ${hey(sc, esc(first))}
    ${msg(sc, `<strong>${esc(t.thanksAccent)}</strong>`)}
    ${msg(sc, esc(t.thanksBody.replace(" A confirmation is on its way to your inbox.", "")))}
    ${msg(sc, "Questions in the meantime? Just reply to this email.")}
    ${button(sc, IG, "Follow @stretchy.yoga")}
    <p style="color:${sc.text};font-size:15px;line-height:1.55;margin:0 0 22px;">Talk soon,<br>Kimberley and the Stretchy Social team</p>
  `, { highlight: false });
  await send({ to: r.email, subject: `${t.thanksTitle} · Stretchy Social`, html, type: `social_lead_confirm_${r.type}` });
}

/** To Kimberley (cc Studio Dawn), for each stretchy.social/research response. */
export async function alertResearch(r: { id: string; name?: string | null; organisation?: string | null; email?: string | null; website?: string | null; source?: string | null; answers: Record<string, string | string[]> }) {
  const who = [r.name, r.organisation].filter(Boolean).join(", ") || "anonymous";
  const subject = `New Stretchy Social research response: ${who}`;
  const rows = RESEARCH_QUESTIONS.map((q) => {
    const v = r.answers[q.k];
    const other = r.answers[`${q.k}_other`];
    if (!v || (Array.isArray(v) && v.length === 0)) return "";
    const answer = [Array.isArray(v) ? v.join(", ") : v, other ? `“${other}”` : ""].filter(Boolean).join(" · ");
    return `<tr><td style="padding:6px 12px 6px 0;font-family:monospace;font-size:12px;vertical-align:top;color:#555">${q.n}. ${esc(q.q)}</td><td style="padding:6px 0;font-size:14px;vertical-align:top">${esc(String(answer))}</td></tr>`;
  }).join("");
  const contact = [r.email ? `<a href="mailto:${esc(r.email)}" style="color:#16110F">${esc(r.email)}</a>` : "", r.website ? esc(r.website) : "", r.source ? `via ${esc(r.source)}` : ""].filter(Boolean).join(" · ");
  const html = `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:680px;margin:0 auto;padding:24px;background:#F7F1EA;border-radius:16px;color:#16110F">
    <p style="font-family:monospace;font-size:11px;letter-spacing:.12em;margin:0 0 6px">STRETCHY.SOCIAL · RESEARCH</p>
    <h1 style="font-size:24px;margin:0 0 6px">${esc(who)}</h1>
    ${contact ? `<p style="margin:0 0 16px">${contact}</p>` : ""}
    <table style="border-collapse:collapse">${rows}</table>
    <p style="margin:18px 0 0;font-size:13px">All responses, with tallies: https://www.stretchyyoga.co.nz/admin/social-research</p>
  </div>`;
  await send({ to: HQ_EMAIL, cc: ALERT_CC, subject, html, type: "social_research_alert", ...(r.email ? { replyTo: r.email } : {}) });
}
