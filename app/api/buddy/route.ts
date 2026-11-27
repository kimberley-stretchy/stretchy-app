import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cleanHello, myBuddies } from "@/lib/buddy";
import { finalCharge } from "@/lib/sessionTimes";

// GET  /api/buddy?sessionId=…  → { on, hello, open, matched, buddies }
// POST /api/buddy  { sessionId, on, hello }  → same shape
//
// Buddy Me Up on someone's own booking (SOCIAL_BOOKING_BRIEF.md section 6).
// Only for the signed-in person, and only while they hold a place. Switching
// it off removes them from any match.
export const dynamic = "force-dynamic";

function getAdmin() {
  return createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) },
  });
}

async function signedInUser(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  });
  let { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (token) { const { data } = await supabase.auth.getUser(token); user = data.user; }
  }
  return user;
}

const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

async function state(admin: ReturnType<typeof getAdmin>, sessionId: string, userId: string) {
  const [{ data: session }, { data: hold }, { data: optin }] = await Promise.all([
    admin.from("sessions").select("id, starts_at, state").eq("id", sessionId).maybeSingle(),
    admin.from("holds").select("id").eq("session_id", sessionId).eq("user_id", userId).eq("state", "active").limit(1).maybeSingle(),
    admin.from("buddy_optins").select("hello").eq("session_id", sessionId).eq("user_id", userId).maybeSingle(),
  ]);
  if (!session || !hold) return null;
  // Open until joining closes (30 mins before), and never for a called-off session.
  const open = session.state !== "cancelled" && session.state !== "locked" && new Date() < finalCharge(session.starts_at);
  const buddies = optin ? await myBuddies(admin, sessionId, userId) : [];
  return { on: !!optin, hello: optin?.hello ?? "", open, matched: buddies.length > 0, buddies };
}

export async function GET(request: NextRequest) {
  const user = await signedInUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!isUuid(sessionId)) return NextResponse.json({ error: "Missing session" }, { status: 400 });
  const s = await state(getAdmin(), sessionId, user.id);
  if (!s) return NextResponse.json({ error: "You don't have a place at this session." }, { status: 404 });
  return NextResponse.json(s);
}

export async function POST(request: NextRequest) {
  const user = await signedInUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (!isUuid(body.sessionId)) return NextResponse.json({ error: "Missing session" }, { status: 400 });
  const admin = getAdmin();
  const before = await state(admin, body.sessionId, user.id);
  if (!before) return NextResponse.json({ error: "You don't have a place at this session." }, { status: 404 });

  if (body.on === false) {
    await admin.from("buddy_matches").delete().eq("session_id", body.sessionId).eq("user_id", user.id);
    await admin.from("buddy_optins").delete().eq("session_id", body.sessionId).eq("user_id", user.id);
  } else {
    if (!before.open) return NextResponse.json({ error: "Joining has closed for this one, so Buddy Me Up has too." }, { status: 400 });
    const cleaned = cleanHello(body.hello);
    if ("error" in cleaned) return NextResponse.json({ error: cleaned.error }, { status: 400 });
    const { error } = await admin.from("buddy_optins").upsert(
      { session_id: body.sessionId, user_id: user.id, hello: cleaned.hello, updated_at: new Date().toISOString() },
      { onConflict: "session_id,user_id" }
    );
    if (error) {
      console.error("buddy_optins save error:", error);
      return NextResponse.json({ error: "Couldn't save that. Try again." }, { status: 500 });
    }
  }
  return NextResponse.json(await state(admin, body.sessionId, user.id));
}
