import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getUser(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  let { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      user = data.user;
    }
  }
  return user;
}

// GET — open substitute requests matching the logged-in host's roles (and, for teacher
// requests, their practice types), so they can browse and claim proactively.
export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin = getAdmin();
  const { data: me } = await admin.from("hosts").select("id, roles, practice_types").eq("auth_user_id", user.id).single();
  if (!me) return NextResponse.json({ requests: [] });

  const { data: requests } = await admin
    .from("substitute_requests")
    .select(`
      id, session_id, role, status, created_at, note,
      sessions ( id, title, movement_type, starts_at, location_name )
    `)
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const eligible = (requests ?? []).filter((r) => {
    const roles: string[] = me.roles ?? [];
    if (!roles.includes(r.role)) return false;
    if (r.role === "teacher") {
      const session = r.sessions as unknown as { movement_type: string } | null;
      const practiceTypes: string[] = me.practice_types ?? [];
      if (session && practiceTypes.length > 0 && !practiceTypes.includes(session.movement_type)) return false;
    }
    return true;
  });

  return NextResponse.json({ requests: eligible });
}
