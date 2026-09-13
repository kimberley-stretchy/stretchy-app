import { NextRequest, NextResponse } from "next/server";
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

    // Validate the template builds before sending.
    buildAttendeeEmail(type, body);

    const { id, error } = await sendAttendeeEmail(type, body);
    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Email API error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}
