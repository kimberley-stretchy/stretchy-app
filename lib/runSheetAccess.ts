import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireHost } from "@/lib/hostAuth";
import { requireAdmin } from "@/lib/adminAuth";

// Shared by the run sheet APIs (roster, check-in snapshot): who's looking at a
// session's run sheet, and may they?

export function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
}

export async function getUser(request: NextRequest) {
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

// Who's looking, and may they? The session's teacher, its GEM — or Stretchy HQ,
// who can open any run sheet (Kimberley often leads a session herself, and
// needs to be able to check people in when there's no GEM yet).
export async function getViewer(request: NextRequest, sessionId: string) {
  const admin = getAdmin();
  const { data: session } = await admin
    .from("sessions")
    .select("id, title, movement_type, starts_at, location_name, host_id, gem_host_id, min_attendees, social_stretch_venue, spotify_playlist_url")
    .eq("id", sessionId)
    .single();

  const hq = await requireAdmin(request);
  const isHQ = !("error" in hq);

  const gate = await requireHost(request);
  if ("error" in gate) {
    if (!isHQ) return { error: gate.error } as const;
    if (!session) return { error: NextResponse.json({ error: "Session not found" }, { status: 404 }) } as const;
    return { admin, me: { id: "hq", name: "Stretchy HQ" }, session, role: "hq" as const } as const;
  }

  const user = await getUser(request);
  if (!user) return { error: NextResponse.json({ error: "Not logged in" }, { status: 401 }) } as const;

  const { data: me } = await admin.from("hosts").select("id, name").eq("auth_user_id", user.id).single();
  if (!me) return { error: NextResponse.json({ error: "No host profile found" }, { status: 400 }) } as const;
  if (!session) return { error: NextResponse.json({ error: "Session not found" }, { status: 404 }) } as const;

  const role: "teacher" | "gem" | "hq" | null =
    session.gem_host_id === me.id ? "gem" : session.host_id === me.id ? "teacher" : isHQ ? "hq" : null;
  if (!role) return { error: NextResponse.json({ error: "Not assigned to this session" }, { status: 403 }) } as const;

  return { admin, me, session, role } as const;
}
