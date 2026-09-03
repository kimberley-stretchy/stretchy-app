import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/admin/feedback — everything Teachers/GEMs have sent HQ, newest first.
export async function GET() {
  const admin = getAdmin();

  const { data, error } = await admin
    .from("hq_feedback")
    .select("id, host_id, area, category, message, session_context, image_urls, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const hostIds = Array.from(new Set((data ?? []).map((f) => f.host_id).filter(Boolean)));
  const { data: hosts } = hostIds.length
    ? await admin.from("hosts").select("id, name").in("id", hostIds)
    : { data: [] as { id: string; name: string }[] };
  const nameById = new Map((hosts ?? []).map((h) => [h.id, h.name]));

  const items = (data ?? []).map((f) => ({ ...f, hostName: nameById.get(f.host_id) ?? "Unknown" }));
  return NextResponse.json({ items });
}
