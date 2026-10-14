import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// A person's own "moving with care" note: read it, save it, clear it.
// Only ever the signed-in person's own note.
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
    if (token) { const { data } = await supabase.auth.getUser(token); user = data.user; }
  }
  return user;
}

export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const { data, error } = await getAdmin().from("attendees").select("moving_with_care_note").eq("auth_user_id", user.id).maybeSingle();
  // available:false → the database isn't ready for notes yet; the card hides itself.
  if (error) return NextResponse.json({ available: false, note: "" });
  return NextResponse.json({ available: true, note: data?.moving_with_care_note ?? "" });
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const { note } = await request.json().catch(() => ({}));
  const text = typeof note === "string" ? note.trim().slice(0, 500) : "";
  const { error } = await getAdmin()
    .from("attendees")
    .update({ moving_with_care_note: text || null, moving_with_care_duration: text ? "until_changed" : null, moving_with_care_ends_at: null })
    .eq("auth_user_id", user.id);
  if (error) return NextResponse.json({ error: "Couldn’t save your note. Please try again." }, { status: 500 });
  return NextResponse.json({ ok: true, note: text });
}
