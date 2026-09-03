import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "Stretchy <kimberley@stretchyyoga.co.nz>";

const S_PATH = `M0 172h18v1h-18zM0 173h19v1h-19zM0 174h20v1h-20zM0 175h21v1h-21zM0 176h22v2h-22zM0 178h23v1h-23zM0 179h24v1h-24zM0 180h25v1h-25zM0 181h26v2h-26zM0 183h27v1h-27zM0 184h28v1h-28zM0 185h29v2h-29zM0 187h30v1h-30zM0 188h31v1h-31zM0 189h32v1h-32zM0 190h33v1h-33zM1 167h13v1h-13zM1 168h14v1h-14zM1 169h15v1h-15zM1 170h16v2h-16zM1 191h33v2h-33zM1 193h34v1h-34zM1 194h35v1h-35zM1 195h36v1h-36zM1 196h37v1h-37zM1 197h38v1h-38zM7 116h197v1h-197zM9 125h200v1h-200zM95 46h119v1h-119z`;

function emailWaitlistConfirm(name: string, city: string, role: string) {
  const roleLabel = role === "host" ? "hosting" : role === "both" ? "moving and hosting" : "moving";
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; background: #F7F0E8; padding: 32px; border-radius: 16px;">
      <div style="display: flex; align-items: center; margin-bottom: 28px; gap: 10px;">
        <svg viewBox="0 0 220 257" width="32" height="37" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;"><path d="${S_PATH}" fill="#716F39"/></svg>
        <span style="font-size: 18px; font-weight: 900; color: #14110F; letter-spacing: -0.02em;">Stretchy</span>
      </div>

      <h1 style="font-size: 30px; font-weight: 900; color: #14110F; margin: 0 0 6px; letter-spacing: -0.02em;">You're on the list. 🌏</h1>
      <p style="color: #555; font-size: 15px; margin: 0 0 24px; line-height: 1.5;">Hey ${name} — thanks for signing up. You'll be among the first to know when Stretchy comes to ${city}.</p>

      <div style="background: #716F39; border-radius: 14px; padding: 22px; margin-bottom: 20px; color: white;">
        <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; opacity: 0.7; margin: 0 0 6px;">What to expect</p>
        <p style="font-size: 15px; margin: 0 0 8px; line-height: 1.5;">Community movement classes — yoga, pilates, breathwork and more — where the price drops as the group grows.</p>
        <p style="font-size: 13px; opacity: 0.8; margin: 0; line-height: 1.5;">You signed up as interested in <strong>${roleLabel}</strong>. ${role === "host" || role === "both" ? "We'll reach out about hosting opportunities too." : ""}</p>
      </div>

      <div style="background: white; border-radius: 14px; padding: 18px; margin-bottom: 20px;">
        <p style="font-size: 14px; font-weight: 700; color: #14110F; margin: 0 0 8px;">How it works</p>
        <p style="font-size: 13px; color: #666; margin: 0 0 6px; line-height: 1.5;">📍 Sessions are posted in your area</p>
        <p style="font-size: 13px; color: #666; margin: 0 0 6px; line-height: 1.5;">🔒 Hold your spot — nothing charged upfront</p>
        <p style="font-size: 13px; color: #666; margin: 0 0 6px; line-height: 1.5;">📉 Price drops as more people join</p>
        <p style="font-size: 13px; color: #666; margin: 0; line-height: 1.5;">🥂 Move together, then social stretch after</p>
      </div>

      <p style="font-size: 13px; color: #888; line-height: 1.6; margin: 0 0 16px;">In the meantime, follow along on Instagram for updates.</p>

      <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 8px;">
        <a href="https://www.instagram.com/stretchy.yoga/" style="display: inline-block; background: #14110F; color: #F7F0E8; text-decoration: none; font-size: 12px; font-weight: 700; padding: 10px 18px; border-radius: 8px; letter-spacing: 0.02em;">@stretchy.yoga →</a>
        <a href="https://www.instagram.com/stretchy.social/" style="display: inline-block; background: #14110F; color: #F7F0E8; text-decoration: none; font-size: 12px; font-weight: 700; padding: 10px 18px; border-radius: 8px; letter-spacing: 0.02em;">@stretchy.social →</a>
      </div>
      <p style="font-size: 12px; color: #AAA; margin: 0 0 20px; line-height: 1.5;">
        Follow the journey of how we're building this →
        <a href="https://www.instagram.com/caike.club/" style="color: #716F39; font-weight: 600; text-decoration: none;">@caike.club</a>
      </p>

      <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E0D8CE;">
        <p style="font-size: 12px; color: #888; text-align: center; margin: 0 0 12px;">
          Questions? <a href="mailto:kimberley@stretchyyoga.co.nz" style="color: #14110F; font-weight: 600; text-decoration: none;">kimberley@stretchyyoga.co.nz</a>
        </p>
        <p style="font-size: 11px; color: #BBB; text-align: center; margin: 0;">Stretchy Social Movement Club · Built in Aotearoa 🌿</p>
      </div>
    </div>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, city, role } = await request.json();

    if (!name || !email || !city) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    console.log("Waitlist signup:", { name, email, city, role });
    console.log("Env check — SUPABASE_URL:", !!process.env.NEXT_PUBLIC_SUPABASE_URL, "SERVICE_KEY:", !!process.env.SUPABASE_SERVICE_ROLE_KEY, "RESEND_KEY:", !!process.env.RESEND_API_KEY);

    // ── 1. Save to Supabase (service role bypasses RLS) ───────────────────────
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: dbError } = await supabase
      .from("waitlist")
      .insert({ name: name.trim(), email: email.trim().toLowerCase(), city: city.trim(), role });

    if (dbError && !dbError.code?.includes("23505")) {
      console.error("Waitlist DB error:", JSON.stringify(dbError));
    } else {
      console.log("Waitlist DB insert OK");
    }

    // ── 2. Send confirmation email ────────────────────────────────────────────
    const { error: resendError1 } = await resend.emails.send({
      from: FROM,
      to: email.trim(),
      subject: "You're on the Stretchy waitlist 🌏",
      html: emailWaitlistConfirm(name.trim(), city.trim(), role || "mover"),
    });
    if (resendError1) console.error("Resend user email error:", JSON.stringify(resendError1));
    else console.log("User confirmation email sent");

    // ── 3. Notify Kimberley ───────────────────────────────────────────────────
    const { error: resendError2 } = await resend.emails.send({
      from: FROM,
      to: "kimberley@stretchyyoga.co.nz",
      subject: `New waitlist signup — ${name} (${city})`,
      html: `<p><strong>${name}</strong> (${email}) just joined the waitlist.</p><p>City: ${city}<br>Role: ${role || "mover"}</p>`,
    });
    if (resendError2) console.error("Resend notify error:", JSON.stringify(resendError2));
    else console.log("Kimberley notification sent");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Waitlist API error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
