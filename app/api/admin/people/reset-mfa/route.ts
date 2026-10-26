import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";

// POST /api/admin/people/reset-mfa — { hostId }. For a teacher or GEM with a
// new phone or no access to their authenticator app: removes their
// authenticator, so their next sign-in shows a fresh QR code to set it up again.
// Nothing else about their account changes.
export async function POST(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;
  const { hostId } = await request.json().catch(() => ({}));
  if (!hostId) return NextResponse.json({ error: "Missing person" }, { status: 400 });

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: host } = await admin.from("hosts").select("auth_user_id").eq("id", hostId).maybeSingle();
  if (!host?.auth_user_id) return NextResponse.json({ error: "They haven’t signed in yet, so there’s nothing to reset." }, { status: 400 });

  const { data, error } = await admin.auth.admin.mfa.listFactors({ userId: host.auth_user_id });
  if (error) return NextResponse.json({ error: "Couldn’t reach their account. Try again." }, { status: 500 });
  const factors = data?.factors ?? [];
  for (const f of factors) {
    const { error: delErr } = await admin.auth.admin.mfa.deleteFactor({ id: f.id, userId: host.auth_user_id });
    if (delErr) return NextResponse.json({ error: "Couldn’t reset it. Try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, removed: factors.length });
}
