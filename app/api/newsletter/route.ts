import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  const { email } = await request.json();
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  const cleanEmail = email.trim().toLowerCase();

  const admin = getAdmin();
  const { data: existing } = await admin
    .from("newsletter_signups")
    .select("email")
    .eq("email", cleanEmail)
    .maybeSingle();

  const { error } = await admin
    .from("newsletter_signups")
    .upsert({ email: cleanEmail }, { onConflict: "email", ignoreDuplicates: true });

  if (error) {
    console.error("Newsletter signup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notify HQ of new signups only (not repeat submissions) — fire and forget.
  if (!existing && process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    resend.emails
      .send({
        from: "Stretchy <hello@stretchy.social>",
        to: "kimberley@stretchyyoga.co.nz",
        subject: `New Stretchy Updates signup — ${cleanEmail}`,
        text: `${cleanEmail} just signed up for Stretchy Updates.`,
      })
      .catch((e) => console.error("Newsletter notify email error:", e));
  }

  return NextResponse.json({ ok: true });
}
