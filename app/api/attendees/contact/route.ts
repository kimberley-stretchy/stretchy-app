import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
}

// POST /api/attendees/contact — save the signed-in person's first name and
// (optional) mobile. Asked for at first booking, so the teacher knows who's
// coming and HQ can reach someone quickly on the day. Body: { name?, phone? }.
// Only ever updates the caller's own profile.
export async function POST(request: NextRequest) {
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

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, string | null> = {};

  if (typeof body.name === "string") {
    const name = body.name.replace(/\s+/g, " ").trim().slice(0, 80);
    if (!name || name.includes("@")) {
      return NextResponse.json({ error: "Pop in your first name so your teacher knows who’s coming." }, { status: 400 });
    }
    updates.name = name;
  }
  if (typeof body.phone === "string") {
    const phone = body.phone.trim();
    if (phone) {
      // Digits, spaces, + ( ) - only; 7–15 digits. Stored tidied, not reformatted.
      const digits = phone.replace(/\D/g, "");
      if (!/^[+\d\s()-]+$/.test(phone) || digits.length < 7 || digits.length > 15) {
        return NextResponse.json({ error: "That mobile number doesn’t look right. You can also leave it blank." }, { status: 400 });
      }
      updates.phone = phone.replace(/\s+/g, " ").slice(0, 24);
    }
  }
  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true });

  const { error } = await getAdmin().from("attendees").update(updates).eq("auth_user_id", user.id);
  if (error) {
    console.error("Contact details save error:", error);
    return NextResponse.json({ error: "Couldn’t save your details. Please try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
