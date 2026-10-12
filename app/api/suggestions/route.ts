import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
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
  const { session_type, neighbourhood, preferred_time, notes } = body;

  if (!session_type) return NextResponse.json({ error: "Missing session_type" }, { status: 400 });

  // Optional contact — only sent when the person opted in to hear if this one
  // goes ahead. Never stored on the public `suggestions` row.
  const contactName = typeof body.contact?.name === "string" ? body.contact.name.trim().slice(0, 120) : "";
  const contactEmail = typeof body.contact?.email === "string" ? body.contact.email.trim().toLowerCase().slice(0, 200) : "";
  const wantsNotify = body.contact?.notify === true;
  if (wantsNotify && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return NextResponse.json({ error: "Pop in a valid email so we can tell you if it happens." }, { status: 400 });
  }

  // Note: the public /suggest form also sends a `details` object (movement,
  // days, neighbourhoods, etc.) but the suggestions table has no such column
  // — every real submission was failing outright before this was dropped
  // here. Nothing currently reads `details` back, so it's just omitted.
  const { data, error } = await admin
    .from("suggestions")
    .insert({
      session_type,
      preferred_neighbourhood: neighbourhood || null,
      preferred_time: preferred_time || null,
      notes: notes || null,
      vote_count: 1,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Private contact row (service-role only table). A failure here must not
  // lose the suggestion itself — it's flagged in the HQ email instead.
  let contactSaved = false;
  if (wantsNotify && contactEmail) {
    const { error: contactErr } = await admin.from("suggestion_contacts").insert({
      suggestion_id: data.id,
      name: contactName || null,
      email: contactEmail,
      notify: true,
    });
    if (contactErr) console.error("Suggestion contact save error:", contactErr);
    contactSaved = !contactErr;
  }

  // Notify HQ.
  if (process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const summary = [session_type.replace(/_/g, " "), neighbourhood, preferred_time].filter(Boolean).join(" · ");
    await resend.emails
      .send({
        from: "Stretchy <hello@stretchyyoga.co.nz>",
        to: "kimberley@stretchyyoga.co.nz",
        subject: `New Stretchy suggestion — ${summary}`,
        text:
          `${summary}${notes ? `\n\n${notes}` : ""}\n\n` +
          (wantsNotify
            ? `From: ${contactName ? `${contactName} · ` : ""}${contactEmail}\nOpted in: wants to hear if this one goes ahead.${contactSaved ? "" : "\n⚠️ Their details did NOT save to HQ — keep this email."}`
            : "No contact details left (didn't opt in).") +
          `\n\nView the board: https://www.stretchyyoga.co.nz/admin/suggestions`,
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
