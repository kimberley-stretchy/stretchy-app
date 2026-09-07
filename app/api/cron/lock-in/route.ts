import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { Resend } from "resend";
import { sendPushToUsers } from "@/lib/push-server";
import { calculatePrice } from "@/lib/pricing";

/**
 * GET /api/cron/lock-in
 *
 * Runs every 10 minutes via Vercel Cron.
 * Checks sessions starting in 1h50m–2h10m (the 2h window) and:
 *  - Captures each Stripe PaymentIntent (actual charge)
 *  - Updates holds to "charged" with the final amount
 *  - Marks session as "locked"
 *  - Sends "price locked — you're charged" email to each attendee
 */

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdmin();
  const stripe = getStripe();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://stretchyyoga.co.nz";

  const now = new Date();
  const windowStart = new Date(now.getTime() + 110 * 60 * 1000); // 1h50m
  const windowEnd   = new Date(now.getTime() + 130 * 60 * 1000); // 2h10m

  // Find confirmed sessions starting in the 2h window
  const { data: sessions } = await admin
    .from("sessions")
    .select("id, title, starts_at, location_name, cost_base, revenue_target, min_attendees, max_attendees, social_stretch_venue, state")
    .eq("state", "confirmed")
    .gte("starts_at", windowStart.toISOString())
    .lte("starts_at", windowEnd.toISOString());

  if (!sessions || sessions.length === 0) {
    return NextResponse.json({ locked: 0, message: "No sessions in 2h window" });
  }

  const results = [];

  for (const session of sessions) {
    // Get all active holds
    const { data: holds } = await admin
      .from("holds")
      .select("id, user_id, stripe_pi_id")
      .eq("session_id", session.id)
      .eq("state", "active");

    if (!holds || holds.length === 0) continue;

    const totalHolds = holds.length;
    // Final price never rises above the opening price at min_attendees — floor it at the minimum
    const finalPrice = calculatePrice(session.cost_base, session.revenue_target, Math.max(totalHolds, session.min_attendees));
    const finalAmountCents = Math.round(finalPrice * 100);

    const startDate = new Date(session.starts_at);
    const dateStr = startDate.toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "long", day: "numeric", month: "long" }) +
      " at " + startDate.toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit", hour12: true });

    let charged = 0;
    let failed = 0;

    // Capture each unique Stripe PaymentIntent
    const piIds = Array.from(new Set(holds.map(h => h.stripe_pi_id).filter(Boolean)));

    for (const piId of piIds) {
      try {
        const pi = await stripe.paymentIntents.retrieve(piId);

        if (pi.status === "requires_capture") {
          // Adjust the amount to the final price (it may have been authorised at a higher price)
          const holdsForThisPi = holds.filter(h => h.stripe_pi_id === piId);
          const captureAmount = finalAmountCents * holdsForThisPi.length;

          await stripe.paymentIntents.capture(piId, {
            amount_to_capture: Math.min(captureAmount, pi.amount), // never capture more than authorised
          });

          // Mark these holds as charged
          await admin
            .from("holds")
            .update({
              state: "charged",
              amount_charged_nzd: finalAmountCents * holdsForThisPi.length,
            })
            .in("id", holdsForThisPi.map(h => h.id));

          charged += holdsForThisPi.length;
        }
      } catch (err) {
        console.error(`Failed to capture PI ${piId}:`, err);
        failed++;
      }
    }

    // Mark session as locked
    await admin
      .from("sessions")
      .update({ state: "locked", locked_at: new Date().toISOString() })
      .eq("id", session.id);

    // Send "price locked" email to each attendee
    for (const hold of holds) {
      try {
        const { data: attendee } = await admin
          .from("attendees")
          .select("name, email")
          .eq("auth_user_id", hold.user_id)
          .single();

        if (attendee?.email) {
          await resend.emails.send({
            from: "Stretchy <hello@stretchy.social>",
            to: attendee.email,
            reply_to: "kimberley@stretchyyoga.co.nz",
            subject: `Price locked — see you at ${session.title} 🧘`,
            headers: { "X-Priority": "1", "Importance": "High" },
            text: `Hi ${attendee.name?.split(" ")[0] ?? "there"},\n\nThe price is locked for ${session.title} (${dateStr}).\n\nFinal price: $${finalPrice.toFixed(2)} incl. GST\n\nYour card has been charged $${finalPrice.toFixed(2)}. See you in 2 hours!\n\nStretchy\nstretchyyoga.co.nz`,
            html: `
              <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;background:#FCBB16;padding:32px;border-radius:16px;">
                <div style="display:flex;align-items:center;margin-bottom:28px;gap:10px;">
                  <span style="font-size:22px;font-weight:900;color:#14110F;letter-spacing:-0.02em;">Stretchy</span>
                </div>
                <h1 style="font-size:28px;font-weight:900;color:#14110F;margin:0 0 8px;">Price locked. See you soon. 🙌</h1>
                <p style="color:rgba(26,26,26,0.7);font-size:15px;margin:0 0 24px;">Hi ${attendee.name?.split(" ")[0] ?? "there"} — the room is set. Your card has been charged at the final price.</p>
                <div style="background:#14110F;border-radius:14px;padding:22px;margin-bottom:16px;">
                  <p style="color:#FCBB16;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;margin:0 0 6px;">Final price · charged now</p>
                  <p style="color:white;font-size:36px;font-weight:900;margin:0 0 8px;letter-spacing:-0.02em;">$${finalPrice.toFixed(2)}</p>
                  <p style="color:#F7F0E8;font-size:18px;font-weight:800;margin:0 0 6px;">${session.title}</p>
                  <p style="color:rgba(245,237,227,0.7);font-size:14px;margin:0 0 4px;">🗓 ${dateStr}</p>
                  <p style="color:rgba(245,237,227,0.7);font-size:14px;margin:0;">📍 ${session.location_name}</p>
                </div>
                ${session.social_stretch_venue ? `<div style="background:#902F8A;border-radius:14px;padding:18px;margin-bottom:16px;"><p style="color:rgba(255,255,255,0.6);font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;margin:0 0 6px;">Social Stretch after 🥂</p><p style="color:white;font-size:15px;font-weight:700;margin:0;">${session.social_stretch_venue}</p></div>` : ""}
                <p style="font-size:13px;color:rgba(26,26,26,0.7);line-height:1.6;margin:0 0 16px;">See you on the mat in 2 hours. 🧘</p>
                <a href="${appUrl}/sessions/${session.id}" style="display:inline-block;background:#14110F;color:#F7F0E8;text-decoration:none;font-size:13px;font-weight:700;padding:12px 22px;border-radius:8px;">View session →</a>
                <p style="font-size:12px;color:rgba(26,26,26,0.6);text-align:center;margin:24px 0 0;">Questions? <a href="mailto:kimberley@stretchyyoga.co.nz" style="color:#14110F;font-weight:600;text-decoration:none;">kimberley@stretchyyoga.co.nz</a></p>
                <p style="font-size:11px;color:rgba(26,26,26,0.4);text-align:center;margin:8px 0 0;">Made with Love by <a href="https://studiodawn.org" style="color:rgba(26,26,26,0.4);">Studio Dawn</a></p>
              </div>
            `,
          });
        }
      } catch (emailErr) {
        console.error("Email error:", emailErr);
      }
    }

    // Send push notifications to all holders
    const holderUserIds = holds.map(h => h.user_id);
    sendPushToUsers(holderUserIds, {
      title: "Price locked 🔒",
      body: `${session.title} — $${finalPrice.toFixed(2)} charged. See you in 2 hours!`,
      url: `/sessions/${session.id}`,
      requireInteraction: true,
    }).catch(console.error);

    results.push({
      session: session.title,
      action: "locked",
      totalHolds,
      charged,
      failed,
      finalPrice,
    });
  }

  return NextResponse.json({ locked: sessions.length, results });
}
