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

// POST /api/host/session/[id]/notices — GEM posts a notice for the room ("Notice from HQ" card).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin = getAdmin();
  const { data: me } = await admin.from("hosts").select("id, name").eq("auth_user_id", user.id).single();
  if (!me) return NextResponse.json({ error: "No host profile found" }, { status: 400 });

  const { data: session } = await admin.from("sessions").select("gem_host_id").eq("id", id).single();
  if (!session || session.gem_host_id !== me.id) {
    return NextResponse.json({ error: "Only the GEM can add a notice" }, { status: 403 });
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
