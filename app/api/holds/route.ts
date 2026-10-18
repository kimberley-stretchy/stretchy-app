import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { Resend } from "resend";
import { cookies } from "next/headers";
import { maxPriceToPromise } from "@/lib/pricing";
import { goNoGo, finalCharge, formatDayTime, phase } from "@/lib/sessionTimes";
import { sendAttendeeEmail } from "@/lib/stretchy-email";
import { buildSessionEmailExtras, isFirstStretchy } from "@/lib/sessionEmailContext";

// Age in whole years from a YYYY-MM-DD date-of-birth string.
function ageFromDob(dob: string): number | null {
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });
}
function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
}

// GET /api/holds — the signed-in user's own holds, newest first, each with its
// session. Served with the service role (filtered to this user) because the
// sessions table isn't readable from the browser: a direct client-side join
// came back with the session missing, so the hold silently vanished from
// "Your sessions".
export async function GET(request: NextRequest) {
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
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { data, error } = await getAdmin()
    .from("holds")
    .select(`
      id, state, created_at, quantity,
      sessions(id, title, starts_at, movement_type, state, cost_base, revenue_target, min_attendees, max_attendees, location_name)
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ holds: data ?? [] });
}

// POST /api/holds — step 1: create Stripe PaymentIntent, return clientSecret
// Body: { sessionId }
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  // Try server-side session first, fall back to Authorization header token
  let { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      user = data.user;
    }
  }
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const body = await request.json();
  const sessionId = body.sessionId;
  const quantity = Math.min(Math.max(Number(body.quantity) || 1, 1), 6); // 1–6 spots
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  const admin = getAdmin();
  const stripe = getStripe();

  // Get session to calculate price
  const { data: session, error: sErr } = await admin
    .from("sessions")
    .select("id, title, cost_base, revenue_target, min_attendees, max_attendees, starts_at, state")
    .eq("id", sessionId)
    .single();

  if (sErr || !session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.state === "cancelled") return NextResponse.json({ error: "This one’s been called off, so there’s nothing to hold." }, { status: 400 });

  // Joining closes 2 hours before the session, when the final price is charged.
  const timePhase = phase(session.starts_at, session.state);
  if (timePhase === "after2" || session.state === "locked") {
    return NextResponse.json({ error: "Joining has closed for this one. It closes 2 hours before the session starts." }, { status: 400 });
  }

  // Count current holds to calculate price — sum quantity, not row count,
  // since one hold row can now represent more than one spot.
  const { data: activeHolds } = await admin
    .from("holds")
    .select("quantity")
    .eq("session_id", sessionId)
    .eq("state", "active");

  const holdCount = (activeHolds ?? []).reduce((sum, h) => sum + (h.quantity ?? 1), 0);

  // Never more people than the room holds.
  const placesLeft = session.max_attendees - holdCount;
  if (placesLeft <= 0) {
    return NextResponse.json({ error: "This one’s full. Have a look at what else is on." }, { status: 400 });
  }
  if (quantity > placesLeft) {
    return NextResponse.json({ error: `Only ${placesLeft === 1 ? "1 place is" : `${placesLeft} places are`} left for this one.` }, { status: 400 });
  }

  const currentHolds = holdCount + quantity; // +quantity places will be added
  // Authorise exactly what the person is shown as "the most you'll pay": the
  // price at the minimum until 36 hrs out (cancellations can still push the
  // price back up to that), the current price after. The final charge can then
  // never be more than was authorised.
  const priceWithGST = maxPriceToPromise(
    session.cost_base,
    session.revenue_target,
    session.min_attendees,
    currentHolds,
    timePhase === "before36"
  );
  const amountCents = Math.round(priceWithGST * 100) * quantity; // total for all places

  // Get or create attendee record
  let { data: attendee } = await admin
    .from("attendees")
    .select("id, stripe_customer_id, name, email, phone")
    .eq("auth_user_id", user.id)
    .single();

  if (!attendee) {
    const { data: newAttendee } = await admin
      .from("attendees")
      .insert({
        auth_user_id: user.id,
        name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Stretchy Member",
        email: user.email!,
        avatar_url: user.user_metadata?.avatar_url ?? null,
      })
      .select("id, stripe_customer_id, name, email, phone")
      .single();
    attendee = newAttendee;
  }

  async function createFreshCustomer() {
    const customer = await stripe.customers.create({
      email: user!.email!,
      name: attendee?.name ?? undefined,
      metadata: { supabase_user_id: user!.id, attendee_id: attendee?.id ?? "" },
    });
    await admin.from("attendees").update({ stripe_customer_id: customer.id }).eq("id", attendee!.id);
    return customer.id;
  }

  async function createPaymentIntent(customerId: string) {
    return stripe.paymentIntents.create({
      amount: amountCents,
      currency: "nzd",
      customer: customerId,
      payment_method_types: ["card"],
      capture_method: "manual",
      setup_future_usage: "off_session",
      metadata: {
        session_id: sessionId,
        attendee_id: attendee?.id ?? "",
        session_title: session.title,
        quantity: String(quantity),
      },
      description: `Hold x${quantity}: ${session.title}`,
    });
  }

  // Get or create Stripe customer
  let stripeCustomerId = attendee?.stripe_customer_id;
  if (!stripeCustomerId) {
    try {
      stripeCustomerId = await createFreshCustomer();
    } catch (err) {
      console.error("Stripe customer creation error:", err);
      return NextResponse.json({ error: "Could not set up payment — please try again." }, { status: 500 });
    }
  }

  // OPTION C — before 36 hrs out, booking only SAVES the card: nothing is held
  // on anyone's bank yet. The hold for the most they can pay is placed when the
  // session is confirmed at 36 hrs out (lib/confirmCards.ts) and charged 2 hrs
  // out. Joining after 36 hrs out (it's already going ahead) still holds the
  // amount straight away, below.
  if (timePhase === "before36") {
    const createSetup = (customer: string) =>
      stripe.setupIntents.create({
        customer,
        payment_method_types: ["card"],
        usage: "off_session",
        metadata: {
          kind: "booking_setup",
          session_id: sessionId,
          attendee_id: attendee?.id ?? "",
          session_title: session.title,
          quantity: String(quantity),
        },
      });
    let setupIntent;
    try {
      try {
        setupIntent = await createSetup(stripeCustomerId);
      } catch (err) {
        if (!(err instanceof Stripe.errors.StripeError && err.code === "resource_missing")) throw err;
        stripeCustomerId = await createFreshCustomer();
        setupIntent = await createSetup(stripeCustomerId);
      }
    } catch (err) {
      console.error("SetupIntent creation error:", err);
      return NextResponse.json({ error: "Could not start your booking — please try again." }, { status: 500 });
    }
    return NextResponse.json({
      mode: "setup",
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
      authUserId: user.id,
      quantity,
      priceNZD: priceWithGST,
      sessionTitle: session.title,
      attendeeId: attendee?.id,
      profile: {
        needsName: !attendee?.name || attendee.name.includes("@") || attendee.name === (user.email ?? "").split("@")[0],
        hasPhone: !!attendee?.phone,
      },
    });
  }

  // Create PaymentIntent — manual capture (authorize only, charge at lock-in)
  let paymentIntent;
  try {
    paymentIntent = await createPaymentIntent(stripeCustomerId);
  } catch (err) {
    // A saved customer ID from a different Stripe mode (e.g. switching
    // live<->test keys) won't exist here — recreate the customer once and
    // retry, instead of failing outright with an opaque error.
    const isMissingCustomer = err instanceof Stripe.errors.StripeError && err.code === "resource_missing";
    if (!isMissingCustomer) {
      console.error("PaymentIntent creation error:", err);
      const message = err instanceof Error ? err.message : "Could not start your hold — please try again.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
    try {
      stripeCustomerId = await createFreshCustomer();
      paymentIntent = await createPaymentIntent(stripeCustomerId);
    } catch (retryErr) {
      console.error("PaymentIntent retry error:", retryErr);
      const message = retryErr instanceof Error ? retryErr.message : "Could not start your hold — please try again.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json({
    mode: "payment",
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    authUserId: user.id,
    quantity,
    priceNZD: priceWithGST,
    sessionTitle: session.title,
    attendeeId: attendee?.id,
    // So the booking pop-up can ask for a first name / mobile only when missing.
    // A name that is just their email (the default for email sign-ins) doesn't count.
    profile: {
      needsName: !attendee?.name || attendee.name.includes("@") || attendee.name === (user.email ?? "").split("@")[0],
      hasPhone: !!attendee?.phone,
    },
  });
}

// DELETE /api/holds — cancel a hold (only allowed >36h before session)
export async function DELETE(request: NextRequest) {
  const admin = getAdmin();
  const stripe = getStripe();

  // Verify auth
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: async () => (await cookies()).getAll(), setAll: () => {} } }
  );
  let { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (token) { const { data } = await supabase.auth.getUser(token); user = data.user; }
  }
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
  // Optional: cancel fewer than all spots (e.g. bring 4, one person drops out).
  // Omit or pass >= current quantity to cancel the whole hold.
  const cancelQtyParam = searchParams.get("quantity");
  const cancelQty = cancelQtyParam ? Math.max(1, Math.floor(Number(cancelQtyParam))) : null;

  // Check session exists and get start time + pricing fields (needed if this
  // is a partial cancel, to re-authorize the remaining spots at the current price)
  const { data: session } = await admin
    .from("sessions")
    .select("id, starts_at, title, cost_base, revenue_target, min_attendees")
    .eq("id", sessionId)
    .single();

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  // Enforce 36h rule server-side — this is a hard rule, not just a UI hint:
  // it applies here regardless of what the client shows, and to partial
  // cancellations exactly the same as cancelling the whole hold.
  const hoursUntil = (new Date(session.starts_at).getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntil <= 36) {
    // The one place the real dates for these two moments are shown.
    return NextResponse.json({
      error: `Free cancelling closed 36 hours out (${formatDayTime(goNoGo(session.starts_at))}). Your place is confirmed and the final price is charged 2 hours before (${formatDayTime(finalCharge(session.starts_at))}). Something serious come up? Get in touch.`
    }, { status: 400 });
  }

  // Find the active hold for this user + session (one row, quantity holds the spot count)
  const { data: hold } = await admin
    .from("holds")
    .select("id, stripe_pi_id, quantity")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .eq("state", "active")
    .maybeSingle();

  if (!hold) {
    return NextResponse.json({ error: "No active hold found" }, { status: 404 });
  }

  const remainingQty = cancelQty !== null ? hold.quantity - cancelQty : 0;

  if (remainingQty <= 0) {
    // Full cancel — release the whole hold.
    if (hold.stripe_pi_id) {
      try {
        await stripe.paymentIntents.cancel(hold.stripe_pi_id);
      } catch (e) {
        console.error(`Failed to cancel PI ${hold.stripe_pi_id}:`, e);
      }
    }
    await admin.from("holds").update({ state: "released" }).eq("id", hold.id);
  } else if (!hold.stripe_pi_id) {
    // Partial cancel of a saved-card booking (Option C): nothing is held on
    // their bank yet, so there's nothing to re-authorise — just fewer places.
    await admin.from("holds").update({ quantity: remainingQty }).eq("id", hold.id);
  } else {
    // Partial cancel — re-authorize just the remaining spots at the current
    // price. The original authorization covered the old quantity as one
    // amount; Stripe can't shrink an existing authorization, so this cancels
    // it and creates a fresh off-session one against the saved card instead.
    const { data: attendee } = await admin
      .from("attendees")
      .select("id, stripe_customer_id")
      .eq("auth_user_id", user.id)
      .single();

    if (!attendee?.stripe_customer_id || !hold.stripe_pi_id) {
      return NextResponse.json({ error: "Could not find your saved card — contact kimberley@stretchyyoga.co.nz to adjust this booking." }, { status: 400 });
    }

    try {
      const oldPi = await stripe.paymentIntents.retrieve(hold.stripe_pi_id);
      const paymentMethod = oldPi.payment_method as string;

      // Total active spots after this reduction (everyone else's holds are unaffected)
      const { data: allActive } = await admin
        .from("holds")
        .select("quantity")
        .eq("session_id", sessionId)
        .eq("state", "active");
      const totalAfter = (allActive ?? []).reduce((sum, h) => sum + (h.quantity ?? 1), 0) - cancelQty!;

      // Changing places is only possible before 36 hrs out, where the most
      // anyone can pay is the price at the minimum — authorise that.
      const pricePerSpot = maxPriceToPromise(session.cost_base, session.revenue_target, session.min_attendees, totalAfter, true);
      const newAmountCents = Math.round(pricePerSpot * 100) * remainingQty;

      await stripe.paymentIntents.cancel(hold.stripe_pi_id).catch((e) => console.error("Cancel old PI error:", e));

      const newPi = await stripe.paymentIntents.create({
        amount: newAmountCents,
        currency: "nzd",
        customer: attendee.stripe_customer_id,
        payment_method: paymentMethod,
        off_session: true,
        confirm: true,
        capture_method: "manual",
        metadata: { session_id: sessionId, attendee_id: attendee.id, session_title: session.title, quantity: String(remainingQty), kind: "reauth" },
        description: `Hold x${remainingQty}: ${session.title}`,
      });

      await admin.from("holds").update({ quantity: remainingQty, stripe_pi_id: newPi.id }).eq("id", hold.id);
    } catch (err) {
      console.error("Partial cancel re-authorization error:", err);
      const message = err instanceof Error ? err.message : "Could not update your hold — please contact kimberley@stretchyyoga.co.nz.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  // Send cancellation confirmation email
  try {
    const { data: attendeeData } = await admin.from("attendees").select("name, email").eq("auth_user_id", user.id).single();
    if (attendeeData?.email) {
      await sendAttendeeEmail(
        "hold_cancelled",
        {
          to: attendeeData.email,
          name: attendeeData.name?.split(" ")[0] ?? "there",
          sessionTitle: session.title,
          date: "",
          sessionId,
          cancelledSpots: cancelQty ?? hold.quantity,
          remainingSpots: Math.max(remainingQty, 0),
        },
        { bcc: "kimberley@stretchyyoga.co.nz" }
      );
    }
  } catch (e) { console.error("Cancel email error:", e); }

  return NextResponse.json({ ok: true, cancelledSpots: cancelQty ?? hold.quantity, remainingSpots: Math.max(remainingQty, 0) });
}

// PATCH /api/holds — step 2: after Stripe confirms, save hold to Supabase
// Body: { sessionId, paymentIntentId, quantity }
export async function PATCH(request: NextRequest) {
  const admin = getAdmin();
  const stripe = getStripe();

  // Identity comes from the caller's own session only — never trust a client-supplied
  // attendeeId/authUserId here, or anyone could attribute a hold (and overwrite the
  // saved card) to a different person's account.
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  let { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      user = data.user;
    }
  }
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const { sessionId, paymentIntentId, setupIntentId, quantity: rawQty } = await request.json();
  const quantity = Math.min(Math.max(Number(rawQty) || 1, 1), 6);
  if (sessionId && typeof setupIntentId === "string" && setupIntentId.startsWith("seti_")) {
    return confirmSavedCardBooking({ admin, stripe, userId: user.id, sessionId, setupIntentId, quantity });
  }
  if (!sessionId || !paymentIntentId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Verify PaymentIntent is in the right state, and that it actually belongs to this caller
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (!["requires_capture", "succeeded"].includes(pi.status)) {
    const declineDetail = pi.last_payment_error?.message ?? pi.last_payment_error?.code;
    console.error("Hold confirm failed:", { paymentIntentId, status: pi.status, lastPaymentError: pi.last_payment_error });
    return NextResponse.json({
      error: `Payment not confirmed (status: ${pi.status})${declineDetail ? ` — ${declineDetail}` : ""}`,
    }, { status: 400 });
  }
  if (pi.metadata?.attendee_id) {
    const { data: piOwner } = await admin.from("attendees").select("auth_user_id").eq("id", pi.metadata.attendee_id).single();
    if (piOwner && piOwner.auth_user_id !== user.id) {
      return NextResponse.json({ error: "This payment doesn't belong to you" }, { status: 403 });
    }
  }

  const { data: myAttendee } = await admin.from("attendees").select("id").eq("auth_user_id", user.id).single();
  const attendeeId = myAttendee?.id;
  if (!attendeeId) return NextResponse.json({ error: "No attendee profile found" }, { status: 400 });

  // Save payment method to attendee
  if (pi.payment_method) {
    await admin
      .from("attendees")
      .update({ stripe_pm_id: pi.payment_method as string })
      .eq("id", attendeeId);
  }

  const holdUserId = user.id;

  // Check if a hold already exists for this person+session. The table has a
  // unique constraint on (session_id, user_id, state), so there can only ever
  // be one active row — but that means a *second* genuine hold action (e.g.
  // booking 6 more spots after already holding 1) lands here too, not just
  // an accidental duplicate submit of the same confirmation. Those two cases
  // must be handled differently: a true retry of the same PaymentIntent
  // should just return the existing row untouched, but a different, newly
  // confirmed PaymentIntent represents real additional money already
  // authorized — silently discarding it here would both under-count the
  // booking and leave that authorization untracked and never captured.
  const { data: existing } = await admin
    .from("holds")
    .select("id, quantity, stripe_pi_id")
    .eq("session_id", sessionId)
    .eq("user_id", holdUserId)
    .eq("state", "active")
    .maybeSingle();

  let hold: { id: string } | undefined;
  const addedQuantity = quantity;
  let combinedQuantity = quantity;
  let finalPi = pi;

  if (existing && existing.stripe_pi_id === paymentIntentId) {
    // True duplicate/retry of the exact same confirmation — nothing new to record.
    return NextResponse.json({ holdId: existing.id });
  } else if (existing) {
    // Adding more spots to an existing hold. Consolidate into a single fresh
    // PaymentIntent for the new combined total at the current price, rather
    // than trying to track two separate PaymentIntents against one row —
    // same pattern as the partial-cancel re-authorization below.
    combinedQuantity = existing.quantity + quantity;
    try {
      const { data: session } = await admin
        .from("sessions")
        .select("cost_base, revenue_target, min_attendees, title, starts_at, state")
        .eq("id", sessionId)
        .single();
      const { data: attendee } = await admin
        .from("attendees")
        .select("id, stripe_customer_id")
        .eq("auth_user_id", holdUserId)
        .single();

      if (!session || !attendee?.stripe_customer_id) throw new Error("Missing session or customer for consolidation");

      const { data: allActive } = await admin
        .from("holds")
        .select("quantity")
        .eq("session_id", sessionId)
        .eq("state", "active");
      const totalAfter = (allActive ?? []).reduce((sum, h) => sum + (h.quantity ?? 1), 0) - existing.quantity + combinedQuantity;
      // Same rule as a first booking: authorise the most they can be asked to pay.
      const pricePerSpot = maxPriceToPromise(
        session.cost_base,
        session.revenue_target,
        session.min_attendees,
        totalAfter,
        phase(session.starts_at, session.state) === "before36"
      );
      const newAmountCents = Math.round(pricePerSpot * 100) * combinedQuantity;

      await stripe.paymentIntents.cancel(existing.stripe_pi_id).catch((e) => console.error("Cancel prior PI error:", e));
      await stripe.paymentIntents.cancel(paymentIntentId).catch((e) => console.error("Cancel new PI error:", e));

      const consolidatedPi = await stripe.paymentIntents.create({
        amount: newAmountCents,
        currency: "nzd",
        customer: attendee.stripe_customer_id,
        payment_method: pi.payment_method as string,
        off_session: true,
        confirm: true,
        capture_method: "manual",
        metadata: { session_id: sessionId, attendee_id: attendee.id, session_title: session.title, quantity: String(combinedQuantity), kind: "reauth" },
        description: `Hold x${combinedQuantity}: ${session.title}`,
      });

      await admin.from("holds").update({ quantity: combinedQuantity, stripe_pi_id: consolidatedPi.id }).eq("id", existing.id);
      hold = { id: existing.id };
      finalPi = consolidatedPi;
    } catch (err) {
      console.error("Hold consolidation error:", err);
      const message = err instanceof Error ? err.message : "Could not add those spots — please contact kimberley@stretchyyoga.co.nz.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } else {
    // One row per hold action, with quantity recording spot count — the table
    // has a unique constraint on (session_id, user_id, state), so inserting a
    // separate row per spot (the old approach) always violated it for quantity > 1.
    const { data: holds, error } = await admin
      .from("holds")
      .insert({
        session_id: sessionId,
        user_id: holdUserId,
        stripe_pi_id: paymentIntentId,
        state: "active",
        quantity,
      })
      .select("id");

    if (error) {
      console.error("Hold insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    hold = holds?.[0];
  }

  // finalPi.amount is the TOTAL for every spot — the email shows the per-spot price.
  await sendPlaceHeld(admin, holdUserId, sessionId, finalPi.amount / combinedQuantity, combinedQuantity);

  return NextResponse.json({ holdId: hold.id });
}

// The "Your place is held" email (+ the under-18 HQ alert). Never throws.
async function sendPlaceHeld(
  admin: ReturnType<typeof getAdmin>,
  holdUserId: string,
  sessionId: string,
  perSpotCents: number,
  combinedQuantity: number
) {
  // Booking-held email (new template, fire and forget) + under-18 HQ alert.
  try {
    const [{ data: sessionData }, { data: attendeeData }] = await Promise.all([
      admin.from("sessions").select("title, starts_at, location_name, social_stretch_venue, host_id, gem_host_id, movement_type, duration_mins, getting_there, venue_instagram, social_venue_instagram").eq("id", sessionId).single(),
      admin.from("attendees").select("name, email, date_of_birth").eq("auth_user_id", holdUserId).single(),
    ]);

    if (sessionData && attendeeData?.email) {
      const startDate = new Date(sessionData.starts_at);
      const dateStr = startDate.toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "long", day: "numeric", month: "long" }) +
        " at " + startDate.toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit", hour12: true });

      const perSpot = perSpotCents / 100;
      const priceDisplay = `$${perSpot.toFixed(2)} incl. GST`;
      const totalDisplay = `$${(perSpot * combinedQuantity).toFixed(2)} incl. GST`;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.stretchyyoga.co.nz";

      const [extras, firstTimer] = await Promise.all([
        buildSessionEmailExtras(admin, sessionData, sessionId),
        isFirstStretchy(admin, holdUserId),
      ]);

      await sendAttendeeEmail("hold_confirmed", {
        to: attendeeData.email,
        name: attendeeData.name?.split(" ")[0] ?? "there",
        sessionTitle: sessionData.title,
        date: dateStr,
        price: priceDisplay,
        venue: sessionData.location_name,
        socialStretchVenue: sessionData.social_stretch_venue ?? undefined,
        sessionId,
        cancelUrl: `${appUrl}/hold/${sessionId}`,
        isFirstStretchy: firstTimer,
        spots: combinedQuantity,
        totalPrice: totalDisplay,
        ...extras,
      }, { bcc: "kimberley@stretchyyoga.co.nz" });

      // Under-18 → alert HQ (they can still book).
      if (attendeeData.date_of_birth) {
        const age = ageFromDob(attendeeData.date_of_birth);
        if (age !== null && age < 18 && process.env.RESEND_API_KEY) {
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: "Stretchy HQ <hello@stretchyyoga.co.nz>",
            to: "kimberley@stretchyyoga.co.nz",
            subject: `⚠️ Under-18 booking — ${attendeeData.name ?? attendeeData.email}`,
            text: `${attendeeData.name ?? "A member"} (${attendeeData.email}), age ${age}, just held a place for ${sessionData.title} (${dateStr}). Flagging for HQ — they were allowed to book.`,
          }).catch((e: unknown) => console.error("Under-18 alert error:", e));
        }
      }
    }
  } catch (emailErr) {
    console.error("Email send error (non-blocking):", emailErr);
  }

}

// ── Saved-card booking (Option C) ─────────────────────────────────────────────
// The card form saved their card (a SetupIntent). Record the place — no money
// is held yet; that happens at 36 hrs out. Adding places to an existing booking
// just adds to it; an older booking that still has a pending amount on the
// bank has that released, so nobody sees a hold before 36 hrs out.
async function confirmSavedCardBooking(o: {
  admin: ReturnType<typeof getAdmin>;
  stripe: Stripe;
  userId: string;
  sessionId: string;
  setupIntentId: string;
  quantity: number;
}) {
  const { admin, stripe, userId, sessionId, setupIntentId, quantity } = o;
  const si = await stripe.setupIntents.retrieve(setupIntentId);
  if (si.status !== "succeeded") {
    return NextResponse.json({ error: "Your card didn’t go through. Please try again, or use a different card." }, { status: 400 });
  }
  const { data: me } = await admin.from("attendees").select("id, stripe_customer_id").eq("auth_user_id", userId).single();
  const siCustomer = typeof si.customer === "string" ? si.customer : si.customer?.id;
  if (!me || si.metadata?.attendee_id !== me.id || si.metadata?.session_id !== sessionId || (me.stripe_customer_id && siCustomer !== me.stripe_customer_id)) {
    return NextResponse.json({ error: "This card check doesn’t belong to you." }, { status: 403 });
  }

  const { data: existing } = await admin
    .from("holds")
    .select("id, quantity, stripe_pi_id")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .eq("state", "active")
    .maybeSingle();
  // A repeat submit of the same card check — already recorded.
  if (si.metadata?.hold_recorded === "1" && existing) return NextResponse.json({ holdId: existing.id });

  const pmId = typeof si.payment_method === "string" ? si.payment_method : si.payment_method?.id;
  if (pmId) await admin.from("attendees").update({ stripe_pm_id: pmId }).eq("id", me.id);

  const { data: session } = await admin
    .from("sessions")
    .select("title, cost_base, revenue_target, min_attendees, max_attendees, starts_at, state")
    .eq("id", sessionId)
    .single();
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  // Still before 36 hrs out? (Someone could sit on the card form past the mark.)
  if (phase(session.starts_at, session.state) !== "before36") {
    return NextResponse.json({ error: "This one has just been confirmed, so booking now places a hold on your card. Please close this and tap Hold my place again." }, { status: 409 });
  }

  const { data: allActive } = await admin.from("holds").select("quantity").eq("session_id", sessionId).eq("state", "active");
  const heldNow = (allActive ?? []).reduce((n, h) => n + (h.quantity ?? 1), 0);
  if (heldNow + quantity > session.max_attendees) {
    return NextResponse.json({ error: "Sorry, those places have just gone. Have a look at what else is on." }, { status: 409 });
  }

  let holdId: string;
  let combined = quantity;
  if (existing) {
    combined = existing.quantity + quantity;
    if (existing.stripe_pi_id) await stripe.paymentIntents.cancel(existing.stripe_pi_id).catch(() => {});
    const { error } = await admin.from("holds").update({ quantity: combined, stripe_pi_id: null }).eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    holdId = existing.id;
  } else {
    const { data: rows, error } = await admin
      .from("holds")
      .insert({ session_id: sessionId, user_id: userId, stripe_pi_id: null, state: "active", quantity })
      .select("id");
    if (error || !rows?.[0]) return NextResponse.json({ error: error?.message ?? "Couldn’t hold your place." }, { status: 500 });
    holdId = rows[0].id;
  }
  await stripe.setupIntents.update(setupIntentId, { metadata: { ...si.metadata, hold_recorded: "1" } }).catch(() => {});

  // The email shows the most they can pay: the price at the minimum.
  const perSpot = maxPriceToPromise(session.cost_base, session.revenue_target, session.min_attendees, heldNow + quantity, true);
  await sendPlaceHeld(admin, userId, sessionId, Math.round(perSpot * 100), combined);
  return NextResponse.json({ holdId });
}
