import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";

// GET /api/admin/social — every stretchy.social lead (waitlist, beta test,
// partner & collab, invest), newest first, with any "Help shape" answers.
export async function GET(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
  const { data, error } = await admin.from("social_leads").select("*").order("created_at", { ascending: false }).limit(1000);
  if (error) return NextResponse.json({ items: [], setupNeeded: true, error: "The stretchy.social leads table hasn’t been set up yet." });
  return NextResponse.json({ items: data ?? [] });
}
