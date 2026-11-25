import type { SupabaseClient } from "@supabase/supabase-js";
import { calculatePrice } from "@/lib/pricing";

// How a session's price is described to search engines and AI tools (Google,
// Gemini, ChatGPT…). They read page descriptions and structured data, not the
// dots. A single "price" there gets repeated as a STARTING price ("from $21.83"),
// which makes Stretchy sound expensive. So it's always said as what it is: the
// most anyone pays, dropping as more people join, down to the full-room price.

type PricedSession = { cost_base: number; revenue_target: number; min_attendees: number; max_attendees: number };

const money = (n: number) => `$${n.toFixed(2)}`;

export function priceRange(s: PricedSession) {
  return {
    max: calculatePrice(s.cost_base, s.revenue_target, s.min_attendees),
    full: calculatePrice(s.cost_base, s.revenue_target, s.max_attendees),
  };
}

/** "Never more than $21.83 per person (NZD, incl. GST). The price drops as more people join, down to $10.92 each with a full room of 26." */
export function priceSentence(s: PricedSession): string {
  const { max, full } = priceRange(s);
  return `Never more than ${money(max)} per person (NZD, incl. GST). The price drops as more people join, down to ${money(full)} each with a full room of ${s.max_attendees}.`;
}

/** schema.org offer: a price range, never a single "from" price. */
export function offerSchema(s: PricedSession, url: string) {
  const { max, full } = priceRange(s);
  return {
    "@type": "AggregateOffer",
    priceCurrency: "NZD",
    lowPrice: full.toFixed(2),
    highPrice: max.toFixed(2),
    offerCount: s.max_attendees,
    availability: "https://schema.org/InStock",
    url,
    description: priceSentence(s),
  };
}

export type RegularSession = {
  id: string;
  title: string;
  /** "Ōrākei", "Herne Bay" */
  place: string;
  /** "Wednesday mornings" */
  when: string;
  /** "6:00am" */
  time: string;
  location: string | null;
  sentence: string;
  max: number;
  full: number;
};

/** "between $10.65 and $15.62 per person" — the full-room prices across the regular sessions. */
export function fullRoomRange(sessions: RegularSession[]): string | null {
  if (!sessions.length) return null;
  const lo = Math.min(...sessions.map((s) => s.full));
  const hi = Math.max(...sessions.map((s) => s.full));
  return lo === hi ? `${money(lo)} per person` : `between ${money(lo)} and ${money(hi)} per person`;
}

const NZ = "Pacific/Auckland";

/** The next upcoming session for each regular Stretchy (one per title), soonest first. */
export async function regularSessions(admin: SupabaseClient): Promise<RegularSession[]> {
  const { data } = await admin
    .from("sessions")
    .select("id, title, starts_at, location_name, cost_base, revenue_target, min_attendees, max_attendees")
    .in("state", ["open", "confirmed"])
    .eq("is_draft", false)
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(300);
  const seen = new Set<string>();
  const out: RegularSession[] = [];
  for (const s of data ?? []) {
    const title = (s.title as string).replace(/\s+/g, " ").trim();
    const [rawPlace, part] = title.split("|").map((p) => p.trim());
    const place = rawPlace.split(" - ")[0].trim();
    const key = `${place}|${part ?? ""}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const d = new Date(s.starts_at as string);
    const day = d.toLocaleDateString("en-NZ", { timeZone: NZ, weekday: "long" });
    const time = d.toLocaleTimeString("en-NZ", { timeZone: NZ, hour: "numeric", minute: "2-digit", hour12: true }).replace(" ", "").toLowerCase();
    const { max, full } = priceRange(s as PricedSession);
    // A new series more than two weeks out: say when it starts.
    const startsLater = d.getTime() - Date.now() > 14 * 86_400_000;
    const starts = startsLater ? ` Starts ${d.toLocaleDateString("en-NZ", { timeZone: NZ, weekday: "short", day: "numeric", month: "short" }).replace(",", "")}.` : "";
    out.push({
      id: s.id as string,
      title,
      place,
      when: `${day} ${part ? `${part.toLowerCase()}s` : "sessions"}`,
      time,
      location: (s.location_name as string | null)?.trim() || null,
      sentence: priceSentence(s as PricedSession) + starts,
      max,
      full,
    });
  }
  return out;
}
