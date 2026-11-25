import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// GET /api/feedback/email?msg={emailType}&r=good|not_great
// "How was this email?" Good / Not great, tapped in an email footer. Saves the
// rating with which email it was (no name, no address), then opens /feedback
// so they can tell us more if they like.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const msg = (request.nextUrl.searchParams.get("msg") ?? "").trim();
  const r = request.nextUrl.searchParams.get("r");
  const type = /^[a-z0-9_]{2,60}$/.test(msg) ? msg : null;
  const rating = r === "good" || r === "not_great" ? r : null;

  if (type && rating) {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { error } = await admin.from("email_feedback").insert({ email_type: type, rating });
    if (error) console.error("email_feedback save error:", error);
  }

  const dest = new URL("/feedback", request.url);
  if (type) dest.searchParams.set("msg", type);
  if (rating) dest.searchParams.set("r", rating);
  return NextResponse.redirect(dest, { status: 303 });
}
