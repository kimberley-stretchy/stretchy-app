import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { makeInviteCode } from "@/lib/invites";

export const dynamic = "force-dynamic";

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
    if (token) user = (await supabase.auth.getUser(token)).data.user;
  }
  return user;
}

// GET /api/profile/invite — this person's invite code (made the first time)
// and how many people have come to Stretchy through it. A count only.
export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin = getAdmin();
  const { data: me, error } = await admin
    .from("attendees")
    .select("id, name, email, invite_code")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Your invite link isn’t ready yet. Try again soon." }, { status: 500 });
  if (!me) return NextResponse.json({ error: "Hold your first place and your invite link will be ready." }, { status: 404 });

  let code: string | null = me.invite_code;
  for (let tries = 0; !code && tries < 5; tries++) {
    const next = makeInviteCode(me.name, me.email ?? user.email);
    const { error: upErr } = await admin.from("attendees").update({ invite_code: next }).eq("id", me.id).is("invite_code", null);
    if (!upErr) {
      const { data } = await admin.from("attendees").select("invite_code").eq("id", me.id).single();
      code = data?.invite_code ?? null;
    }
  }
  if (!code) return NextResponse.json({ error: "Your invite link isn’t ready yet. Try again soon." }, { status: 500 });

  const { count } = await admin.from("attendees").select("id", { count: "exact", head: true }).eq("invited_by", me.id);
  return NextResponse.json({ code, joined: count ?? 0 });
}
