import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireHost } from "@/lib/hostAuth";
import { requireAdmin } from "@/lib/adminAuth";

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
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

// POST /api/host/session/[id]/notices — a notice for the room on the day
// ("Side door's stuck, use the front"). The session's GEM or teacher, or HQ.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = getAdmin();
  const hq = await requireAdmin(request);
  const isHQ = !("error" in hq);

  let me: { id: string; name: string } | null = null;
  const gate = await requireHost(request);
  if ("error" in gate) {
    if (!isHQ) return gate.error;
    me = { id: "hq", name: "Stretchy HQ" };
  } else {
    const user = await getUser(request);
    if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
    ({ data: me } = await admin.from("hosts").select("id, name").eq("auth_user_id", user.id).single());
    if (!me) return NextResponse.json({ error: "No host profile found" }, { status: 400 });
  }

  const { data: session } = await admin.from("sessions").select("gem_host_id, host_id").eq("id", id).single();
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (!isHQ && session.gem_host_id !== me.id && session.host_id !== me.id) {
    return NextResponse.json({ error: "Only this session's teacher or GEM can add a notice" }, { status: 403 });
  }

  const { message } = await request.json();
  if (!message || !message.trim()) return NextResponse.json({ error: "Notice can't be empty" }, { status: 400 });

  const { data: notice, error } = await admin
    .from("session_notices")
    .insert({ session_id: id, author_name: me.name, message: message.trim() })
    .select("id, author_name, message, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notice });
}
