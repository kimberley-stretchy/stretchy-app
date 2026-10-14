import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";

// HQ's team notices: list them all, post one, remove one.
function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
}

const NOT_SET_UP = "Team notices aren’t switched on yet — the database step hasn’t been run.";

export async function GET(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;
  const { data, error } = await getAdmin()
    .from("team_notices")
    .select("id, message, author_name, created_at, expires_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return NextResponse.json({ items: [], setupNeeded: true, error: NOT_SET_UP });
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;
  const { message, showUntil } = await request.json().catch(() => ({}));
  const text = typeof message === "string" ? message.trim() : "";
  if (!text) return NextResponse.json({ error: "Write a notice first." }, { status: 400 });
  if (text.length > 600) return NextResponse.json({ error: "Keep it under 600 characters." }, { status: 400 });

  // "Show until" is a date; the notice stays up to the END of that day in Auckland.
  let expires_at: string | null = null;
  if (typeof showUntil === "string" && /^\d{4}-\d{2}-\d{2}$/.test(showUntil)) {
    const endOfDay = new Date(`${showUntil}T23:59:59+13:00`);
    if (!isNaN(endOfDay.getTime())) expires_at = endOfDay.toISOString();
  }

  const { data, error } = await getAdmin()
    .from("team_notices")
    .insert({ message: text, author_name: "Kimberley", expires_at })
    .select("id, message, author_name, created_at, expires_at")
    .single();
  if (error) return NextResponse.json({ error: NOT_SET_UP }, { status: 500 });
  return NextResponse.json({ notice: data });
}

export async function DELETE(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { error } = await getAdmin().from("team_notices").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
