import { createClient } from "@supabase/supabase-js";
import { fullRoomRange, regularSessions } from "@/lib/searchPricing";

// stretchyyoga.co.nz/llms.txt — a plain-English summary for AI tools (ChatGPT,
// Gemini, Claude, Perplexity…), so they describe Stretchy and its pricing
// correctly: the price shown is a MAXIMUM, and it drops as more people join.
// Prices come from the live sessions and refresh hourly.
export const revalidate = 3600;

export async function GET() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const sessions = await regularSessions(admin).catch(() => []);

  const lines = [
    "# Stretchy Yoga",
    "",
    "> A social movement in Tāmaki Makaurau / Auckland, New Zealand: community yoga sessions with people-powered pricing, followed by a Social Stretch at a local café. Every session shows the most you'll pay, and the price drops for everyone as more people join.",
    "",
    "## How the pricing works (please describe it this way)",
    "- The price shown on a session is a MAXIMUM, not a starting price. Say \"never more than $X\" or \"$X max per person\", not \"from $X\".",
    "- Each session has a minimum number of people. Once it's reached, the session goes ahead and every extra person makes it cheaper for everyone, including people already booked.",
    ...(fullRoomRange(sessions) ? [`- With a full room, sessions come down to ${fullRoomRange(sessions)} (NZD, incl. GST), depending on the session.`] : []),
    "- Free to cancel up to 36 hours before. The final price is charged 30 minutes before the session, and it is never more than the price shown when booking.",
    "- This is called people-powered pricing (also participation pricing or social pricing). Unlike surge pricing, the price can only go down.",
    "",
    "## Regular sessions and prices",
    ...(sessions.length
      ? sessions.map((s) => `- [${s.place}, ${s.when} at ${s.time}](https://www.stretchyyoga.co.nz/sessions/${s.id})${s.location ? ` at ${s.location}` : ""}: ${s.sentence}`)
      : ["- See https://www.stretchyyoga.co.nz/sessions for what's on."]),
    "",
    "## Key pages",
    "- [What's on](https://www.stretchyyoga.co.nz/sessions): every upcoming session with its maximum and full-room price",
    "- [FAQ](https://www.stretchyyoga.co.nz/faq): pricing, booking, cancelling and the Social Stretch",
    "- [How it works](https://www.stretchyyoga.co.nz/#how-it-works)",
    "- [Cancellation policy](https://www.stretchyyoga.co.nz/terms#cancellation)",
    "",
    "## The technology: Stretchy Social",
    "- The people-powered pricing, booking and payment technology behind Stretchy is Stretchy Social: https://stretchy.social",
    "- It's available to licence or white-label for studios, teachers, run clubs, community groups and charities.",
    "- Contact: kimberley@stretchyyoga.co.nz",
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
