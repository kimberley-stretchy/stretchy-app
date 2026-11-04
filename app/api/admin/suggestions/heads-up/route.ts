import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";
import { HQ_EMAIL } from "@/lib/stretchy-email";
import { upcomingGroups, matchGroup, renderHeadsUp, sendHeadsUp, headsUpType } from "@/lib/suggestionHeadsUp";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
}

// GET /api/admin/suggestions/heads-up — the upcoming session groups, who has
// already been told about each, and the best-guess group for each suggestion.
export async function GET(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;
  const admin = getAdmin();
  const [groups, { data: log }, { data: suggestions }] = await Promise.all([
    upcomingGroups(admin),
    admin.from("email_log").select("recipient, email_type").like("email_type", "suggestion_heads_up_%").eq("status", "sent"),
    admin.from("suggestions").select("id, preferred_neighbourhood, preferred_time"),
  ]);
  const sent: Record<string, string[]> = {};
  for (const g of groups) sent[g.key] = (log ?? []).filter((l) => l.email_type === headsUpType(g.key)).map((l) => (l.recipient ?? "").toLowerCase());
  const options = groups.map((g) => ({ key: g.key, title: g.title, count: g.sessions.length, firstAt: g.sessions[0].starts_at }));
  const suggested: Record<string, string | null> = {};
  for (const s of suggestions ?? []) suggested[s.id] = matchGroup(s.preferred_neighbourhood, s.preferred_time, options);
  return NextResponse.json({ groups: options, sent, suggested });
}

// POST /api/admin/suggestions/heads-up — { mode, suggestionId, groupKey, emails? }
//   preview → the email as it will look
//   test    → one copy to HQ only
//   send    → to the ticked people on this suggestion who asked to hear,
//             skipping anyone already told about these sessions.
export async function POST(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;
  const b = await request.json().catch(() => ({}));
  const admin = getAdmin();
  const group = (await upcomingGroups(admin)).find((g) => g.key === b.groupKey);
  if (!group) return NextResponse.json({ error: "Those sessions aren’t on the schedule." }, { status: 400 });

  if (b.mode === "preview") return NextResponse.json({ ok: true, ...renderHeadsUp(group) });
  if (b.mode === "test") {
    const ok = await sendHeadsUp(group, HQ_EMAIL, "Kimberley", "suggestion_test");
    return ok ? NextResponse.json({ ok: true, to: HQ_EMAIL }) : NextResponse.json({ error: "Couldn’t send the test." }, { status: 500 });
  }
  if (b.mode !== "send" || typeof b.suggestionId !== "string" || !Array.isArray(b.emails)) {
    return NextResponse.json({ error: "Nothing to send." }, { status: 400 });
  }

  // Only people on this suggestion who asked to hear; the browser isn't trusted for the list.
  const { data: contacts } = await admin.from("suggestion_contacts").select("name, email, notify").eq("suggestion_id", b.suggestionId).eq("notify", true);
  const { data: log } = await admin.from("email_log").select("recipient").eq("email_type", headsUpType(group.key)).eq("status", "sent");
  const told = new Set((log ?? []).map((l) => (l.recipient ?? "").toLowerCase()));
  const ticked = new Set(b.emails.map((e: unknown) => String(e).toLowerCase()));
  const seen = new Set<string>();
  const to = (contacts ?? []).filter((c) => {
    const e = (c.email ?? "").toLowerCase();
    if (!e || !ticked.has(e) || told.has(e) || seen.has(e)) return false;
    seen.add(e);
    return true;
  });

  const sent: string[] = [];
  const failed: string[] = [];
  for (const c of to) {
    (await sendHeadsUp(group, c.email, c.name)) ? sent.push(c.email) : failed.push(c.email);
    await new Promise((r) => setTimeout(r, 600)); // stay under the email provider's rate limit
  }
  return NextResponse.json({ ok: true, sent, failed, skipped: b.emails.length - to.length });
}
