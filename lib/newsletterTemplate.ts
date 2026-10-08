import { page, h1, msg, box, label, row, button, brandFooter, highlightBlock, APP_URL, SCHEMES, type Scheme } from "@/lib/stretchy-email";

// Branded marketing newsletter ("what's on at Stretchy"), built from the same
// design system as the transactional emails. Block-based so HQ can lay out text,
// imagery (curved frame + brand outline), brand dividers and live session cards
// in any order, in any brand colour.

export interface NewsletterSession {
  title: string;
  dateStr: string;
  venue?: string | null;
  url: string;
  going: number;
  min: number;
  price?: string | null;
  confirmed?: boolean;
}

export type NLBlock =
  | { type: "text"; text: string }
  | { type: "image"; url: string; frame?: "black" | "cream" }
  | { type: "divider"; line?: "ink" | "cream" }
  | { type: "button"; label: string; url: string }
  | { type: "sessions"; sessions: NewsletterSession[] };

export interface NewsletterInput {
  // Inbox preview line shown after the subject (a hidden "preheader").
  previewText?: string;
  // The button above the sign-off. Omitted = the default "See everything
  // that's on →" to /sessions; null = no button.
  closingButton?: { label: string; url: string } | null;
  subject: string;
  scheme?: string;
  heading?: string;
  blocks: NLBlock[];
  highlight?: boolean; // append the "Welcome to the highlight of your week" panel
}

function sessionBlock(sc: Scheme, s: NewsletterSession): string {
  const status = s.confirmed
    ? `✅ Going ahead — <strong>${s.going}</strong> coming`
    : s.going >= s.min
      ? `<strong>${s.going}</strong> coming — it's on`
      : `<strong>${s.going}</strong> in${s.going < s.min ? ` · needs ${s.min - s.going} more to go ahead` : ""}`;
  return box(sc, `${label(sc, "What's on")}
    ${row(sc, `<strong style="font-size:16px;">${s.title}</strong>`)}
    ${row(sc, `🗓 ${s.dateStr}`)}
    ${s.venue ? row(sc, `📍 ${s.venue}`) : ""}
    ${row(sc, `🙌 ${status}`)}
    ${s.price ? row(sc, `💸 From ${s.price} — drops as more join`) : ""}
    ${button(sc, s.url, "Grab a spot →")}`);
}

function imageBlock(sc: Scheme, url: string, frame: "black" | "cream"): string {
  const outline = frame === "cream" ? "#F7F0E8" : "#14110F";
  return `<div style="margin:0 0 18px;"><img src="${url}" alt="Stretchy" style="width:100%;display:block;border-radius:18px;border:3px solid ${outline};" /></div>`;
}

// Simple brand divider — a single black or cream line.
function dividerBlock(line: "ink" | "cream"): string {
  const color = line === "cream" ? "#F7F0E8" : "#14110F";
  return `<div style="border-top:2px solid ${color};margin:18px 0 24px;"></div>`;
}

// Text block formatting — simple markers HQ's toolbar inserts (or typed):
//   **bold**   *italic*   __underline__
//   ## Heading          (a line on its own → larger bold heading)
//   - bullet / • bullet (consecutive lines → a bulleted list)
// Blank line = new paragraph. Everything is HTML-escaped first, so only
// these markers produce formatting.
function inline(t: string): string {
  return t
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/__(.+?)__/g, "<u>$1</u>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*(?!\s)([^*]+?)\*(?!\*)/g, "$1<em>$2</em>");
}

function paras(sc: Scheme, text: string): string {
  const out: string[] = [];
  for (const chunk of text.split(/\n\s*\n+/)) {
    const lines = chunk.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim());
    let para: string[] = [];
    let list: string[] = [];
    const flushPara = () => { if (para.length) out.push(msg(sc, para.map(inline).join("<br>"))); para = []; };
    const flushList = () => {
      if (list.length) out.push(`<ul style="color:${sc.text};font-size:15px;line-height:1.55;margin:0 0 20px;padding-left:22px;">${list.map((l) => `<li style="margin:0 0 6px;">${inline(l)}</li>`).join("")}</ul>`);
      list = [];
    };
    for (const raw of lines) {
      const line = raw.trim();
      const heading = line.match(/^#{1,3}\s+(.*)$/);
      const bullet = line.match(/^(?:[-•*])\s+(.*)$/);
      if (heading) {
        flushPara(); flushList();
        out.push(`<h2 style="color:${sc.text};font-size:22px;font-weight:900;line-height:1.15;letter-spacing:-0.01em;margin:6px 0 12px;">${inline(heading[1])}</h2>`);
      } else if (bullet) {
        flushPara(); list.push(bullet[1]);
      } else {
        flushList(); para.push(line);
      }
    }
    flushPara(); flushList();
  }
  return out.join("");
}

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Only real web/email links; bare domains get https:// added. Anything else
// (javascript:, typos) renders no button rather than a broken one.
export function cleanLink(raw: string): string | null {
  const u = (raw ?? "").trim();
  if (!u) return null;
  if (/^mailto:[^\s@]+@[^\s@]+$/i.test(u)) return u;
  const withScheme = /^https?:\/\//i.test(u) ? u : /^[\w-]+(\.[\w-]+)+(\/|$)/.test(u) ? `https://${u}` : u.startsWith("/") ? `${APP_URL}${u}` : null;
  if (!withScheme) return null;
  try { return new URL(withScheme).toString(); } catch { return null; }
}

function linkButton(sc: Scheme, label: string, url: string): string {
  const href = cleanLink(url);
  const text = (label ?? "").trim();
  return href && text ? button(sc, esc(href), esc(text)) : "";
}

// Hidden first line of the email that inboxes show as the preview text after
// the subject. Padded with invisible spacers so the inbox doesn't pull in the
// email's body copy after it.
function preheader(text?: string): string {
  const t = (text ?? "").trim();
  if (!t) return "";
  const safe = t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${safe}${"&#847;&zwnj;&nbsp;".repeat(90)}</div>`;
}

export function buildNewsletter(p: NewsletterInput): { subject: string; html: string } {
  const schemeName = p.scheme && SCHEMES[p.scheme] ? p.scheme : "cream";

  const inner = (sc: Scheme) => `
    ${p.heading ? h1(sc, p.heading) : ""}
    ${(p.blocks ?? [])
      .map((b) => {
        if (b.type === "text") return paras(sc, b.text ?? "");
        if (b.type === "image") return b.url ? imageBlock(sc, b.url, b.frame ?? "black") : "";
        if (b.type === "divider") return dividerBlock(b.line === "cream" ? "cream" : "ink");
        if (b.type === "button") return linkButton(sc, b.label, b.url);
        if (b.type === "sessions") return (b.sessions ?? []).map((s) => sessionBlock(sc, s)).join("");
        return "";
      })
      .join("")}
    ${p.closingButton === null ? "" : p.closingButton ? linkButton(sc, p.closingButton.label, p.closingButton.url) : button(sc, `${APP_URL}/sessions`, "See everything that's on →")}
    ${msg(sc, "See you on the mat,<br>Stretchy")}
  `;

  // page() already appends the highlight panel (when highlight !== false) + footer.
  const html = preheader(p.previewText) + page(schemeName, inner, {
    highlight: p.highlight !== false,
    // Unsubscribe sits at the very bottom, under the footer.
    afterFooter: (sc) => `<div style="max-width:520px;margin:0 auto;padding:0 26px 28px;text-align:center;"><p style="color:${sc.text};font-size:11px;line-height:1.5;margin:0;opacity:.7;">You're getting this because you opted in to Stretchy updates. <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:${sc.text};text-decoration:underline;">Unsubscribe any time</a>.</p></div>`,
  });
  return { subject: p.subject, html };
}

// Kept for callers that referenced these; not otherwise used here.
export { brandFooter, highlightBlock };
