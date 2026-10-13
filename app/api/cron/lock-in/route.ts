import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { sendPushToUsers } from "@/lib/push-server";
import { calculatePrice } from "@/lib/pricing";
import { settlePaymentIntent } from "@/lib/lockInCharge";
import { notifyHQ } from "@/lib/notifyLifecycle";
import { sendAttendeeBatch } from "@/lib/stretchy-email";
import { buildSessionEmailExtras, isFirstStretchy } from "@/lib/sessionEmailContext";

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
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
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

  const now = new Date();
  const windowStart = new Date(now.getTime() + 110 * 60 * 1000); // 1h50m
  const windowEnd   = new Date(now.getTime() + 130 * 60 * 1000); // 2h10m

  // Find confirmed sessions starting in the 2h window
  const { data: sessions } = await admin
    .from("sessions")
    .select("id, title, starts_at, location_name, cost_base, revenue_target, min_attendees, max_attendees, social_stretch_venue, state, host_id, gem_host_id, movement_type, duration_mins, getting_there, venue_instagram, social_venue_instagram")
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
      .select("id, user_id, stripe_pi_id, is_comp, quantity")
      .eq("session_id", session.id)
      .eq("state", "active");

    if (!holds || holds.length === 0) continue;

    // One hold row can be several spots — count SPOTS, not rows, everywhere
    // (price, charge amount, "N people" copy).
    const qtyOf = (h: { quantity: number | null }) => h.quantity ?? 1;
    const totalHolds = holds.reduce((s, h) => s + qtyOf(h), 0);
    // Final price never rises above the opening price at min_attendees — floor it at the minimum
    const finalPrice = calculatePrice(session.cost_base, session.revenue_target, Math.max(totalHolds, session.min_attendees));
    const finalAmountCents = Math.round(finalPrice * 100);

    const startDate = new Date(session.starts_at);
    const dateStr = startDate.toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "long", day: "numeric", month: "long" }) +
      " at " + startDate.toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit", hour12: true });

    let charged = 0;
    let failed = 0;
    // Hold rows whose payment did NOT go through — they must not get the
    // "you're charged" email, and HQ needs to know who they are.
    const unpaidHoldIds = new Set<string>();

    // Capture each unique Stripe PaymentIntent
    const piIds = Array.from(new Set(holds.map(h => h.stripe_pi_id).filter(Boolean)));

    for (const piId of piIds) {
      const holdsForThisPi = holds.filter(h => h.stripe_pi_id === piId);
      // Charge per SPOT — a 4-spot hold pays 4× the final price.
      const spotsForThisPi = holdsForThisPi.reduce((s, h) => s + qtyOf(h), 0);
      const dueCents = finalAmountCents * spotsForThisPi;

      try {
        // Capture the live authorisation, or — if it has lapsed — charge the
        // saved card. All the rules are in lib/lockInCharge.ts.
        const { paidPiId } = await settlePaymentIntent(
          stripe,
          piId,
          dueCents,
          `Session x${spotsForThisPi}: ${session.title}`
        );

        // Mark these holds as charged (per row: final price × that row's spots)
        for (const h of holdsForThisPi) {
          await admin
            .from("holds")
            .update({ state: "charged", amount_charged_nzd: finalAmountCents * qtyOf(h), stripe_pi_id: paidPiId })
            .eq("id", h.id);
        }
        charged += spotsForThisPi;
      } catch (err) {
        console.error(`Failed to charge PI ${piId}:`, err);
        failed += spotsForThisPi;
        holdsForThisPi.forEach(h => unpaidHoldIds.add(h.id));
      }
    }

    // A paying hold with no PaymentIntent at all can't be charged either.
    for (const h of holds) {
      if (!h.is_comp && !h.stripe_pi_id) {
        failed += qtyOf(h);
        unpaidHoldIds.add(h.id);
      }
    }

    // Comp (gifted) holds have no PaymentIntent — never charge them, just settle
    // the row at $0 so it doesn't sit "active" forever after lock-in.
    const compHoldIds = holds.filter((h) => h.is_comp).map((h) => h.id);
    if (compHoldIds.length > 0) {
      await admin.from("holds").update({ state: "charged", amount_charged_nzd: 0 }).in("id", compHoldIds);
    }

    // Mark session as locked
    await admin
      .from("sessions")
      .update({ state: "locked", locked_at: new Date().toISOString() })
      .eq("id", session.id);

    // Send "price locked" email to each attendee (new template + real details).
    const emailExtras = await buildSessionEmailExtras(admin, session, session.id);
    const priceStr = `$${finalPrice.toFixed(2)} incl. GST`;
    const lockItems = [];
    const unpaidPeople: string[] = [];
    for (const hold of holds) {
      const { data: attendee } = await admin
        .from("attendees")
        .select("name, email")
        .eq("auth_user_id", hold.user_id)
        .single();
      // Never tell someone they've been charged when the charge failed —
      // HQ gets their details below to follow up instead.
      if (unpaidHoldIds.has(hold.id)) {
        unpaidPeople.push(`${attendee?.name ?? "Unknown"} (${attendee?.email ?? "no email"}) · ${qtyOf(hold)} place${qtyOf(hold) === 1 ? "" : "s"}`);
        continue;
      }
      if (!attendee?.email) continue;
      const firstTimer = await isFirstStretchy(admin, hold.user_id);
      const spots = qtyOf(hold);
      lockItems.push({
        type: "price_locked" as const,
        payload: {
          to: attendee.email,
          name: attendee.name?.split(" ")[0] ?? "there",
          sessionTitle: session.title,
          date: dateStr,
          price: priceStr,
          venue: session.location_name,
          socialStretchVenue: session.social_stretch_venue ?? undefined,
          sessionId: session.id,
          isComp: !!hold.is_comp,
          isFirstStretchy: firstTimer,
          spots,
          totalPrice: `$${(finalPrice * spots).toFixed(2)} incl. GST`,
          ...emailExtras,
          // After the spread: the exact amount charged per place, and the
          // headcount (holds are already marked charged, so a live count reads 0).
          unitPriceCents: finalAmountCents,
          attendeeCount: totalHolds,
        },
      });
    }
    await sendAttendeeBatch(lockItems);

    // Send push notifications to all holders
    const holderUserIds = holds.filter(h => !unpaidHoldIds.has(h.id)).map(h => h.user_id);
    await sendPushToUsers(holderUserIds, {
      title: "Final price charged",
      body: `${session.title}: $${finalPrice.toFixed(2)} each. See you in 2 hours!`,
      url: `/sessions/${session.id}`,
      requireInteraction: true,
    }).catch(console.error);

    // 2-hour heads-up for HQ only — teacher and GEM don't need a 2h email
    // (they got the confirm + calendar invite when it locked in at 36h).
    await notifyHQ({
      subject: `${failed ? "⚠️ Payment failed · " : ""}Starting in ~2h: ${session.title}`,
      scheme: "orange",
      kicker: "Stretchy HQ · Starting soon",
      heading: `${session.title} — in ~2 hours`,
      sessionId: session.id,
      rows: [
        `<strong>${totalHolds}</strong> attendee${totalHolds === 1 ? "" : "s"} · ${charged} charged${failed ? ` · <strong>${failed} NOT charged</strong>` : ""}.`,
        ...(unpaidPeople.length ? [`<strong>Payment failed — follow up:</strong><br>${unpaidPeople.join("<br>")}`] : []),
        `Final price: $${finalPrice.toFixed(2)} incl. GST.`,
        `🗓 ${dateStr}`,
        `📍 ${session.location_name}`,
      ],
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
