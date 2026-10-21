import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";

// GET /api/admin/session-feedback — every set of after-session answers, newest
// first, with the session and (unless they asked to hide it) the person's name.
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
  const userIds = Array.from(new Set((data ?? []).filter((r) => !r.hide_name).map((r) => r.user_id)));
  const [{ data: sessions }, { data: people }] = await Promise.all([
    sessionIds.length ? admin.from("sessions").select("id, title, starts_at").in("id", sessionIds) : Promise.resolve({ data: [] }),
    userIds.length ? admin.from("attendees").select("auth_user_id, name, email").in("auth_user_id", userIds) : Promise.resolve({ data: [] }),
  ]);
  const sById = new Map((sessions ?? []).map((s: { id: string }) => [s.id, s]));
  const pById = new Map((people ?? []).map((p: { auth_user_id: string }) => [p.auth_user_id, p]));
  const items = (data ?? []).map((r) => {
    const s = sById.get(r.session_id) as { title?: string; starts_at?: string } | undefined;
    const p = r.hide_name ? null : (pById.get(r.user_id) as { name?: string; email?: string } | undefined);
    return {
      id: r.id,
      updated_at: r.updated_at,
      session: s ? { title: s.title, starts_at: s.starts_at } : null,
      sessionId: r.session_id,
      who: r.hide_name ? "Name hidden" : p?.name && !p.name.includes("@") ? p.name : p?.email ?? "Stretchy mate",
      answers: r.answers ?? {},
    };
  });
  return NextResponse.json({ items });
}
