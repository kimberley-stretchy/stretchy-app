import { Resend } from "resend";
import { page, h1, hey, msg, FROM, REPLY_TO, APP_URL } from "@/lib/stretchy-email";
import { logEmail } from "@/lib/emailLog";

// ─────────────────────────────────────────────────────────────────────────────
// "Thanks, we've got it" — the email someone gets straight after applying to be
// a GEM, to teach, or offering a venue (and the two sister forms). Before this
// they only saw a thank-you screen, with no record and no timeframe.
// The promise, agreed with Kimberley (Oct 2026): we reply within 5 working days.
// ─────────────────────────────────────────────────────────────────────────────

export const REPLY_PROMISE = "within 5 working days";

const COPY: Record<string, { scheme: string; headline: string; thanks: string; subject: string }> = {
  gem:            { scheme: "olive",  headline: "Good energy received. ✨", thanks: "Thanks for putting your hand up to be a GEM, our Good Energy Managers.", subject: "We’ve got your GEM application ✨" },
  teacher:        { scheme: "dkblue", headline: "You’re in the mix. 🙌",    thanks: "Thanks for applying to teach a Stretchy.",                                 subject: "We’ve got your teaching application 🙌" },
  venue:          { scheme: "cream",  headline: "Space offered. 🏠",        thanks: "Thanks for offering your space for a Stretchy.",                           subject: "We’ve got your venue offer 🏠" },
  social_stretch: { scheme: "cream",  headline: "Space offered. 🏠",        thanks: "Thanks for offering your spot for a Social Stretch.",                      subject: "We’ve got your Social Stretch offer 🏠" },
  platform_waitlist: { scheme: "purple", headline: "You’re on the list. 💛", thanks: "Thanks for joining the stretchy.social waitlist.", subject: "You’re on the stretchy.social waitlist 💛" },
  platform_enquiry:  { scheme: "purple", headline: "Message received. 💛",  thanks: "Thanks for getting in touch about running your community on Stretchy.", subject: "We’ve got your message 💛" },
  platform_testing:  { scheme: "purple", headline: "You’re in the test crew. 🙌", thanks: "Thanks for putting your hand up to help test stretchy.social.", subject: "Thanks for helping us test stretchy.social 🙌" },
  partner:        { scheme: "purple", headline: "Message received. 💛",     thanks: "Thanks for getting in touch about partnering with Stretchy.",              subject: "We’ve got your message 💛" },
};

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function renderApplicantEmail(type: string, name?: string | null): { subject: string; html: string } | null {
  const c = COPY[type];
  if (!c) return null;
  const first = name && !name.includes("@") ? name.trim().split(" ")[0] : "";
  const html = page(c.scheme, (sc) => `
    ${h1(sc, c.headline)}
    ${hey(sc, esc(first || "there"))}
    ${msg(sc, `${c.thanks} We’ve got it, and <strong>we’ll be in touch ${REPLY_PROMISE}</strong>.`)}
    ${msg(sc, `Anything to add in the meantime? Just reply to this email. And if you haven’t been to a Stretchy yet, <a href="${APP_URL}/sessions" style="color:${sc.text};font-weight:700;">see what’s on</a>.`)}
    <p style="color:${sc.text};font-size:15px;line-height:1.55;margin:0 0 22px;">Talk soon,<br>The Stretchy team</p>
  `, { highlight: false });
  return { subject: c.subject, html };
}

/** Sends it. Never throws: an email hiccup must not fail someone's application. */
export async function sendApplicantConfirmation(type: string, name: string | null | undefined, email: string | null | undefined): Promise<void> {
  const to = typeof email === "string" ? email.trim() : "";
  if (!/^\S+@\S+\.\S+$/.test(to) || !process.env.RESEND_API_KEY) return;
  const built = renderApplicantEmail(type, name);
  if (!built) return;
  try {
    const { data, error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: FROM,
      to,
      reply_to: REPLY_TO,
      subject: built.subject,
      html: built.html,
      text: built.html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, "\n").trim(),
    });
    await logEmail({ recipient: to, emailType: `applicant_confirmation_${type}`, subject: built.subject, resendId: data?.id ?? null, status: error ? "error" : "sent", error: error ? (error as { message?: string }).message ?? String(error) : null });
  } catch (e) {
    console.error("Applicant confirmation email error:", e);
  }
}
