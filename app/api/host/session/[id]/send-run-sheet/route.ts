import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Resend } from "resend";

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

// POST /api/host/session/[id]/send-run-sheet — GEM sends a check-in snapshot to HQ.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin = getAdmin();
  const { data: me } = await admin.from("hosts").select("id, name").eq("auth_user_id", user.id).single();
  if (!me) return NextResponse.json({ error: "No host profile found" }, { status: 400 });

  const { data: session } = await admin
    .from("sessions")
    .select("id, title, starts_at, location_name, gem_host_id")
    .eq("id", id)
    .single();
  if (!session || session.gem_host_id !== me.id) {
    return NextResponse.json({ error: "Only the GEM can send the run sheet" }, { status: 403 });
  }

  const { data: holds } = await admin
    .from("holds")
    .select("id, checked_in_at")
    .eq("session_id", id)
    .in("state", ["active", "confirmed", "charged"]);

  const total = holds?.length ?? 0;
  const checkedIn = (holds ?? []).filter((h) => h.checked_in_at).length;

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails
      .send({
        from: "Stretchy <hello@stretchyyoga.co.nz>",
        to: "kimberley@stretchyyoga.co.nz",
        subject: `Run sheet — ${session.title}`,
        text: `${me.name} sent the run sheet for ${session.title} (${session.location_name}).\n\nChecked in: ${checkedIn} of ${total}.`,
      })
      .catch((e) => console.error("Run sheet email error:", e));
  }

  return NextResponse.json({ ok: true, checkedIn, total });
}
