import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";

// GET /api/admin/australia — the Sydney waitlist, newest first, plus how many
// Australian visitors the pop-up has seen, by state.
export async function GET(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } });
  const [{ data: items, error }, { data: visits }] = await Promise.all([
    admin.from("au_waitlist").select("*").order("created_at", { ascending: false }).limit(5000),
    admin.from("au_visits").select("state").limit(50000),
  ]);
  if (error) return NextResponse.json({ items: [], visits: {}, setupNeeded: true, error: "The Australia tables haven’t been set up yet." });
  const byState: Record<string, number> = {};
  for (const v of visits ?? []) byState[v.state || "Unknown"] = (byState[v.state || "Unknown"] ?? 0) + 1;
  return NextResponse.json({ items: items ?? [], visits: byState });
}
