import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";
import { sendTeamWelcome } from "@/lib/teamWelcomeEmail";

// POST /api/admin/people/welcome — { hostId }. HQ resends the "Welcome to the
// team / how to sign in" email to an existing teacher or GEM (copied to HQ).
export async function POST(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;
  const { hostId } = await request.json().catch(() => ({}));
  if (!hostId) return NextResponse.json({ error: "Missing person" }, { status: 400 });
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: host } = await admin.from("hosts").select("name, email, roles").eq("id", hostId).maybeSingle();
  if (!host?.email) return NextResponse.json({ error: "They don’t have an email on file." }, { status: 400 });
  const sent = await sendTeamWelcome({ name: host.name ?? "", email: host.email, roles: host.roles ?? [] });
  if (!sent) return NextResponse.json({ error: "Couldn’t send it just now. Try again." }, { status: 500 });
  return NextResponse.json({ ok: true, email: host.email });
}
