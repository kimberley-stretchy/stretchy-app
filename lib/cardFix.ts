import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { calculatePrice } from "@/lib/pricing";
import { headcountForPrice, cardDeadline } from "@/lib/authoriseAtConfirm";
import { formatDayTime } from "@/lib/sessionTimes";

// ─────────────────────────────────────────────────────────────────────────────
// "Update my card" — the rules, apart from the web route so they can be run
// against Stripe's test mode (scripts/option-c-flow-test.ts).
//
//   startCardFix  → a card form for exactly the most they can pay for their places
//   finishCardFix → the card went through: the booking is back to normal
//
// Only ever for the signed-in person's own booking, and only while that booking
// is marked card_failed_at on a session that's going ahead. It places a hold on
// the card; the final price is still charged 2 hours out.
// ─────────────────────────────────────────────────────────────────────────────

export const CARD_FIX_SESSION_COLS = "id, title, starts_at, state, location_name, min_attendees, cost_base, revenue_target, social_stretch_venue, host_id, gem_host_id, movement_type, duration_mins, getting_there, venue_instagram, social_venue_instagram, confirmed_headcount";

type Who = { sessionId: string; userId: string; userEmail?: string | null };

async function myActiveHold(admin: SupabaseClient, w: Who) {
  const { data } = await admin
    .from("holds")
    .select("id, quantity, stripe_pi_id, card_failed_at, is_comp")
    .eq("session_id", w.sessionId)
    .eq("user_id", w.userId)
    .eq("state", "active")
    .maybeSingle();
  return data;
}

async function heldNow(admin: SupabaseClient, sessionId: string): Promise<number> {
  const { data } = await admin.from("holds").select("quantity").eq("session_id", sessionId).eq("state", "active");
  return (data ?? []).reduce((n, h) => n + (h.quantity ?? 1), 0);
}

export type CardFixStart =
  | { status: "no_hold" | "all_good" | "closed" }
  | { status: "needs_card"; clientSecret: string | null; paymentIntentId: string; quantity: number; maxTotal: number; sessionTitle: string; deadline: string };

export async function startCardFix(admin: SupabaseClient, stripe: Stripe, w: Who): Promise<CardFixStart> {
  const hold = await myActiveHold(admin, w);
  if (!hold) return { status: "no_hold" };
  if (!hold.card_failed_at || hold.is_comp) return { status: "all_good" };

  const { data: session } = await admin.from("sessions").select(CARD_FIX_SESSION_COLS).eq("id", w.sessionId).maybeSingle();
  if (!session || session.state !== "confirmed") return { status: "closed" };

  const { data: attendee } = await admin.from("attendees").select("id, stripe_customer_id, name, email").eq("auth_user_id", w.userId).maybeSingle();
  if (!attendee) throw new Error("No attendee profile");

  // The most they can pay: the price at the headcount it was confirmed at (or
  // lower, if more people have joined since) × their places.
  const quantity = hold.quantity ?? 1;
  const unit = calculatePrice(session.cost_base, session.revenue_target, headcountForPrice(await heldNow(admin, w.sessionId), session.min_attendees, session.confirmed_headcount));
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
        session_id: w.sessionId,
        attendee_id: String(attendee.id),
        hold_id: String(hold.id),
        quantity: String(quantity),
        ...(hold.stripe_pi_id ? { replaces_pi: hold.stripe_pi_id } : {}),
      },
      description: `Session x${quantity}: ${session.title}`,
    });
  const freshCustomer = async () => {
    const c = await stripe.customers.create({ email: w.userEmail ?? attendee.email ?? undefined, name: attendee.name ?? undefined, metadata: { supabase_user_id: w.userId } });
    await admin.from("attendees").update({ stripe_customer_id: c.id }).eq("id", attendee.id);
    return c.id;
  };

  let pi: Stripe.PaymentIntent;
  try {
    pi = await create(attendee.stripe_customer_id ?? (await freshCustomer()));
  } catch (err) {
    if (!(err instanceof Stripe.errors.StripeError && err.code === "resource_missing")) throw err;
    pi = await create(await freshCustomer());
  }
  return {
    status: "needs_card",
    clientSecret: pi.client_secret,
    paymentIntentId: pi.id,
    quantity,
    maxTotal: amountCents / 100,
    sessionTitle: session.title,
    deadline: formatDayTime(cardDeadline(session.starts_at)),
  };
}

export type CardFixFinish =
  | { ok: true; changed: boolean; quantity: number }
  | { ok: false; status: number; error: string };

export async function finishCardFix(admin: SupabaseClient, stripe: Stripe, w: Who & { paymentIntentId: string }): Promise<CardFixFinish> {
  const hold = await myActiveHold(admin, w);
  if (!hold) return { ok: false, status: 404, error: "We couldn’t find your booking. Your place may already have been released." };

  const pi = await stripe.paymentIntents.retrieve(w.paymentIntentId);
  // It must be the card form we opened for THIS booking, and it must have worked.
  if (pi.metadata?.kind !== "card_fix" || pi.metadata?.hold_id !== String(hold.id) || pi.metadata?.session_id !== w.sessionId) {
    return { ok: false, status: 403, error: "That card check doesn’t match your booking." };
  }
  if (pi.status !== "requires_capture") {
    return { ok: false, status: 400, error: "Your card didn’t go through. Please try again, or use a different card." };
  }
  const quantity = hold.quantity ?? 1;
  if (hold.stripe_pi_id === pi.id && !hold.card_failed_at) return { ok: true, changed: false, quantity }; // repeat submit

  const oldPiId = hold.stripe_pi_id as string | null;
  await admin.from("holds").update({ stripe_pi_id: pi.id, card_failed_at: null, card_fail_reason: null }).eq("id", hold.id);
  const pmId = typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method?.id;
  if (pmId) await admin.from("attendees").update({ stripe_pm_id: pmId }).eq("auth_user_id", w.userId);
  // Release whatever was there before, so there's only ever one pending amount.
  if (oldPiId && oldPiId !== pi.id) await stripe.paymentIntents.cancel(oldPiId).catch(() => {});
  return { ok: true, changed: true, quantity };
}
