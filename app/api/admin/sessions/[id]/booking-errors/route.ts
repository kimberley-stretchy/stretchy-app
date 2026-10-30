import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";

// GET /api/admin/sessions/[id]/booking-errors — every message the booking
// pop-up showed someone for this session (newest first), so HQ can see what
// people saw when booking didn't go smoothly.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;
  const { id } = await params;
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } });
  const { data, error } = await admin.from("booking_errors").select("id, created_at, email, stage, message, code, quantity").eq("session_id", id).order("created_at", { ascending: false }).limit(200);
  if (error) return NextResponse.json({ errors: [] });
  return NextResponse.json({ errors: data ?? [] });
}
