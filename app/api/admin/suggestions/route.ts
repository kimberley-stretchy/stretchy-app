import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
}

// GET /api/admin/suggestions — the board, plus (HQ only) who suggested each one
// and whether they asked to hear if it goes ahead. The public /api/suggestions
// route never returns contact details.
export async function GET(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  const admin = getAdmin();
  const { data, error } = await admin
    .from("suggestions")
    .select("id, session_type, preferred_neighbourhood, preferred_time, notes, vote_count, created_at")
    .order("vote_count", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Tolerate the contacts table not existing yet (migration not run).
  const { data: contacts, error: contactsErr } = await admin
    .from("suggestion_contacts")
    .select("*")
    .order("created_at", { ascending: true });
  if (contactsErr) console.error("Suggestion contacts read error:", contactsErr);

  const bySuggestion = new Map<string, { name: string | null; email: string; notify: boolean; kind: string }[]>();
  for (const c of contacts ?? []) {
    const list = bySuggestion.get(c.suggestion_id) ?? [];
    list.push({ name: c.name, email: c.email, notify: c.notify, kind: c.kind ?? "suggester" });
    bySuggestion.set(c.suggestion_id, list);
  }

  return NextResponse.json({
    items: (data ?? []).map((s) => ({ ...s, contacts: bySuggestion.get(s.id) ?? [] })),
    contactsAvailable: !contactsErr,
  });
}
