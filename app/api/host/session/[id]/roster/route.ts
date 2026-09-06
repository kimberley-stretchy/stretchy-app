import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireHost } from "@/lib/hostAuth";

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getUser(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  let { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      user = data.user;
    }
  }
  return user;
}

async function getViewer(request: NextRequest, sessionId: string) {
  const gate = await requireHost(request);
  if ("error" in gate) return { error: gate.error } as const;

  const admin = getAdmin();
  const user = await getUser(request);
  if (!user) return { error: NextResponse.json({ error: "Not logged in" }, { status: 401 }) } as const;

  const { data: me } = await admin.from("hosts").select("id, name").eq("auth_user_id", user.id).single();
  if (!me) return { error: NextResponse.json({ error: "No host profile found" }, { status: 400 }) } as const;

  const { data: session } = await admin
    .from("sessions")
    .select("id, title, movement_type, starts_at, location_name, host_id, gem_host_id, min_attendees, social_stretch_venue, spotify_playlist_url")
    .eq("id", sessionId)
    .single();
  if (!session) return { error: NextResponse.json({ error: "Session not found" }, { status: 404 }) } as const;

  const role: "teacher" | "gem" | null =
    session.gem_host_id === me.id ? "gem" : session.host_id === me.id ? "teacher" : null;
  if (!role) return { error: NextResponse.json({ error: "Not assigned to this session" }, { status: 403 }) } as const;

  return { admin, me, session, role } as const;
}

// GET /api/host/session/[id]/roster — the GEM run sheet / teacher before-you-start data:
// checked-in state, moving-with-care notes, first-timer flags, and today's notices.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getViewer(request, id);
  if ("error" in result) return result.error;
  const { admin, session, role, me } = result;

  const hostIds = [session.host_id, session.gem_host_id].filter(Boolean) as string[];

  const [{ data: holds }, { data: notices }, { data: hostRows }] = await Promise.all([
    admin
      .from("holds")
      .select("id, user_id, state, checked_in_at")
      .eq("session_id", id)
      .in("state", ["active", "confirmed", "charged"]),
    admin
      .from("session_notices")
      .select("id, author_name, message, created_at")
      .eq("session_id", id)
      .order("created_at", { ascending: false }),
    hostIds.length
      ? admin.from("hosts").select("id, name").in("id", hostIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const userIds = (holds ?? []).map((h) => h.user_id);
  const { data: attendees } = userIds.length
    ? await admin
        .from("attendees")
        .select("auth_user_id, name, moving_with_care_note, moving_with_care_duration, sessions_attended")
        .in("auth_user_id", userIds)
    : { data: [] as { auth_user_id: string; name: string; moving_with_care_note: string | null; moving_with_care_duration: string | null; sessions_attended: number }[] };

  const attendeeByUserId = new Map((attendees ?? []).map((a) => [a.auth_user_id, a]));
  const hostNameById = new Map((hostRows ?? []).map((h) => [h.id, h.name]));

  const roster = (holds ?? []).map((h) => {
    const a = attendeeByUserId.get(h.user_id);
    return {
      holdId: h.id,
      name: a?.name ?? "Stretchy mate",
      checkedInAt: h.checked_in_at,
      movingWithCareNote: a?.moving_with_care_note ?? null,
      movingWithCareDuration: a?.moving_with_care_duration ?? null,
      isFirstTimer: (a?.sessions_attended ?? 0) === 0,
    };
  });

  return NextResponse.json({
    role,
    viewerName: me.name,
    session: {
      id: session.id,
      title: session.title,
      movementType: session.movement_type,
      startsAt: session.starts_at,
      locationName: session.location_name,
      minAttendees: session.min_attendees,
      socialStretchVenue: session.social_stretch_venue,
      spotifyPlaylistUrl: session.spotify_playlist_url,
      teacherName: session.host_id ? hostNameById.get(session.host_id) ?? null : null,
      gemName: session.gem_host_id ? hostNameById.get(session.gem_host_id) ?? null : null,
    },
    roster,
    notices: notices ?? [],
  });
}

// PATCH /api/host/session/[id]/roster — toggle check-in for one hold. GEM only.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getViewer(request, id);
  if ("error" in result) return result.error;
  const { admin, role } = result;

  if (role !== "gem") {
    return NextResponse.json({ error: "Only the GEM checks people in" }, { status: 403 });
  }

  const { holdId, checkedIn } = await request.json();
  if (!holdId) return NextResponse.json({ error: "Missing holdId" }, { status: 400 });

  const { error } = await admin
    .from("holds")
    .update({ checked_in_at: checkedIn ? new Date().toISOString() : null })
    .eq("id", holdId)
    .eq("session_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
