import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Use the service-role key so admin operations bypass Row Level Security
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const KIMBERLEY_EMAIL = "kimberley@stretchyyoga.co.nz";
const KIMBERLEY_NAME  = "Kimberley Torrie";

// Get or create Kimberley's host record so sessions can reference it
async function getOrCreateHostId(): Promise<string> {
  const { data: existing } = await supabase
    .from("hosts")
    .select("id")
    .eq("email", KIMBERLEY_EMAIL)
    .single();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("hosts")
    .insert({
      name: KIMBERLEY_NAME,
      email: KIMBERLEY_EMAIL,
      neighbourhood: "Auckland",
      practice_types: ["yoga"],
      vetting_status: "approved",
    })
    .select("id")
    .single();

  if (error) throw new Error(`Could not create host: ${error.message}`);
  return created.id;
}

// GET /api/admin/sessions — list all sessions, or a single session by ?id=
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  const query = supabase
    .from("sessions")
    .select(`
      id, title, description, movement_type, starts_at, ends_at, duration_mins,
      location_name, location_address, getting_there,
      host_target, min_attendees, max_attendees, state, created_at,
      social_stretch_venue, social_stretch_note, what_to_bring
    `)
    .order("starts_at", { ascending: true });

  if (id) query.eq("id", id);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count active holds for each session
  const sessionIds = (data || []).map((s) => s.id);
  let holdCounts: Record<string, number> = {};
  if (sessionIds.length > 0) {
    const { data: holds } = await supabase
      .from("holds")
      .select("session_id")
      .in("session_id", sessionIds)
      .eq("state", "active");

    (holds || []).forEach((h) => {
      holdCounts[h.session_id] = (holdCounts[h.session_id] || 0) + 1;
    });
  }

  const sessions = (data || []).map((s) => ({
    ...s,
    current_holds: holdCounts[s.id] || 0,
  }));

  return NextResponse.json(sessions);
}

// POST /api/admin/sessions — create a new session
export async function POST(request: NextRequest) {
  const body = await request.json();

  const {
    title,
    description,
    movement_type,
    starts_at,
    duration_mins,
    location_name,
    location_address,
    getting_there,
    host_target,
    min_attendees,
    max_attendees,
    social_stretch_venue,
    social_stretch_note,
    what_to_bring,
  } = body;

  // Validate required fields
  if (!title || !starts_at || !location_name || !host_target || !min_attendees || !max_attendees) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const host_id = await getOrCreateHostId();

  // Calculate ends_at from starts_at + duration
  const startsDate = new Date(starts_at);
  const endsDate = new Date(startsDate.getTime() + (duration_mins || 60) * 60 * 1000);

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      host_id,
      title,
      description: description || null,
      movement_type: movement_type || "yoga",
      starts_at,
      ends_at: endsDate.toISOString(),
      duration_mins: duration_mins || 60,
      location_name,
      location_address: location_address || "",
      getting_there: getting_there || null,
      host_target: Number(host_target),
      min_attendees: Number(min_attendees),
      max_attendees: Number(max_attendees),
      social_stretch_venue: social_stretch_venue || null,
      social_stretch_note: social_stretch_note || null,
      what_to_bring: what_to_bring || [],
      state: "open",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Create session error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}

// PATCH /api/admin/sessions — update session state or details
export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "Missing session id" }, { status: 400 });

  const { error } = await supabase
    .from("sessions")
    .update(updates)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/sessions — cancel/delete a session
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabase
    .from("sessions")
    .update({ state: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
