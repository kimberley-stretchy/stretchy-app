import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/admin/sessions/[id]/attendees — who's actually holding a spot,
// with contact details. Attendees live only in Supabase (the `attendees` +
// `holds` tables) — this route just reads that, it isn't a second store.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  const { id } = await params;
  const supabase = getSupabase();

  const { data: holds, error } = await supabase
    .from("holds")
    .select("id, user_id, state, created_at")
    .eq("session_id", id)
    .eq("state", "active")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!holds || holds.length === 0) return NextResponse.json({ attendees: [] });

  const userIds = Array.from(new Set(holds.map((h) => h.user_id)));
  const { data: attendees } = await supabase
    .from("attendees")
    .select("auth_user_id, name, email")
    .in("auth_user_id", userIds);

  const byUser = new Map((attendees ?? []).map((a) => [a.auth_user_id, a]));

  // One hold row per spot, so group by attendee to show quantity.
  const grouped = new Map<string, { name: string; email: string; spots: number; heldAt: string }>();
  for (const h of holds) {
    const a = byUser.get(h.user_id);
    const key = h.user_id;
    const existing = grouped.get(key);
    if (existing) {
      existing.spots += 1;
    } else {
      grouped.set(key, {
        name: a?.name ?? "Unknown",
        email: a?.email ?? "—",
        spots: 1,
        heldAt: h.created_at,
      });
    }
  }

  return NextResponse.json({ attendees: Array.from(grouped.values()) });
}
