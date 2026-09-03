// Server component — fetches sessions at request time, no loading state
import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import SessionsClient from "./SessionsClient";

export const metadata: Metadata = {
  title: "What's on — Stretchy",
  description: "Community yoga, pilates and movement sessions across Auckland. Hold your place, and the price drops as more people join.",
  openGraph: {
    title: "What's on — Stretchy",
    description: "Community yoga, pilates and movement sessions across Auckland. Hold your place, and the price drops as more people join.",
  },
};

type DBSession = {
  id: string;
  title: string;
  movement_type: string;
  starts_at: string;
  duration_mins: number;
  location_name: string;
  location_address: string;
  cost_base: number;
  revenue_target: number;
  min_attendees: number;
  max_attendees: number;
  current_holds: number;
  state: string;
  social_stretch_venue: string | null;
  description: string | null;
};

async function getSessions(): Promise<DBSession[]> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: sessions } = await supabase
    .from("sessions")
    .select("id, title, movement_type, starts_at, duration_mins, location_name, location_address, cost_base, revenue_target, min_attendees, max_attendees, state, social_stretch_venue, description")
    .in("state", ["open", "confirmed"])
    .eq("is_draft", false)
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  if (!sessions) return [];

  // Count active holds per session
  const sessionIds = sessions.map(s => s.id);
  const { data: holds } = await supabase
    .from("holds")
    .select("session_id")
    .in("session_id", sessionIds)
    .eq("state", "active");

  const holdCounts: Record<string, number> = {};
  (holds ?? []).forEach(h => {
    holdCounts[h.session_id] = (holdCounts[h.session_id] ?? 0) + 1;
  });

  return sessions.map(s => ({
    ...s,
    current_holds: holdCounts[s.id] ?? 0,
  }));
}

export default async function SessionsPage() {
  const sessions = await getSessions();
  return <SessionsClient sessions={sessions} />;
}
