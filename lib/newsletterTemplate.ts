import { page, h1, msg, box, label, row, button, APP_URL, type Scheme } from "@/lib/stretchy-email";

// Branded marketing newsletter ("what's on at Stretchy"), built from the same
// design system as the transactional emails so it looks like the rest of Stretchy.
// Phase 2: HQ writes subject + intro and picks sessions to feature; the session
// figures (who's coming) fill in from live data.

export interface NewsletterSession {
  title: string;
  dateStr: string;
  venue?: string | null;
  url: string;
  going: number;        // spots currently held
  min: number;          // minimum to go ahead
  price?: string | null;
  confirmed?: boolean;  // already hit minimum
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

export interface NewsletterInput {
  subject: string;
  heading?: string;
  intro?: string;         // free text; \n\n splits paragraphs
  sessions?: NewsletterSession[];
  ctaText?: string;
  ctaUrl?: string;
  outro?: string;
}

export function buildNewsletter(p: NewsletterInput): { subject: string; html: string } {
  const paras = (t?: string) =>
    (t ?? "")
      .split(/\n\n+/)
      .map((s) => s.trim())
      .filter(Boolean);

  const html = page(
    "cream",
    (sc) => `
      ${h1(sc, p.heading ?? "What's on at Stretchy 🌞")}
      ${paras(p.intro).map((t) => msg(sc, t.replace(/\n/g, "<br>"))).join("")}
      ${(p.sessions ?? []).map((s) => sessionBlock(sc, s)).join("")}
      ${p.ctaUrl ? button(sc, p.ctaUrl, p.ctaText ?? "See everything that's on →") : button(sc, `${APP_URL}/sessions`, "See everything that's on →")}
      ${paras(p.outro).map((t) => msg(sc, t.replace(/\n/g, "<br>"))).join("")}
      ${msg(sc, "See you on the mat,<br>Stretchy")}
      <p style="color:${sc.text};font-size:11px;line-height:1.5;margin:18px 0 0;opacity:.7;">You're getting this because you opted in to Stretchy updates. <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:${sc.text};text-decoration:underline;">Unsubscribe any time</a>.</p>
    `,
    { highlight: false }
  );
  return { subject: p.subject, html };
}
