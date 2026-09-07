import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { data: { user } } = await anonClient.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { session_id, rating, tags, note, suggestion, anonymous } = await request.json();
  if (!session_id || !rating) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const admin = getAdmin();
  const { data: attendee } = await admin.from("attendees").select("id, name").eq("auth_user_id", user.id).single();

  await admin.from("ratings").insert({
    session_id,
    attendee_id: anonymous ? null : (attendee?.id ?? null),
    stars: rating,
    vibe_chips: tags ?? [],
    note_to_host: note ?? null,
  });

  // Forward suggestion to kimberley@stretchyyoga.co.nz, and save it so it
  // shows up in /admin/feedback alongside teacher/GEM feedback.
  if (suggestion?.trim()) {
    const { data: session } = await admin.from("sessions").select("title").eq("id", session_id).single();
    const authorName = anonymous ? "Anonymous" : (attendee?.name ?? "A Stretchy member");

    await admin.from("hq_feedback").insert({
      host_id: null,
      author_name: authorName,
      area: "A session",
      category: "Suggestion",
      message: suggestion.trim(),
      session_context: session?.title ?? null,
      image_urls: [],
    }).then(({ error }) => { if (error) console.error("Suggestion save error:", error); });

    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    resend.emails.send({
      from: "Stretchy <hello@stretchy.social>",
      to: "kimberley@stretchyyoga.co.nz",
      subject: `New session suggestion from a Stretchy member`,
      text: `Session: ${session?.title ?? session_id}\nFrom: ${authorName}\n\nSuggestion:\n${suggestion}`,
    }).catch(console.error);
  }

  return NextResponse.json({ ok: true });
}
