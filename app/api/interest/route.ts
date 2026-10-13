import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { sendApplicantConfirmation } from "@/lib/applicantEmail";

const VALID_TYPES = ["social_stretch", "teacher", "gem", "venue", "partner"];

// What HQ sees in the alert email, and where to review each kind of submission.
const TYPE_INFO: Record<string, { label: string; review: string }> = {
  teacher:        { label: "teacher application",      review: "/admin/people?tab=teachers" },
  gem:            { label: "GEM application",          review: "/admin/people?tab=gems" },
  venue:          { label: "venue offer",              review: "/admin/venues" },
  social_stretch: { label: "Social Stretch venue",     review: "/admin/venues" },
  partner:        { label: "partner enquiry",          review: "/admin" },
};

function fieldLines(fields: unknown): string {
  if (!fields || typeof fields !== "object") return "";
  return Object.entries(fields as Record<string, unknown>)
    .map(([k, v]) => {
      const value = Array.isArray(v) ? v.filter(Boolean).join(", ") : v === true ? "yes" : v === false ? "no" : String(v ?? "");
      return value.trim() ? `${k}: ${value}` : null;
    })
    .filter(Boolean)
    .join("\n");
}

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, name, email, fields } = body;

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid submission type" }, { status: 400 });
  }

  const admin = getAdmin();
  const { error } = await admin.from("interest_submissions").insert({
    type,
    name: name || null,
    email: email || null,
    fields: fields || {},
  });

  if (error) {
    console.error("Interest submission error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Tell HQ. These forms used to save silently, so applications sat unseen
  // until someone happened to open HQ.
  if (process.env.RESEND_API_KEY) {
    const info = TYPE_INFO[type];
    const who = (typeof name === "string" && name.trim()) || (typeof email === "string" && email.trim()) || "Someone";
    const replyTo = typeof email === "string" && /^\S+@\S+\.\S+$/.test(email.trim()) ? email.trim() : undefined;
    const details = fieldLines(fields);
    await new Resend(process.env.RESEND_API_KEY).emails
      .send({
        from: "Stretchy HQ <hello@stretchyyoga.co.nz>",
        to: "kimberley@stretchyyoga.co.nz",
        ...(replyTo ? { reply_to: replyTo } : {}),
        subject: `New ${info.label} — ${who}`,
        text:
          `${who} just sent a ${info.label}.\n\n` +
          `Name: ${name || "—"}\nEmail: ${email || "—"}\n` +
          (details ? `\n${details}\n` : "") +
          `\nReview it: https://www.stretchyyoga.co.nz${info.review}` +
          (replyTo ? `\n\nReply to this email to answer them directly.` : ""),
      })
      .catch((e) => console.error("Interest notify email error:", e));
  }

  // Tell the applicant we've got it, and when they'll hear back.
  await sendApplicantConfirmation(type, name, email);

  return NextResponse.json({ ok: true });
}
