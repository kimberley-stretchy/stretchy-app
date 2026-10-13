import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Stripe from "stripe";
import { calculatePrice } from "@/lib/pricing";
import { headcountForPrice } from "@/lib/authoriseAtConfirm";
import { startCardFix, finishCardFix, CARD_FIX_SESSION_COLS } from "@/lib/cardFix";
import { sendAttendeeEmail } from "@/lib/stretchy-email";
import { buildSessionEmailExtras, isFirstStretchy } from "@/lib/sessionEmailContext";
import { fmtDate, firstNameOf, getHoldSummary } from "@/lib/sessionDecision";
import { notifyHQ } from "@/lib/notifyLifecycle";

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

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const { sessionId } = await request.json().catch(() => ({}));
  if (!sessionId) return NextResponse.json({ error: "Missing session" }, { status: 400 });
  try {
    return NextResponse.json(await startCardFix(getAdmin(), getStripe(), { sessionId, userId: user.id, userEmail: user.email }));
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

  const done = await finishCardFix(admin, stripe, { sessionId, userId: user.id, paymentIntentId });
  if (done.ok === false) return NextResponse.json({ error: done.error }, { status: done.status });
  if (!done.changed) return NextResponse.json({ ok: true });
  const hold = { quantity: done.quantity };

  // Now they get the "it's going ahead" email everyone else got, and HQ is told.
  try {
    const [{ data: session }, { data: attendee }] = await Promise.all([
      admin.from("sessions").select(CARD_FIX_SESSION_COLS).eq("id", sessionId).maybeSingle(),
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
