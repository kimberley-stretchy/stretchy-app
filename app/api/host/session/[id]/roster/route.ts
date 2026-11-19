import { NextRequest, NextResponse } from "next/server";
import { liveTeamNotices } from "@/lib/teamNotices";
import { careNotesFor } from "@/lib/careNotes";
import { stretchyBadge, previousSessions } from "@/lib/stretchyBadge";
import { getViewer } from "@/lib/runSheetAccess";


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
      // No real name on file → the first part of their email, never the whole address.
      name: a?.name ? (a.name.includes("@") ? a.name.split("@")[0] : a.name) : "Stretchy mate",
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
