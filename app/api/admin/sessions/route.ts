import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";
import { notifyHostScheduled } from "@/lib/notifyHostScheduled";

// Create inside each request handler so env vars are always available at runtime
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

const KIMBERLEY_EMAIL = "kimberley@stretchyyoga.co.nz";
const KIMBERLEY_NAME  = "Kimberley Torrie";

// Get or create Kimberley's host record so sessions can reference it
async function getOrCreateHostId(): Promise<string> {
  const supabase = getSupabase();

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
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  let query = supabase
    .from("sessions")
    .select(`
      id, title, description, movement_type, starts_at, ends_at, duration_mins,
      location_name, location_address, getting_there,
      cost_base, revenue_target, currency, min_attendees, max_attendees, state, created_at,
      social_stretch_venue, social_stretch_note, what_to_bring, cost_lines, host_paid_at,
      host_id, gem_host_id, is_repeat, repeat_frequency
    `)
    .order("starts_at", { ascending: true });

  if (id) query = query.eq("id", id);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count active holds for each session — sum quantity, not row count, since
  // one hold row can now represent more than one spot.
  const sessionIds = (data || []).map((s) => s.id);
  const holdCounts: Record<string, number> = {};
  if (sessionIds.length > 0) {
    const { data: holds } = await supabase
      .from("holds")
      .select("session_id, quantity")
      .in("session_id", sessionIds)
      .eq("state", "active");

    (holds || []).forEach((h) => {
      holdCounts[h.session_id] = (holdCounts[h.session_id] || 0) + (h.quantity ?? 1);
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
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  const supabase = getSupabase();
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
    revenue_target,
    currency,
    min_attendees,
    max_attendees,
    social_stretch_venue,
    social_stretch_note,
    what_to_bring,
    cost_lines,
    host_id: hostIdInput,
    gem_host_id,
    is_draft,
    is_repeat,
    repeat_frequency,
  } = body;

  if (!title || !starts_at || !location_name || !revenue_target || !min_attendees || !max_attendees) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // cost_lines: [{ role: "Teacher"|"Venue"|"GEM"|"Charity"|custom, name: string, amount: number }]
  const costLines: { role: string; name: string; amount: number }[] = Array.isArray(cost_lines) ? cost_lines : [];
  const cost_base = costLines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

  const realHostAssigned = !!hostIdInput;
  const host_id = hostIdInput || (await getOrCreateHostId());

  const startsDate = new Date(starts_at);
  const endsDate = new Date(startsDate.getTime() + (duration_mins || 60) * 60 * 1000);

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      host_id,
      gem_host_id: gem_host_id || null,
      title,
      description: description || null,
      movement_type: movement_type || "yoga",
      starts_at,
      ends_at: endsDate.toISOString(),
      duration_mins: duration_mins || 60,
      location_name,
      location_address: location_address || "",
      getting_there: getting_there || null,
      cost_base,
      cost_lines: costLines,
      revenue_target: Number(revenue_target),
      currency: currency || "NZD",
      min_attendees: Number(min_attendees),
      max_attendees: Number(max_attendees),
      social_stretch_venue: social_stretch_venue || null,
      social_stretch_note: social_stretch_note || null,
      what_to_bring: what_to_bring || [],
      state: "open",
      is_draft: !!is_draft,
      is_repeat: !!is_repeat,
      repeat_frequency: is_repeat ? repeat_frequency || null : null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Create session error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sessionForNotify = {
    title,
    startsAt: starts_at,
    endsAt: endsDate.toISOString(),
    locationName: location_name,
    locationAddress: location_address,
  };
  if (realHostAssigned) {
    notifyHostScheduled({ hostId: host_id, role: "teacher", session: sessionForNotify }).catch((e) => console.error("Teacher notify error:", e));
  }
  if (gem_host_id) {
    notifyHostScheduled({ hostId: gem_host_id, role: "gem", session: sessionForNotify }).catch((e) => console.error("GEM notify error:", e));
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}

// PATCH /api/admin/sessions — update session state or details
export async function PATCH(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  const supabase = getSupabase();
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
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  const supabase = getSupabase();
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
