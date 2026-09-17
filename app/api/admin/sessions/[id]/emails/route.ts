import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
}

// GET /api/admin/sessions/[id]/emails — the audit log for one session: every
// email the app sent for it (attendee lifecycle, comp, teacher/GEM, HQ digests),
// newest first, with delivery status.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  const { id } = await params;
  const admin = getAdmin();

  const { data, error } = await admin
    .from("email_log")
    .select("id, recipient, email_type, subject, status, error, created_at")
    .eq("session_id", id)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    // Table not migrated yet, or a transient read error — surface it softly.
    return NextResponse.json({ emails: [], note: error.message });
  }
  return NextResponse.json({ emails: data ?? [] });
}
