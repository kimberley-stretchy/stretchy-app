import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";
import { DIRECT_SOURCE, BETA_SOURCE } from "@/lib/socialResearch";

// GET /api/admin/social-research — every stretchy.social/research response, newest first.
// POST — HQ adds a general comment: feedback that came by email, DM or chat.
// POST { kind: "beta" } — HQ adds someone to the Beta testers list.
// DELETE ?id= — removes a general comment or hand-added beta tester (survey
// responses can't be deleted here).
export async function GET(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
  const { data, error } = await admin.from("social_research").select("*").order("created_at", { ascending: false }).limit(2000);
  if (error) return NextResponse.json({ items: [], setupNeeded: true, error: "The research table hasn’t been set up yet." });
  // Anyone who signed up through the stretchy.social "Beta test" form.
  const { data: betaLeads } = await admin.from("social_leads").select("id, created_at, name, email, organisation").eq("type", "beta").order("created_at", { ascending: false });
  return NextResponse.json({ items: data ?? [], betaLeads: betaLeads ?? [] });
}

const clean = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const db = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;
  const b = await request.json().catch(() => ({}));
  if (b.kind === "beta") {
    const email = clean(b.email, 200)?.toLowerCase() ?? null;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ error: "Add a valid email." }, { status: 400 });
    const { data, error } = await db().from("social_research").insert({
      name: clean(b.name, 120),
      organisation: clean(b.organisation, 160),
      email,
      source: BETA_SOURCE,
      answers: { note: clean(b.note, 500) ?? "" },
    }).select("*").single();
    if (error) return NextResponse.json({ error: "Couldn’t save that. Try again." }, { status: 500 });
    return NextResponse.json({ ok: true, item: data });
  }
  const comment = clean(b.comment, 5000);
  if (!comment) return NextResponse.json({ error: "Add what they said." }, { status: 400 });
  const themes = (typeof b.themes === "string" ? b.themes.split(",") : []).map((t: string) => t.trim()).filter(Boolean).slice(0, 12);
  const { data, error } = await db().from("social_research").insert({
    name: clean(b.name, 120),
    organisation: clean(b.organisation, 160),
    source: DIRECT_SOURCE,
    answers: { general_comment: comment, themes, channel: clean(b.channel, 40) ?? "" },
  }).select("*").single();
  if (error) return NextResponse.json({ error: "Couldn’t save that. Try again." }, { status: 500 });
  return NextResponse.json({ ok: true, item: data });
}

export async function DELETE(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { error } = await db().from("social_research").delete().eq("id", id).in("source", [DIRECT_SOURCE, BETA_SOURCE]);
  if (error) return NextResponse.json({ error: "Couldn’t delete that. Try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
