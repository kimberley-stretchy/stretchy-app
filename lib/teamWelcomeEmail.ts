import { Resend } from "resend";
import { page, h1, hey, msg, label, box, button, row, FROM, REPLY_TO, HQ_EMAIL, APP_URL } from "@/lib/stretchy-email";
import { logEmail } from "@/lib/emailLog";

// ─────────────────────────────────────────────────────────────────────────────
// "Welcome to the team" — sent when HQ adds a teacher or GEM who isn't in the
// system yet (Add & approve, or approving someone who applied). How to sign in
// (including the authenticator app the team view asks for), what they'll see,
// and a reminder to look after people's information. Copied to HQ.
// Copy agreed with Kimberley, 27 Oct 2026.
// ─────────────────────────────────────────────────────────────────────────────

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function renderTeamWelcome(p: { name: string; email: string; roles: string[] }): { subject: string; html: string } {
  const teacher = p.roles.includes("teacher");
  const gem = p.roles.includes("gem");
  const role = teacher && gem ? "teacher and GEM" : gem ? "GEM" : "teacher";
  const first = p.name && !p.name.includes("@") ? p.name.trim().split(" ")[0] : "there";
  const login = `${APP_URL}/host/login`;
  const loginShort = login.replace(/^https?:\/\/(www\.)?/, "");
  const subject = "Welcome to the Stretchy team ✨ Here’s how to sign in";

  const html = page(gem && !teacher ? "olive" : "dkblue", (sc) => {
    const bullets = (items: string[]) => items.map((t) => row(sc, `• ${t}`)).join("");
    const steps = (items: string[]) => items.map((t, i) => row(sc, `<strong>${i + 1}.</strong> ${t}`)).join("");
    return `
    ${h1(sc, "Welcome to the team. ✨")}
    ${hey(sc, esc(first))}
    ${msg(sc, `We’ve added you to Stretchy as a <strong>${role}</strong>, so you can now sign in to the Stretchy team view.`)}
    ${button(sc, login, "Sign in to Stretchy")}

    ${box(sc, `
      ${label(sc, "Before you start (2 minutes)")}
      ${row(sc, "Download a free authenticator app on your phone: <strong>Google Authenticator</strong> or <strong>Microsoft Authenticator</strong> (App Store or Google Play). It adds a second step to signing in, which protects the personal information you’ll see.")}
    `)}

    ${box(sc, `
      ${label(sc, "How to sign in")}
      ${steps([
        `Tap the button above, or go to <strong>${esc(loginShort)}</strong>.`,
        `Use <strong>${esc(p.email)}</strong>. It’s the address your profile is linked to. Sign in with a different one and we won’t find you.`,
        `Tap <strong>Continue with Google</strong> if it’s a Google or Gmail address. Otherwise type your email and tap <strong>Send me a link</strong>, then open the link we email you. No password needed.`,
        `<strong>The first time only:</strong> you’ll see a QR code. Open your authenticator app, tap <strong>+</strong> and scan it, then type in the 6-digit code it shows. If you’re signing in on your phone and can’t scan the screen, the page also gives a key you can type into the app instead.`,
        `<strong>Each time after that:</strong> sign in the same way, then enter the latest 6-digit code from your app.`,
      ])}
      ${row(sc, "<strong>New phone, or lost access to your app?</strong> Reply to this email and we’ll reset it for you.")}
    `)}

    ${box(sc, `
      ${label(sc, "Once you’re in")}
      ${bullets([
        "Your upcoming sessions, and how many people are coming",
        "The run sheet for each session you’re on: check people in, and see anything they’ve told us about moving with care",
        "The Team portal: locations, team contacts, and our team agreement. Please read it and tap accept.",
        "Sessions that need covering, if you’d like to pick one up",
      ])}
    `)}

    ${box(sc, `
      ${label(sc, "Looking after people’s information")}
      ${row(sc, "The run sheet shows attendees’ first names and any notes they’ve shared about moving with care. That’s personal, so please:")}
      ${bullets([
        "Use it only to run the session. Don’t share, screenshot or copy it.",
        "Don’t contact attendees through details you’ve seen on Stretchy.",
        "Keep your sign-in to yourself, and sign out on shared devices.",
        "Tell us straight away if anything goes wrong, like a lost phone or a message sent to the wrong person.",
      ])}
      ${row(sc, "Your own name and phone number appear on your team card, so others on your sessions can reach you on the day. You can update them any time in your profile.")}
    `)}

    ${msg(sc, "Questions? Just reply to this email.")}
    <p style="color:${sc.text};font-size:15px;line-height:1.55;margin:0 0 22px;">Talk soon,<br>Kimberley and the Stretchy team</p>
  `;
  }, { highlight: false });
  return { subject, html };
}

/** Sends it to the new team member, copied to HQ. Never throws: an email hiccup mustn't undo adding them. */
export async function sendTeamWelcome(p: { name: string; email: string; roles: string[] }): Promise<boolean> {
  const to = p.email.trim();
  if (!/^\S+@\S+\.\S+$/.test(to) || !process.env.RESEND_API_KEY) return false;
  const { subject, html } = renderTeamWelcome(p);
  try {
    const { data, error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: FROM,
      to,
      cc: HQ_EMAIL,
      reply_to: REPLY_TO,
      subject,
      html,
      text: html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, "\n").trim(),
    });
    await logEmail({ recipient: to, emailType: "team_welcome", subject, resendId: data?.id ?? null, status: error ? "error" : "sent", error: error ? (error as { message?: string }).message ?? String(error) : null });
    return !error;
  } catch (e) {
    console.error("Team welcome email error:", e);
    return false;
  }
}
