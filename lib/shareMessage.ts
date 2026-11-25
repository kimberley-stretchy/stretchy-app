import { formatDay, formatTime } from "@/lib/sessionTimes";

// The ready-made message people send their mates (WhatsApp, Text, Email).
// Says what Stretchy is, pulls the session details, and ends with the link on
// its own line so every email and messaging app shows it as tappable.
// Words: STRETCHY_WORDS.md.

const SHARE_LINE = "The more who join, the better it gets — the price, the vibes, the community.";

type ShareSession = { starts_at: string; location_name?: string | null };

/** "coffee" for morning sessions, "drinks" from midday on. */
function socialDrink(startsAt: string) {
  return formatTime(startsAt).endsWith("am") ? "coffee" : "drinks";
}

/** For one session: "Stretchy social yoga, Fri 27 Nov, 6:15am at … Keen to join me?" */
export function sessionShareMessage(s: ShareSession, url: string): { subject: string; body: string } {
  const where = (s.location_name ?? "").trim();
  const when = `${formatDay(s.starts_at)}, ${formatTime(s.starts_at)}${where ? ` at ${where}` : ""}`;
  return {
    subject: "Keen to join me at Stretchy?",
    body: [
      `Stretchy social yoga, ${when}. Keen to join me?`,
      `Stretchy is an hour of yoga with a great teacher, then a Social Stretch (${socialDrink(s.starts_at)} and chats) after. Every body welcome.`,
      SHARE_LINE,
      `Hold your place:\n${url}`,
    ].join("\n\n"),
  };
}

/** No particular session (Invite a mate). */
export function generalShareMessage(url: string): { subject: string; body: string } {
  return {
    subject: "Have you heard of Stretchy?",
    body: [
      "Have you heard of Stretchy? It's social yoga around Auckland. Keen to join me?",
      "An hour of yoga with a great teacher, then a Social Stretch (coffee or drinks, and chats) after. Every body welcome.",
      SHARE_LINE,
      `See what's on:\n${url}`,
    ].join("\n\n"),
  };
}

export function mailtoLink({ subject, body }: { subject: string; body: string }) {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
