import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";

// GET /api/admin/social — every stretchy.social form submission (waitlist,
// enquiries, testing sign-ups), newest first. Same table as the main site's
// interest forms, told apart by type.
const PLATFORM_TYPES = ["platform_waitlist", "platform_enquiry", "platform_testing"];

export async function GET(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
  const { data, error } = await admin
    .from("interest_submissions")
    .select("id, type, name, email, fields, created_at")
    .in("type", PLATFORM_TYPES)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}
