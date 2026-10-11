import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
}

// GET /api/host/substitute-requests/[id] — fetch one request + its session, service-role
// (bypasses RLS so the claim landing page never hangs on a policy gap).
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Signed-in users only — the claim page already sends people to /host/login
  // first, and the request note isn't for the public. (Approval + MFA are
  // enforced at the claim step, not here, so the landing page still loads.)
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  let { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (token) { const { data } = await supabase.auth.getUser(token); user = data.user; }
  }
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin = getAdmin();

  const { data, error } = await admin
    .from("substitute_requests")
    .select("id, role, status, note, sessions ( id, title, movement_type, starts_at, location_name )")
    .eq("id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ request: data });
}
