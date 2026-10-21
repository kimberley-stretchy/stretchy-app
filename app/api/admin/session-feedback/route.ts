import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";

// GET /api/admin/session-feedback — every set of after-session answers, newest
// first, with the session and the name / email people chose to add.
export async function GET(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
  const { data, error } = await admin.from("session_feedback").select("*").order("updated_at", { ascending: false }).limit(500);
  if (error) return NextResponse.json({ items: [], setupNeeded: true });

  const sessionIds = Array.from(new Set((data ?? []).map((r) => r.session_id)));
  const { data: sessions } = sessionIds.length ? await admin.from("sessions").select("id, title, starts_at").in("id", sessionIds) : { data: [] };
  const sById = new Map((sessions ?? []).map((s: { id: string }) => [s.id, s]));
  // Only what people chose to tell us: the name / email they typed, or Anonymous.
  const items = (data ?? []).map((r) => {
    const s = sById.get(r.session_id) as { title?: string; starts_at?: string } | undefined;
    return {
      id: r.id,
      updated_at: r.updated_at,
      session: s ? { title: s.title, starts_at: s.starts_at } : null,
      sessionId: r.session_id,
      who: [r.name, r.email].filter(Boolean).join(" · ") || "Anonymous",
      answers: r.answers ?? {},
    };
  });
  return NextResponse.json({ items });
}
