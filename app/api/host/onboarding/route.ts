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

// GET — fetch my host row, if any
export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const admin = getAdmin();
  const { data } = await admin.from("hosts").select("*").eq("auth_user_id", user.id).single();
  return NextResponse.json({ host: data ?? null });
}

// PATCH — create or update my host profile
export async function PATCH(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const body = await request.json();
  const { name, roles, practiceTypes, neighbourhoods, bio, avatarUrl } = body;

  if (!name || !Array.isArray(roles) || roles.length === 0) {
    return NextResponse.json({ error: "Name and at least one role are required" }, { status: 400 });
  }

  const admin = getAdmin();
  const { data: existing } = await admin.from("hosts").select("id").eq("auth_user_id", user.id).single();

  const neighbourhoodList: string[] = Array.isArray(neighbourhoods) ? neighbourhoods : [];
  const updates: Record<string, unknown> = {
    name,
    roles,
    practice_types: practiceTypes ?? [],
    neighbourhoods: neighbourhoodList,
    neighbourhood: neighbourhoodList[0] || "",
    bio: bio || null,
  };
  if (avatarUrl) updates.avatar_url = avatarUrl;

  if (existing) {
    const { error } = await admin.from("hosts").update(updates).eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, hostId: existing.id });
  }

  const { data: created, error } = await admin
    .from("hosts")
    .insert({ auth_user_id: user.id, email: user.email!, vetting_status: "pending", ...updates })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.stretchyyoga.co.nz";
    const roleLabel = roles.includes("teacher") && roles.includes("gem")
      ? "teacher & GEM"
      : roles.includes("teacher") ? "teacher" : "GEM";
    resend.emails
      .send({
        from: "Stretchy <hello@stretchy.social>",
        to: "kimberley@stretchyyoga.co.nz",
        subject: `New ${roleLabel} application — ${name}`,
        text: `${name} just applied to be a ${roleLabel}.\n\nReview it: ${appUrl}/admin/people?tab=${roles.includes("teacher") ? "teachers" : "gems"}`,
      })
      .catch((e) => console.error("New application email error:", e));
  }

  return NextResponse.json({ ok: true, hostId: created.id });
}
