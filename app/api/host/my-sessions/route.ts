import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireHost } from "@/lib/hostAuth";
import { calculatePrice } from "@/lib/pricing";

const HQ_EMAIL = "kimberley@stretchyyoga.co.nz";

// GET /api/host/my-sessions — the signed-in teacher/GEM's upcoming sessions,
// with who's teaching / GEM-ing and where the room is at (spots held vs the
// minimum and max, today's price, the full-room price). Counts only — no
// attendee details; those stay on the per-session pages.
export async function GET(request: NextRequest) {
  const gate = await requireHost(request);
  if ("error" in gate) return gate.error;
  const { host } = gate;

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: sessions } = await admin
    .from("sessions")
    .select("id, title, movement_type, description, starts_at, ends_at, location_name, host_id, gem_host_id, min_attendees, max_attendees, cost_base, revenue_target, state, social_stretch_venue")
    .or(`host_id.eq.${host.id},gem_host_id.eq.${host.id}`)
    .eq("is_draft", false)
    .neq("state", "cancelled")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  if (!sessions || sessions.length === 0) return NextResponse.json({ sessions: [] });

  const ids = sessions.map((s) => s.id);
  const hostIds = Array.from(new Set(sessions.flatMap((s) => [s.host_id, s.gem_host_id]).filter(Boolean))) as string[];
  const [{ data: holds }, { data: people }] = await Promise.all([
    admin.from("holds").select("session_id, quantity").in("session_id", ids).eq("state", "active"),
    admin.from("hosts").select("id, name, email").in("id", hostIds),
  ]);

  const held: Record<string, number> = {};
  (holds ?? []).forEach((h) => { held[h.session_id] = (held[h.session_id] ?? 0) + (h.quantity ?? 1); });
  const nameOf = (id: string | null) => {
    const p = id ? (people ?? []).find((x) => x.id === id) : undefined;
    return p && p.email?.toLowerCase() !== HQ_EMAIL ? p.name : null;
  };

  return NextResponse.json({
    sessions: sessions.map((s) => {
      const n = held[s.id] ?? 0;
      return {
        id: s.id,
        title: s.title,
        style: s.description,
        startsAt: s.starts_at,
        endsAt: s.ends_at,
        locationName: s.location_name,
        socialStretchVenue: s.social_stretch_venue,
        state: s.state,
        asTeacher: s.host_id === host.id,
        asGem: s.gem_host_id === host.id,
        teacherName: nameOf(s.host_id),
        gemName: nameOf(s.gem_host_id),
        held: n,
        min: s.min_attendees,
        max: s.max_attendees,
        // Price everyone pays right now (the minimum's price until it's passed).
        priceNow: calculatePrice(s.cost_base, s.revenue_target, Math.min(Math.max(n, s.min_attendees), s.max_attendees)),
        priceFull: calculatePrice(s.cost_base, s.revenue_target, s.max_attendees),
      };
    }),
  });
}
