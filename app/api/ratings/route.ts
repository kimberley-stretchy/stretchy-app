import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { data: { user } } = await anonClient.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { session_id, rating, tags, note } = await request.json();
  if (!session_id || !rating) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const admin = getAdmin();
  const { data: attendee } = await admin.from("attendees").select("id").eq("auth_user_id", user.id).single();

  await admin.from("ratings").insert({
    session_id,
    attendee_id: attendee?.id,
    rating,
    tags: tags ?? [],
    note: note ?? null,
  });  // non-blocking, ignore errors

  return NextResponse.json({ ok: true });
}
