import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/host/substitute-requests/[id] — fetch one request + its session, service-role
// (bypasses RLS so the claim landing page never hangs on a policy gap).
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = getAdmin();

  const { data, error } = await admin
    .from("substitute_requests")
    .select("id, role, status, note, sessions ( id, title, movement_type, starts_at, location_name )")
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ request: data });
}
