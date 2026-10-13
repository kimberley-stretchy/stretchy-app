import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Stripe from "stripe";
import { calculatePrice } from "@/lib/pricing";
import { headcountForPrice, cardDeadline } from "@/lib/authoriseAtConfirm";
import { sendAttendeeEmail } from "@/lib/stretchy-email";
import { buildSessionEmailExtras, isFirstStretchy } from "@/lib/sessionEmailContext";
import { fmtDate, firstNameOf, getHoldSummary } from "@/lib/sessionDecision";
import { notifyHQ } from "@/lib/notifyLifecycle";
import { formatDayTime } from "@/lib/sessionTimes";

// ─────────────────────────────────────────────────────────────────────────────
// "Update my card" — for someone whose card couldn't be confirmed when their
// session was confirmed at 36 hours out (holds.card_failed_at is set).
//
//   POST { sessionId }                  → start: a card form for exactly the most
//                                         they can pay for their places.
//   PUT  { sessionId, paymentIntentId } → finish: the card went through, so the
//                                         booking is back to normal and they get
//                                         the "it's going ahead" email.
//
// Same shape as booking itself (app/api/holds POST then PATCH). It only places
// a hold on the card; the final price is still charged 2 hours out.
// ─────────────────────────────────────────────────────────────────────────────

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
}
function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });
}

async function getUser(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  let { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (token) { const { data } = await supabase.auth.getUser(token); user = data.user; }
  }
  return user;
}

const SESSION_COLS = "id, title, starts_at, state, location_name, min_attendees, cost_base, revenue_target, social_stretch_venue, host_id, gem_host_id, movement_type, duration_mins, getting_there, venue_instagram, social_venue_instagram, confirmed_headcount";

// The booking that needs a card, if this person has one on this session.
async function findFailedHold(admin: ReturnType<typeof getAdmin>, sessionId: string, userId: string) {
  const { data: hold } = await admin
    .from("holds")
    .select("id, quantity, stripe_pi_id, card_failed_at, is_comp")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .eq("state", "active")
    .maybeSingle();
  return hold;
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const { sessionId } = await request.json().catch(() => ({}));
  if (!sessionId) return NextResponse.json({ error: "Missing session" }, { status: 400 });

  const admin = getAdmin();
  const stripe = getStripe();

  const hold = await findFailedHold(admin, sessionId, user.id);
  if (!hold) return NextResponse.json({ status: "no_hold" });
  if (!hold.card_failed_at || hold.is_comp) return NextResponse.json({ status: "all_good" });

  const { data: session } = await admin.from("sessions").select(SESSION_COLS).eq("id", sessionId).maybeSingle();
  if (!session || session.state !== "confirmed") return NextResponse.json({ status: "closed" });

  const { data: attendee } = await admin
    .from("attendees")
    .select("id, stripe_customer_id, name, email")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!attendee) return NextResponse.json({ error: "No profile found" }, { status: 400 });

  // The most they can pay: the price at the headcount it was confirmed at (or
  // lower, if more people have joined since) × their places.
  const { count: heldNow } = await getHoldSummary(admin, sessionId);
  const quantity = hold.quantity ?? 1;
  const unit = calculatePrice(session.cost_base, session.revenue_target, headcountForPrice(heldNow, session.min_attendees, session.confirmed_headcount));
  const amountCents = Math.round(unit * 100) * quantity;

  const create = (customer: string) =>
    stripe.paymentIntents.create({
      amount: amountCents,
      currency: "nzd",
      customer,
      capture_method: "manual",
      setup_future_usage: "off_session",
      payment_method_types: ["card"],
      metadata: {
        kind: "card_fix",
        session_id: sessionId,
        attendee_id: String(attendee.id),
        hold_id: String(hold.id),
        quantity: String(quantity),
        ...(hold.stripe_pi_id ? { replaces_pi: hold.stripe_pi_id } : {}),
      },
      description: `Session x${quantity}: ${session.title}`,
    });
  const freshCustomer = async () => {
    const c = await stripe.customers.create({ email: user.email ?? attendee.email ?? undefined, name: attendee.name ?? undefined, metadata: { supabase_user_id: user.id } });
    await admin.from("attendees").update({ stripe_customer_id: c.id }).eq("id", attendee.id);
    return c.id;
  };

  try {
    let pi;
    try {
      pi = await create(attendee.stripe_customer_id ?? (await freshCustomer()));
    } catch (err) {
      if (!(err instanceof Stripe.errors.StripeError && err.code === "resource_missing")) throw err;
      pi = await create(await freshCustomer());
    }
    return NextResponse.json({
      status: "needs_card",
      clientSecret: pi.client_secret,
      paymentIntentId: pi.id,
      quantity,
      maxTotal: amountCents / 100,
      sessionTitle: session.title,
      deadline: formatDayTime(cardDeadline(session.starts_at)),
    });
  } catch (err) {
    console.error("Card fix: could not start", err);
    return NextResponse.json({ error: "Couldn’t open the card form. Please try again." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const { sessionId, paymentIntentId } = await request.json().catch(() => ({}));
  if (!sessionId || !paymentIntentId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const admin = getAdmin();
  const stripe = getStripe();

  const hold = await findFailedHold(admin, sessionId, user.id);
  if (!hold) return NextResponse.json({ error: "We couldn’t find your booking. Your place may already have been released." }, { status: 404 });

  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  // It must be the card form we opened for THIS booking, and it must have worked.
  if (pi.metadata?.kind !== "card_fix" || pi.metadata?.hold_id !== String(hold.id) || pi.metadata?.session_id !== sessionId) {
    return NextResponse.json({ error: "That card check doesn’t match your booking." }, { status: 403 });
  }
  if (pi.status !== "requires_capture") {
    return NextResponse.json({ error: "Your card didn’t go through. Please try again, or use a different card." }, { status: 400 });
  }
  if (hold.stripe_pi_id === pi.id && !hold.card_failed_at) return NextResponse.json({ ok: true }); // repeat submit

  const oldPiId = hold.stripe_pi_id as string | null;
  await admin.from("holds").update({ stripe_pi_id: pi.id, card_failed_at: null, card_fail_reason: null }).eq("id", hold.id);
  if (pi.payment_method) {
    await admin.from("attendees").update({ stripe_pm_id: pi.payment_method as string }).eq("auth_user_id", user.id);
  }
  // Release whatever was there before, so there's only ever one pending amount.
  if (oldPiId && oldPiId !== pi.id) await stripe.paymentIntents.cancel(oldPiId).catch(() => {});

  // Now they get the "it's going ahead" email everyone else got, and HQ is told.
  try {
    const [{ data: session }, { data: attendee }] = await Promise.all([
      admin.from("sessions").select(SESSION_COLS).eq("id", sessionId).maybeSingle(),
      admin.from("attendees").select("name, email").eq("auth_user_id", user.id).maybeSingle(),
    ]);
    if (session && attendee?.email) {
      const { count: heldNow } = await getHoldSummary(admin, sessionId);
      const unit = calculatePrice(session.cost_base, session.revenue_target, headcountForPrice(heldNow, session.min_attendees, session.confirmed_headcount));
      await sendAttendeeEmail("session_going_ahead", {
        to: attendee.email,
        name: firstNameOf(attendee.name),
        sessionTitle: session.title,
        date: fmtDate(session.starts_at),
        price: `$${unit.toFixed(2)} incl. GST`,
        venue: session.location_name ?? undefined,
        socialStretchVenue: session.social_stretch_venue ?? undefined,
        sessionId,
        isFirstStretchy: await isFirstStretchy(admin, user.id),
        spots: hold.quantity ?? 1,
        ...(await buildSessionEmailExtras(admin, session, sessionId)),
      });
      await notifyHQ({
        subject: `Card sorted: ${attendee.email} — ${session.title}`,
        scheme: "olive",
        kicker: "Stretchy HQ · Card sorted ✅",
        heading: "A card was fixed",
        sessionId,
        rows: [
          `<strong>${attendee.name ? `${attendee.name} · ` : ""}${attendee.email}</strong> updated their card for <strong>${session.title}</strong>. Their booking is confirmed and nothing more is needed.`,
        ],
      });
    }
  } catch (e) {
    console.error("Card fix: follow-up emails failed", e);
  }

  return NextResponse.json({ ok: true });
}
