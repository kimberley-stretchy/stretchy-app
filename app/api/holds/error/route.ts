import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// POST /api/holds/error — the booking pop-up reports any message it showed the
// person (so HQ can see what people saw). Body: { sessionId, stage, message, code?, quantity? }.
// stage: "start" (couldn't start the booking) · "details" (name / mobile) ·
// "card" (card details incomplete) · "bank" (card declined or check failed) · "save".
// Best effort: never blocks or fails the booking itself. No card details are sent.
const STAGES = ["start", "details", "card", "bank", "save"];
const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export async function POST(request: NextRequest) {
  const b = await request.json().catch(() => ({}));
  if (!STAGES.includes(b.stage)) return NextResponse.json({ ok: false }, { status: 400 });
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  let userId: string | null = null;
  let email: string | null = null;
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (token) {
    const { data } = await admin.auth.getUser(token);
    userId = data.user?.id ?? null;
    email = data.user?.email ?? null;
  }
  const sessionId = typeof b.sessionId === "string" && /^[0-9a-f-]{36}$/.test(b.sessionId) ? b.sessionId : null;
  await admin.from("booking_errors").insert({
    session_id: sessionId,
    user_id: userId,
    email,
    stage: b.stage,
    message: text(b.message, 500),
    code: text(b.code, 120),
    quantity: Number.isInteger(b.quantity) ? b.quantity : null,
  }).then(() => {}, () => {});
  return NextResponse.json({ ok: true });
}
