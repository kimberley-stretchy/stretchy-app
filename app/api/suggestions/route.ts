import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET — fetch all suggestions with vote counts, ordered by votes desc
export async function GET() {
  const admin = getAdmin();
  const { data, error } = await admin
    .from("suggestions")
    .select("id, session_type, preferred_neighbourhood, preferred_time, notes, vote_count, created_at")
    .order("vote_count", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// POST — create a new suggestion
export async function POST(request: NextRequest) {
  const admin = getAdmin();
  const body = await request.json();
  const { session_type, neighbourhood, preferred_time, notes, details } = body;

  if (!session_type) return NextResponse.json({ error: "Missing session_type" }, { status: 400 });

  const { data, error } = await admin
    .from("suggestions")
    .insert({
      session_type,
      preferred_neighbourhood: neighbourhood || null,
      preferred_time: preferred_time || null,
      notes: notes || null,
      details: details || {},
      vote_count: 1,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify HQ — fire and forget, never seen before this.
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const summary = [session_type.replace(/_/g, " "), neighbourhood, preferred_time].filter(Boolean).join(" · ");
    resend.emails
      .send({
        from: "Stretchy <hello@stretchy.social>",
        to: "kimberley@stretchyyoga.co.nz",
        subject: `New Stretchy suggestion — ${summary}`,
        text: `${summary}${notes ? `\n\n${notes}` : ""}\n\nView the board: https://stretchyyoga.co.nz/admin/suggestions`,
      })
      .catch((e) => console.error("Suggestion notify email error:", e));
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}

// PATCH — upvote a suggestion
export async function PATCH(request: NextRequest) {
  const admin = getAdmin();
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // Increment vote_count
  const { data: current } = await admin
    .from("suggestions")
    .select("vote_count")
    .eq("id", id)
    .single();

  const { error } = await admin
    .from("suggestions")
    .update({ vote_count: (current?.vote_count ?? 0) + 1 })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
