import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildSessionEmailExtras } from "@/lib/sessionEmailContext";
import { requireAdmin } from "@/lib/adminAuth";
import {
  buildAttendeeEmail,
  sendAttendeeEmail,
  type AttendeeEmailType,
} from "@/lib/stretchy-email";

// Admin-gated manual sender. Templates + the actual Resend call now live in
// lib/stretchy-email.ts so the Vercel cron jobs can send the exact same emails
// WITHOUT this admin gate (they call sendAttendeeEmail directly). This route
// is only for manual/admin-triggered one-off sends.
const VALID_TYPES: AttendeeEmailType[] = [
  "hold_confirmed",
  "session_going_ahead",
  "session_cancelled",
  "price_locked",
  "hold_cancelled",
  "almost_there",
  "comp_hold_confirmed",
  "session_confirmed_open",
  "booking_card_failed",
];

export async function POST(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  try {
    const body = await request.json();
    const { type, to } = body as { type?: AttendeeEmailType; to?: string };

    if (!type || !to) {
      return NextResponse.json({ error: "Missing type or to" }, { status: 400 });
    }
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json({ error: "Unknown email type" }, { status: 400 });
    }

    // Given a session, fill in its real details (times, venue, teacher, dots,
    // prices, "Bring with you") so a test send looks like the real thing.
    let payload = body;
    if (typeof body.sessionId === "string" && body.sessionId) {
      const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
      const { data: session } = await admin
        .from("sessions")
        .select("host_id, gem_host_id, movement_type, duration_mins, getting_there, venue_instagram, social_venue_instagram, location_name, social_stretch_venue")
        .eq("id", body.sessionId)
        .maybeSingle();
      if (session) {
        payload = {
          ...body,
          venue: session.location_name ?? body.venue,
          socialStretchVenue: session.social_stretch_venue ?? undefined,
          ...(await buildSessionEmailExtras(admin, session, body.sessionId)),
        };
      }
    }

    // Validate the template builds before sending.
    buildAttendeeEmail(type, payload);

    const { id, error } = await sendAttendeeEmail(type, payload);
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Email API error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
