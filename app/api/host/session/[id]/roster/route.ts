import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireHost } from "@/lib/hostAuth";
import { requireAdmin } from "@/lib/adminAuth";
import { liveTeamNotices } from "@/lib/teamNotices";
import { careNotesFor } from "@/lib/careNotes";
import { stretchyBadge, previousSessions } from "@/lib/stretchyBadge";

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
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

// Who's looking, and may they? The session's teacher, its GEM — or Stretchy HQ,
// who can open any run sheet (Kimberley often leads a session herself, and
// needs to be able to check people in when there's no GEM yet).
async function getViewer(request: NextRequest, sessionId: string) {
  const admin = getAdmin();
  const { data: session } = await admin
    .from("sessions")
    .select("id, title, movement_type, starts_at, location_name, host_id, gem_host_id, min_attendees, social_stretch_venue, spotify_playlist_url")
    .eq("id", sessionId)
    .single();

  const hq = await requireAdmin(request);
  const isHQ = !("error" in hq);

  const gate = await requireHost(request);
  if ("error" in gate) {
    if (!isHQ) return { error: gate.error } as const;
    if (!session) return { error: NextResponse.json({ error: "Session not found" }, { status: 404 }) } as const;
    return { admin, me: { id: "hq", name: "Stretchy HQ" }, session, role: "hq" as const } as const;
  }

  const user = await getUser(request);
  if (!user) return { error: NextResponse.json({ error: "Not logged in" }, { status: 401 }) } as const;

  const { data: me } = await admin.from("hosts").select("id, name").eq("auth_user_id", user.id).single();
  if (!me) return { error: NextResponse.json({ error: "No host profile found" }, { status: 400 }) } as const;
  if (!session) return { error: NextResponse.json({ error: "Session not found" }, { status: 404 }) } as const;

  const role: "teacher" | "gem" | "hq" | null =
    session.gem_host_id === me.id ? "gem" : session.host_id === me.id ? "teacher" : isHQ ? "hq" : null;
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
      .select("id, user_id, state, checked_in_at, quantity, is_comp")
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
  // Names first, on their own — then the care notes separately, so a problem
  // reading notes can never blank out everybody's name (which is what happened
  // while the note columns were missing from the database).
  const { data: attendees } = userIds.length
    ? await admin.from("attendees").select("auth_user_id, name, sessions_attended").in("auth_user_id", userIds)
    : { data: [] as { auth_user_id: string; name: string; sessions_attended: number }[] };
  const care = await careNotesFor(admin, userIds);
  const before = await previousSessions(admin, userIds, id);

  const attendeeByUserId = new Map((attendees ?? []).map((a) => [a.auth_user_id, a]));
  const hostNameById = new Map((hostRows ?? []).map((h) => [h.id, h.name]));

  const roster = (holds ?? []).map((h) => {
    const a = attendeeByUserId.get(h.user_id);
    return {
      holdId: h.id,
      name: a?.name ?? "Stretchy mate",
      checkedInAt: h.checked_in_at,
      places: h.quantity ?? 1,
      movingWithCareNote: care.get(h.user_id)?.note ?? null,
      movingWithCareDuration: care.get(h.user_id)?.duration ?? null,
      isFirstTimer: (before.get(h.user_id) ?? 0) === 0,
      badge: stretchyBadge(before.get(h.user_id) ?? 0),
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
    // Messages from Stretchy HQ to the whole team ("No Stretchy next week…").
    teamNotices: await liveTeamNotices(admin),
  });
}

// PATCH /api/host/session/[id]/roster — toggle check-in for one booking.
// The GEM usually does it, but the teacher and HQ can too (there isn't always a GEM).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getViewer(request, id);
  if ("error" in result) return result.error;
  const { admin } = result;

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
