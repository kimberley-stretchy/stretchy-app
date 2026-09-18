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
  | { type: "sessions"; sessions: NewsletterSession[] };

export interface NewsletterInput {
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

function paras(sc: Scheme, text: string): string {
  return text
    .split(/\n\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((t) => msg(sc, t.replace(/\n/g, "<br>")))
    .join("");
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
        if (b.type === "sessions") return (b.sessions ?? []).map((s) => sessionBlock(sc, s)).join("");
        return "";
      })
      .join("")}
    ${button(sc, `${APP_URL}/sessions`, "See everything that's on →")}
    ${msg(sc, "See you on the mat,<br>Stretchy")}
    <p style="color:${sc.text};font-size:11px;line-height:1.5;margin:18px 0 0;opacity:.7;">You're getting this because you opted in to Stretchy updates. <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:${sc.text};text-decoration:underline;">Unsubscribe any time</a>.</p>
  `;

  // page() already appends the highlight panel (when highlight !== false) + footer.
  const html = page(schemeName, inner, { highlight: p.highlight !== false });
  return { subject: p.subject, html };
}

// Kept for callers that referenced these; not otherwise used here.
export { brandFooter, highlightBlock };
