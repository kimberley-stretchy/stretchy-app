import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cleanAnswers } from "@/lib/feedbackQuestions";

// POST /api/feedback — the quick questions, after a session (/rate/[session])
// or general (/feedback, no session). No sign-in needed:
// name and email are optional. If the person is signed in anyway, answering
// again updates their earlier answers. Spam: a hidden honeypot field and a
// light per-address limit.
// Body: { sessionId, answers, name?, email?, hp? }
const recent = new Map<string, number[]>();

export async function POST(request: NextRequest) {
  const b = await request.json().catch(() => ({}));
  if (typeof b.hp === "string" && b.hp.trim()) return NextResponse.json({ ok: true });

  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const now = Date.now();
  const times = (recent.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (times.length >= 15) return NextResponse.json({ error: "Too many tries. Please try again later." }, { status: 429 });
  recent.set(ip, [...times, now]);

  if (b.sessionId != null && !(typeof b.sessionId === "string" && /^[0-9a-f-]{36}$/.test(b.sessionId))) return NextResponse.json({ error: "Unknown session." }, { status: 400 });
  const sessionId: string | null = b.sessionId ?? null;
  const answers = cleanAnswers(b.answers);
  if (Object.keys(answers).length === 0) return NextResponse.json({ error: "Pick at least one answer." }, { status: 400 });
  const name = typeof b.name === "string" && b.name.trim() ? b.name.trim().slice(0, 120) : null;
  const email = typeof b.email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(b.email.trim()) ? b.email.trim().toLowerCase() : null;

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  if (sessionId) {
    const { data: session } = await admin.from("sessions").select("id").eq("id", sessionId).maybeSingle();
    if (!session) return NextResponse.json({ error: "Unknown session." }, { status: 400 });
  }

  // Signed in? Only used so a second go updates the first.
  let userId: string | null = null;
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (token) {
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data } = await anon.auth.getUser(token);
    userId = data.user?.id ?? null;
  }

  const row = { session_id: sessionId, user_id: userId, name, email, answers, updated_at: new Date().toISOString() };
  let error;
  const existing = userId && sessionId
    ? (await admin.from("session_feedback").select("id").eq("session_id", sessionId).eq("user_id", userId).maybeSingle()).data
    : null;
  if (existing) ({ error } = await admin.from("session_feedback").update(row).eq("id", existing.id));
  else ({ error } = await admin.from("session_feedback").insert(row));
  if (error) {
    console.error("session_feedback save error:", error);
    return NextResponse.json({ error: "Couldn’t save that just now. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
