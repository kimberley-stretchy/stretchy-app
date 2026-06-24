import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * GET /api/cron/session-check
 *
 * Runs every hour via Vercel Cron.
 * Checks sessions starting in 34–38 hours (the 36h window) and:
 *  - If minimum met → mark confirmed, send "going ahead" emails to all holders
 *  - If minimum not met → mark cancelled, release all holds, send "not this time" emails
 */

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function sendEmail(payload: Record<string, unknown>) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://stretchy.social";
  return fetch(`${appUrl}/api/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function GET(request: NextRequest) {
  // Verify this is called by Vercel Cron (or manually by admin)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdmin();
  const now = new Date();
  const windowStart = new Date(now.getTime() + 34 * 60 * 60 * 1000); // 34h from now
  const windowEnd   = new Date(now.getTime() + 38 * 60 * 60 * 1000); // 38h from now

  // Find sessions starting in the 36h window that are still "open"
  const { data: sessions } = await admin
    .from("sessions")
    .select("id, title, starts_at, ends_at, location_name, min_attendees, max_attendees, host_target, social_stretch_venue, state")
    .eq("state", "open")
    .gte("starts_at", windowStart.toISOString())
    .lte("starts_at", windowEnd.toISOString());

  if (!sessions || sessions.length === 0) {
    return NextResponse.json({ checked: 0, message: "No sessions in 36h window" });
  }

  const results = [];

  for (const session of sessions) {
    // Count active holds
    const { count: holdCount } = await admin
      .from("holds")
      .select("id", { count: "exact", head: true })
      .eq("session_id", session.id)
      .eq("state", "active");

    const holds = holdCount ?? 0;
    const startDate = new Date(session.starts_at);
    const dateStr = startDate.toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" }) +
      " at " + startDate.toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit", hour12: true });

    const STRETCHY_FEE = 23;
    const finalPrice = `$${Math.round((session.host_target + STRETCHY_FEE) / Math.max(holds, 1) * 1.15)} incl. GST`;

    if (holds >= session.min_attendees) {
      // Session going ahead — confirm it
      await admin.from("sessions").update({ state: "confirmed", confirmed_at: new Date().toISOString() }).eq("id", session.id);

      // Get all holders and send emails
      const { data: holdData } = await admin
        .from("holds")
        .select("user_id")
        .eq("session_id", session.id)
        .eq("state", "active");

      for (const h of holdData ?? []) {
        const { data: attendee } = await admin
          .from("attendees")
          .select("name, email")
          .eq("auth_user_id", h.user_id)
          .single();

        if (attendee?.email) {
          await sendEmail({
            type: "session_going_ahead",
            to: attendee.email,
            name: attendee.name?.split(" ")[0] ?? "there",
            sessionTitle: session.title,
            date: dateStr,
            price: finalPrice,
            venue: session.location_name,
            socialStretchVenue: session.social_stretch_venue ?? "nearby",
            sessionId: session.id,
          });
        }
      }

      results.push({ session: session.title, action: "confirmed", holders: holds });
    } else {
      // Not enough holds — cancel it
      await admin.from("sessions").update({ state: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", session.id);
      await admin.from("holds").update({ state: "released" }).eq("session_id", session.id).eq("state", "active");

      // Get all holders and send cancellation emails
      const { data: holdData } = await admin
        .from("holds")
        .select("user_id")
        .eq("session_id", session.id)
        .eq("state", "released");

      for (const h of holdData ?? []) {
        const { data: attendee } = await admin
          .from("attendees")
          .select("name, email")
          .eq("auth_user_id", h.user_id)
          .single();

        if (attendee?.email) {
          await sendEmail({
            type: "session_cancelled",
            to: attendee.email,
            name: attendee.name?.split(" ")[0] ?? "there",
            sessionTitle: session.title,
            date: dateStr,
            sessionId: session.id,
          });
        }
      }

      results.push({ session: session.title, action: "cancelled", holders: holds, needed: session.min_attendees });
    }
  }

  return NextResponse.json({ checked: sessions.length, results });
}
