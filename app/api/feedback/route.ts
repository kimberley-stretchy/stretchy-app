import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cleanAnswers } from "@/lib/feedbackQuestions";

// POST /api/feedback — the quick questions after a session. Signed-in people
// only; one answer set per person per session (sending again updates it).
// Body: { sessionId, answers, hideName }
export async function POST(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: { user } } = await anon.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Please sign in first." }, { status: 401 });

  const b = await request.json().catch(() => ({}));
  const sessionId = typeof b.sessionId === "string" && /^[0-9a-f-]{36}$/.test(b.sessionId) ? b.sessionId : null;
  if (!sessionId) return NextResponse.json({ error: "Unknown session." }, { status: 400 });
  const answers = cleanAnswers(b.answers);
  if (Object.keys(answers).length === 0) return NextResponse.json({ error: "Pick at least one answer." }, { status: 400 });

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: session } = await admin.from("sessions").select("id").eq("id", sessionId).maybeSingle();
  if (!session) return NextResponse.json({ error: "Unknown session." }, { status: 400 });

  const { error } = await admin.from("session_feedback").upsert(
    { session_id: sessionId, user_id: user.id, hide_name: b.hideName === true, answers, updated_at: new Date().toISOString() },
    { onConflict: "session_id,user_id" }
  );
  if (error) {
    console.error("session_feedback save error:", error);
    return NextResponse.json({ error: "Couldn’t save that just now. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
