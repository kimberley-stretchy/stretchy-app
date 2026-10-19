import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { STEP2_A, STEP2_B, CURRENCIES, SPEND_KEYS, isHotLead } from "@/lib/socialLeads";
import { alertHQ } from "@/lib/socialLeadEmails";

// PATCH /api/social-lead/:id — the optional "Help shape Stretchy Social"
// answers, added to the row made by step 1. Only those fields, only once,
// and only within a day of the first submission. Emails Kimberley the answers,
// with a separate hot-lead flag when they're up for a chat and spend 150+ a month.

const ONE: Record<string, string[]> = Object.fromEntries([...STEP2_A, ...STEP2_B].filter((q) => !q.multi).map((q) => [q.k, q.o]));
const MANY: Record<string, string[]> = Object.fromEntries(STEP2_A.filter((q) => q.multi).map((q) => [q.k, q.o]));

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const b = await request.json().catch(() => ({}));

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: lead } = await admin.from("social_leads").select("id, created_at, step2_at").eq("id", id).maybeSingle();
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (lead.step2_at) return NextResponse.json({ ok: true });
  if (Date.now() - new Date(lead.created_at).getTime() > 86_400_000) return NextResponse.json({ error: "Too late to add answers." }, { status: 410 });

  const u: Record<string, unknown> = { step2_at: new Date().toISOString() };
  for (const [k, allowed] of Object.entries(ONE)) {
    if (k === "chat_ok" || k === "currency" || k === "monthly_spend") continue;
    if (typeof b[k] === "string" && allowed.includes(b[k])) u[k] = b[k];
  }
  for (const [k, allowed] of Object.entries(MANY)) {
    if (Array.isArray(b[k])) u[k] = b[k].filter((x: unknown) => typeof x === "string" && allowed.includes(x));
  }
  if (CURRENCIES.includes(b.currency)) u.currency = b.currency;
  if ((SPEND_KEYS as readonly string[]).includes(b.monthly_spend)) u.monthly_spend = b.monthly_spend;
  if (b.chat_ok === "Yes" || b.chat_ok === "No") u.chat_ok = b.chat_ok === "Yes";
  if (typeof b.headache === "string" && b.headache.trim()) u.headache = b.headache.trim().slice(0, 300);

  const { data, error } = await admin.from("social_leads").update(u).eq("id", id).is("step2_at", null).select("*").maybeSingle();
  if (error) return NextResponse.json({ error: "Couldn’t save that." }, { status: 500 });
  if (data) await alertHQ(data, { step2: true, hot: isHotLead(data) });
  return NextResponse.json({ ok: true });
}
