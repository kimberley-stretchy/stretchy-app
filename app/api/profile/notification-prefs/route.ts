import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

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

// GET /api/profile/notification-prefs — this attendee's saved per-category toggles
export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin = getAdmin();
  const { data } = await admin
    .from("attendees")
    .select("notification_prefs")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return NextResponse.json({ prefs: data?.notification_prefs ?? {} });
}

// PATCH /api/profile/notification-prefs — merge in updated toggles
export async function PATCH(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { prefs } = await request.json();
  if (!prefs || typeof prefs !== "object") {
    return NextResponse.json({ error: "Missing prefs" }, { status: 400 });
  }

  const admin = getAdmin();
  const { error } = await admin
    .from("attendees")
    .update({ notification_prefs: prefs })
    .eq("auth_user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
