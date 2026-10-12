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

// POST /api/suggestions/contact — someone who said "me too" on the board leaves
// their email to hear if that suggestion goes ahead. Body: { id, email }.
// Stored in the private suggestion_contacts table (service-role only), never on
// the public suggestion row.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : "";

  if (!id) return NextResponse.json({ error: "Missing suggestion" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "That email doesn't look right." }, { status: 400 });
  }

  const admin = getAdmin();
  const { data: suggestion } = await admin
    .from("suggestions")
    .select("id, session_type, preferred_neighbourhood, preferred_time, vote_count")
    .eq("id", id)
    .maybeSingle();
  if (!suggestion) return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });

  // Already on the list for this one — nothing to do, and no second HQ email.
  const { data: existing } = await admin
    .from("suggestion_contacts")
    .select("id")
    .eq("suggestion_id", id)
    .ilike("email", email)
    .maybeSingle();
  if (existing) return NextResponse.json({ ok: true });

  let { error } = await admin
    .from("suggestion_contacts")
    .insert({ suggestion_id: id, email, notify: true, kind: "me_too" });
  // `kind` column not added yet — still save the contact.
  if (error && /kind/.test(error.message)) {
    ({ error } = await admin.from("suggestion_contacts").insert({ suggestion_id: id, email, notify: true }));
  }
  if (error) {
    console.error("Me-too contact save error:", error);
    return NextResponse.json({ error: "Couldn't save that — try again." }, { status: 500 });
  }

  if (process.env.RESEND_API_KEY) {
    const summary = [suggestion.session_type?.replace(/_/g, " "), suggestion.preferred_neighbourhood, suggestion.preferred_time]
      .filter(Boolean)
      .join(" · ");
    await new Resend(process.env.RESEND_API_KEY).emails
      .send({
        from: "Stretchy <hello@stretchyyoga.co.nz>",
        to: "kimberley@stretchyyoga.co.nz",
        subject: `Me too — ${summary}`,
        text: `${email} said "me too" and wants to hear if this one goes ahead.\n\n${summary}\n${suggestion.vote_count} want it so far.\n\nView the board: https://www.stretchyyoga.co.nz/admin/suggestions`,
      })
      .catch((e) => console.error("Me-too notify email error:", e));
  }

  return NextResponse.json({ ok: true });
}
