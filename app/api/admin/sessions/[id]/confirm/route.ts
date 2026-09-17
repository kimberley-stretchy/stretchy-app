import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";
import { confirmSession, DecisionSession } from "@/lib/sessionDecision";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
}

// POST /api/admin/sessions/[id]/confirm — HQ's "Keep it alive & confirm" override.
// Force a session to go ahead regardless of the minimum: same effect as the 36h
// auto-confirm (state → confirmed, clears grace, sends "it's happening" to every
// holder + Interested, confirm + calendar to teacher/GEM, and the HQ digest).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  const { id } = await params;
  const admin = getAdmin();

  const { data: session } = await admin
    .from("sessions")
    .select("id, title, starts_at, location_name, min_attendees, cost_base, revenue_target, social_stretch_venue, host_id, gem_host_id, movement_type, duration_mins, getting_there, venue_instagram, social_venue_instagram, state")
    .eq("id", id)
    .single();

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.state === "cancelled") {
    return NextResponse.json({ error: "That session is already cancelled — it can't be revived here." }, { status: 400 });
  }
  if (session.state === "confirmed" || session.state === "locked") {
    return NextResponse.json({ ok: true, alreadyConfirmed: true, message: "Already confirmed." });
  }

  const result = await confirmSession(admin, session as DecisionSession);
  return NextResponse.json({ ok: true, ...result });
}
