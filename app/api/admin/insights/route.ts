import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";
import { computeInsights, type InsightSession, type InsightHold } from "@/lib/insights";

// GET /api/admin/insights — HQ → Insights (lib/insights.ts does the maths).
export async function GET(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) },
  });

  // Page through everything (the database hands back 1,000 rows at a time).
  async function all<T>(table: string, cols: string, filter: (q: any) => any): Promise<T[]> { // eslint-disable-line @typescript-eslint/no-explicit-any
    const out: T[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await filter(admin.from(table).select(cols)).range(from, from + 999);
      if (error) throw new Error(error.message);
      out.push(...((data ?? []) as T[]));
      if (!data || data.length < 1000) return out;
    }
  }

  try {
    const now = new Date();
    const sessions = await all<InsightSession>("sessions", "id, title, starts_at, state, is_draft", (q) => q.lt("starts_at", now.toISOString()).order("starts_at"));
    const holds = await all<InsightHold>("holds", "session_id, user_id, quantity, is_comp, checked_in_at", (q) => q.in("state", ["active", "confirmed", "charged"]).order("id"));
    return NextResponse.json(computeInsights(sessions, holds, now));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't load insights." }, { status: 500 });
  }
}
