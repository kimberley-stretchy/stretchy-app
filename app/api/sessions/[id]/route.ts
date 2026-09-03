import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/sessions/[id] — public session detail. Deliberately hand-picked, public-safe
// fields only: no cost_lines (what the teacher/venue/GEM are paid), no is_draft, no
// host_paid_at. The admin session list (/api/admin/sessions) carries all of that and is
// login-gated — this route exists so the public session page never has to touch it.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = getAdmin();

  const { data: session, error } = await admin
    .from("sessions")
    .select(`
      id, title, description, movement_type, starts_at, ends_at, duration_mins,
      location_name, location_address, getting_there,
      cost_base, revenue_target, min_attendees, max_attendees, state,
      social_stretch_venue, social_stretch_note, what_to_bring
    `)
    .eq("id", id)
    .eq("is_draft", false)
    .single();

  if (error || !session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const { count: holdCount } = await admin
    .from("holds")
    .select("id", { count: "exact", head: true })
    .eq("session_id", id)
    .eq("state", "active");

  return NextResponse.json({ ...session, current_holds: holdCount ?? 0 });
}
