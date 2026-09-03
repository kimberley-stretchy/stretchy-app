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

// POST /api/host/feedback — Teacher/GEM feedback to Stretchy HQ.
export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin = getAdmin();
  const { data: me } = await admin.from("hosts").select("id, name").eq("auth_user_id", user.id).single();
  if (!me) return NextResponse.json({ error: "No host profile found" }, { status: 400 });

  const { area, category, message, sessionContext, imageUrls } = await request.json();
  if (!message || !message.trim()) return NextResponse.json({ error: "Add a note before sending." }, { status: 400 });

  const { error } = await admin.from("hq_feedback").insert({
    host_id: me.id,
    area: area || null,
    category: category || null,
    message: message.trim(),
    session_context: sessionContext || null,
    image_urls: Array.isArray(imageUrls) ? imageUrls : [],
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
