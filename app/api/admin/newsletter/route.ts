import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/admin/newsletter — everyone who's signed up for Stretchy Updates, newest first.
export async function GET() {
  const admin = getAdmin();
  const { data, error } = await admin
    .from("newsletter_signups")
    .select("email, created_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ signups: data ?? [] });
}
