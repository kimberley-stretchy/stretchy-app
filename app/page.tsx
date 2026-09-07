// Marketing homepage — server component, fetches real upcoming sessions + suggestions.
// Revalidate periodically rather than baking data in at build time (plain supabase-js
// gives Next no signal to treat this route as dynamic, so it'd otherwise go fully static).
export const revalidate = 60;

import { createClient } from "@supabase/supabase-js";
import MarketingNav from "@/components/marketing/MarketingNav";
import Hero from "@/components/marketing/Hero";
import WhatStretchyIs from "@/components/marketing/WhatStretchyIs";
import HowItWorks from "@/components/marketing/HowItWorks";
import WhatsOnNext, { type MarketingSession } from "@/components/marketing/WhatsOnNext";
import SuggestBand, { type MarketingSuggestion } from "@/components/marketing/SuggestBand";
import SocialStretchBand from "@/components/marketing/SocialStretchBand";
import StretchyFundBand from "@/components/marketing/StretchyFundBand";
import OpportunitiesBand from "@/components/marketing/OpportunitiesBand";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import TestingPopup from "@/components/marketing/TestingPopup";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getUpcomingSessions(): Promise<{ open: MarketingSession[]; notify: MarketingSession | null }> {
  const admin = getAdmin();

  const { data: sessions, error } = await admin
    .from("sessions")
    .select(`
      id, movement_type, starts_at, duration_mins, location_name,
      cost_base, revenue_target, min_attendees, max_attendees,
      social_stretch_venue, social_stretch_note, state,
      hosts!host_id ( name )
    `)
    .in("state", ["open", "confirmed"])
    .eq("is_draft", false)
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(6);

  if (error) console.error("getUpcomingSessions error:", error.message);
  if (!sessions || sessions.length === 0) return { open: [], notify: null };

  const sessionIds = sessions.map((s) => s.id);
  const { data: holds } = await admin
    .from("holds")
    .select("session_id, quantity")
    .in("session_id", sessionIds)
    .eq("state", "active");

  // Sum quantity, not row count — one hold row can represent more than one spot.
  const holdCounts: Record<string, number> = {};
  (holds ?? []).forEach((h) => {
    holdCounts[h.session_id] = (holdCounts[h.session_id] ?? 0) + (h.quantity ?? 1);
  });

  const mapped: MarketingSession[] = sessions.map((s) => ({
    id: s.id,
    movement_type: s.movement_type,
    starts_at: s.starts_at,
    duration_mins: s.duration_mins,
    location_name: s.location_name,
    cost_base: s.cost_base,
    revenue_target: s.revenue_target,
    min_attendees: s.min_attendees,
    max_attendees: s.max_attendees,
    current_holds: holdCounts[s.id] ?? 0,
    social_stretch_venue: s.social_stretch_venue,
    social_stretch_note: s.social_stretch_note,
    teacher_name: (s.hosts as unknown as { name: string } | null)?.name ?? null,
  }));

  return {
    open: mapped.slice(0, 2),
    notify: mapped.length > 2 ? mapped[2] : null,
  };
}

// $10 from every session that actually ran goes into the Stretchy Fund. Counting
// "locked" + "completed" (not just "confirmed") because that's the same bar the
// admin Money screen uses for "this session is real, settle it" — see app/admin/money/page.tsx.
async function getFundTotal(): Promise<number> {
  const admin = getAdmin();
  const { count } = await admin
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .in("state", ["locked", "completed"]);
  return (count ?? 0) * 10;
}

async function getTopSuggestions(): Promise<MarketingSuggestion[]> {
  const admin = getAdmin();
  const { data } = await admin
    .from("suggestions")
    .select("id, session_type, preferred_neighbourhood, preferred_time, notes, vote_count")
    .order("vote_count", { ascending: false })
    .limit(4);
  return data ?? [];
}

// Next occurrence of a given weekday at a given hour, so placeholder examples always read as "upcoming".
function nextDateAt(weekday: number, hour: number, minute = 0): string {
  const now = new Date();
  const d = new Date(now);
  d.setHours(hour, minute, 0, 0);
  let diff = (weekday - d.getDay() + 7) % 7;
  if (diff === 0 && d <= now) diff = 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString();
}

// Example content from the design file — shown only when there isn't enough real data yet,
// so the homepage never looks empty. Same numbers as the design source for exact pricing.
const PLACEHOLDER_SESSIONS: MarketingSession[] = [
  {
    id: "placeholder-herne-bay",
    movement_type: "yoga",
    starts_at: nextDateAt(0, 9), // Sunday 9am
    duration_mins: 60,
    location_name: "Herne Bay",
    cost_base: 201.25,
    revenue_target: 200,
    min_attendees: 14,
    max_attendees: 32,
    current_holds: 18,
    social_stretch_venue: "Honey Sundays · café",
    social_stretch_note: "Straight after · 3 min walk",
    teacher_name: "Kimberley Torrie",
    isPlaceholder: true,
  },
  {
    id: "placeholder-grey-lynn",
    movement_type: "yoga",
    starts_at: nextDateAt(3, 18, 30), // Wednesday 6:30pm
    duration_mins: 60,
    location_name: "Grey Lynn",
    cost_base: 141.25,
    revenue_target: 200,
    min_attendees: 12,
    max_attendees: 22,
    current_holds: 9,
    social_stretch_venue: "Freida Margolis · bar",
    social_stretch_note: "Straight after · next door",
    teacher_name: "Kimberley Torrie",
    isPlaceholder: true,
  },
];

const PLACEHOLDER_SUGGESTIONS: MarketingSuggestion[] = [
  { id: "placeholder-westhaven", session_type: "yoga", preferred_neighbourhood: "Westhaven", preferred_time: "Saturday", notes: "Morning · vinyasa · 60 min · café after", vote_count: 41, isPlaceholder: true },
  { id: "placeholder-pt-chev", session_type: "yoga", preferred_neighbourhood: "Pt Chev", preferred_time: "Evening", notes: "Weekday · restorative · 60 min · bar after", vote_count: 28, isPlaceholder: true },
  { id: "placeholder-takapuna", session_type: "yoga", preferred_neighbourhood: "Takapuna", preferred_time: "Morning", notes: "Summer · outdoor · 45 min · beach after", vote_count: 23, isPlaceholder: true },
  { id: "placeholder-mt-eden", session_type: "yoga", preferred_neighbourhood: "Mt Eden", preferred_time: "Lunch", notes: "Weekday · slow flow · 45 min · juice after", vote_count: 14, isPlaceholder: true },
];

export default async function HomePage() {
  const [{ open, notify }, suggestions, fundTotal] = await Promise.all([
    getUpcomingSessions(),
    getTopSuggestions(),
    getFundTotal(),
  ]);

  const sessionsToShow =
    open.length >= 2 ? open : [...open, ...PLACEHOLDER_SESSIONS.slice(open.length)];
  const suggestionsToShow =
    suggestions.length >= 4 ? suggestions : [...suggestions, ...PLACEHOLDER_SUGGESTIONS.slice(suggestions.length)];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Stretchy",
    description: "A social movement community in Tāmaki Makaurau / Auckland — community-led yoga and movement sessions, priced by the room.",
    url: process.env.NEXT_PUBLIC_APP_URL || "https://stretchyyoga.co.nz",
    email: "kimberley@stretchyyoga.co.nz",
    sameAs: [
      "https://www.instagram.com/stretchy.yoga/",
      "https://www.tiktok.com/@stretchy.yoga",
    ],
  };

  return (
    <main className="bg-cream">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketingNav />
      <Hero />
      <WhatStretchyIs />
      <HowItWorks />
      <WhatsOnNext sessions={sessionsToShow} notifySession={notify} />
      <SuggestBand suggestions={suggestionsToShow} />
      <SocialStretchBand />
      <OpportunitiesBand />
      <StretchyFundBand total={fundTotal} />
      <MarketingFooter />
      <TestingPopup />
    </main>
  );
}
