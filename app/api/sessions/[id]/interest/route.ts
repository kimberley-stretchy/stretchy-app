import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// POST   /api/sessions/[id]/interest  → mark the current user "interested"
// DELETE /api/sessions/[id]/interest  → un-mark
//
// "Interested" is a single toggle: a light "notify me about this one" signal.
// Interested people receive the 38h "almost there / it's on / not this time"
// nudges even though they haven't held a paid spot.

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
}

// Identity from the caller's own session cookie, falling back to a Bearer token
// (the session page sends the token) — same pattern as /api/holds.
async function getUserId(request: NextRequest): Promise<string | null> {
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
  return user?.id ?? null;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { id: sessionId } = await params;
  const admin = getAdmin();

  // Ensure the session exists and is live before recording interest.
  const { data: session } = await admin
    .from("sessions")
    .select("id, state")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  // Idempotent — unique (session_id, user_id). Ignore a duplicate insert.
  const { error } = await admin
    .from("session_interest")
    .upsert({ session_id: sessionId, user_id: userId }, { onConflict: "session_id,user_id", ignoreDuplicates: true });

  if (error) {
    console.error("Interest insert error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ interested: true });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { id: sessionId } = await params;
  const admin = getAdmin();

  const { error } = await admin
    .from("session_interest")
    .delete()
    .eq("session_id", sessionId)
    .eq("user_id", userId);

  if (error) {
    console.error("Interest delete error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ interested: false });
}
