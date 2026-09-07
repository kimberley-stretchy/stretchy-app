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

  // Notify HQ and confirm to the signer — new signups only, fire and forget.
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

    resend.emails
      .send({
        from: "Stretchy <hello@stretchy.social>",
        to: cleanEmail,
        reply_to: "kimberley@stretchyyoga.co.nz",
        subject: "You're on the list. 🙌",
        text: `Thanks for signing up to Stretchy Updates — we'll be in touch as things come together.\n\nBrowse what's on: https://stretchyyoga.co.nz/sessions\n\nStretchy`,
        html: `<div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;background:#F7F0E8;padding:32px;border-radius:16px;"><h1 style="font-size:26px;font-weight:900;color:#14110F;margin:0 0 8px;">You&rsquo;re on the list. 🙌</h1><p style="color:#555;font-size:15px;margin:0 0 24px;">Thanks for signing up to Stretchy Updates — we&rsquo;ll be in touch as things come together.</p><a href="https://stretchyyoga.co.nz/sessions" style="display:inline-block;background:#14110F;color:#F7F0E8;text-decoration:none;font-size:13px;font-weight:700;padding:12px 22px;border-radius:8px;">Browse what&rsquo;s on →</a><p style="font-size:11px;color:#AAA;text-align:center;margin:24px 0 0;">Made with Love by <a href="https://studiodawn.org" style="color:#AAA;">Studio Dawn</a></p></div>`,
      })
      .catch((e) => console.error("Newsletter confirmation email error:", e));
  }

  return NextResponse.json({ ok: true });
}
