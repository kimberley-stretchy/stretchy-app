import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";
import { confirmSession, getHoldSummary, DecisionSession } from "@/lib/sessionDecision";
import { goNoGo, formatDayTime } from "@/lib/sessionTimes";
import { hoursUntil, DECISION_HOURS } from "@/lib/sessionSchedule";

// Confirming cards and sending emails for a full room takes a while; give the
// job a minute rather than the short default.
export const maxDuration = 60;

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
}

const MIGRATION_HINT =
  "Keep alive needs one small database change first (lib/supabase/migrations/2026-10-13_keep_alive.sql). Run it in the Supabase SQL editor, then try again.";

async function loadSession(admin: ReturnType<typeof getAdmin>, id: string) {
  const { data } = await admin
    .from("sessions")
    .select("id, title, starts_at, location_name, min_attendees, cost_base, revenue_target, social_stretch_venue, host_id, gem_host_id, movement_type, duration_mins, getting_there, venue_instagram, social_venue_instagram, state")
    .eq("id", id)
    .single();
  return data;
}

// POST /api/admin/sessions/[id]/confirm — HQ's "Keep alive" override.
//
// Before 36 hours out: records HQ's decision and sends NOTHING. At 36 hours out
// the session-check job confirms it whatever the numbers, and everyone gets the
// normal "it's going ahead" email then — so customers always hear at 36 hours,
// and free cancelling closes at the moment they're told, not before.
//
// At or after 36 hours out with the session still open (a run was missed):
// confirms immediately, as the job would have.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  const { id } = await params;
  const admin = getAdmin();
  const session = await loadSession(admin, id);

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.state === "cancelled") {
    return NextResponse.json({ error: "That session is already cancelled — it can't be revived here." }, { status: 400 });
  }
  if (session.state === "confirmed" || session.state === "locked") {
    return NextResponse.json({ ok: true, alreadyConfirmed: true, message: "Already confirmed." });
  }

  if (hoursUntil(session.starts_at) > DECISION_HOURS) {
    const keptAliveAt = new Date().toISOString();
    const { error } = await admin.from("sessions").update({ keep_alive_at: keptAliveAt }).eq("id", id);
    if (error) return NextResponse.json({ error: MIGRATION_HINT }, { status: 500 });
    return NextResponse.json({
      ok: true,
      keptAlive: true,
      keepAliveAt: keptAliveAt,
      message: `Kept alive. It will be confirmed at 36 hours out (${formatDayTime(goNoGo(session.starts_at))}) and everyone told then. Nothing has been sent yet.`,
    });
  }

  const { count: holds } = await getHoldSummary(admin, session.id);
  const result = await confirmSession(admin, session as DecisionSession, { keptAlive: holds < session.min_attendees });
  return NextResponse.json({ ok: true, ...result });
}

// DELETE /api/admin/sessions/[id]/confirm — undo "Keep alive" (only possible
// before 36 hours out, while nothing has been sent). The session goes back to
// the normal rule: it needs its minimum to go ahead.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  const { id } = await params;
  const admin = getAdmin();
  const session = await loadSession(admin, id);

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.state !== "open") {
    return NextResponse.json({ error: "This session has already been decided, so there's nothing to undo." }, { status: 400 });
  }
  const { error } = await admin.from("sessions").update({ keep_alive_at: null }).eq("id", id);
  if (error) return NextResponse.json({ error: MIGRATION_HINT }, { status: 500 });
  return NextResponse.json({ ok: true, keptAlive: false });
}
