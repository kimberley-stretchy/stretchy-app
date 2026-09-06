import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireHost } from "@/lib/hostAuth";

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

// POST /api/host/substitute-requests/[id]/claim — first to claim wins. Race-safe: the
// update only succeeds if the request is still 'open', so a duplicate click or a second
// person hitting claim a moment later gets a clean "already filled" instead of a double-assign.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gate = await requireHost(request);
  if ("error" in gate) return gate.error;

  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin = getAdmin();
  const { data: me } = await admin.from("hosts").select("id, name, roles, vetting_status").eq("auth_user_id", user.id).single();
  if (!me) return NextResponse.json({ error: "No host profile found" }, { status: 400 });
  if (me.vetting_status !== "approved") {
    return NextResponse.json({ error: "Your application isn't approved yet" }, { status: 403 });
  }

  const { data: req } = await admin.from("substitute_requests").select("id, session_id, role, status").eq("id", id).single();
  if (!req) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  if (!(me.roles ?? []).includes(req.role)) {
    return NextResponse.json({ error: `You're not registered as a ${req.role}` }, { status: 403 });
  }

  const { data: claimed, error: claimError } = await admin
    .from("substitute_requests")
    .update({ status: "filled", filled_by_host_id: me.id, filled_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "open")
    .select("id")
    .single();

  if (claimError || !claimed) {
    return NextResponse.json({ error: "Someone else already took this one." }, { status: 409 });
  }

  const sessionUpdate = req.role === "teacher" ? { host_id: me.id } : { gem_host_id: me.id };
  await admin.from("sessions").update(sessionUpdate).eq("id", req.session_id);

  return NextResponse.json({ ok: true });
}
