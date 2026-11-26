import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { maxPriceToPromise, calculatePrice } from "@/lib/pricing";
import { phase } from "@/lib/sessionTimes";
import { sendAttendeeEmail } from "@/lib/stretchy-email";
import { buildSessionEmailExtras } from "@/lib/sessionEmailContext";
import { findAuthUserIdByEmail, VALID_EMAIL } from "@/lib/compPlace";
import { MAX_SHOUTS, SHOUT_NOTE_MAX } from "@/lib/shoutWords";

// ─────────────────────────────────────────────────────────────────────────────
// Shout a mate (SOCIAL_BOOKING_BRIEF.md section 4) — the money and the place.
//
//   1. startShout     the giver fills in step 1 and picks a card. We work out
//                     today's max, save a "pending" shout and a PaymentIntent
//                     that takes the money straight away (not a hold).
//   2. finaliseShout  once Stripe says it's paid (from the page, or the
//                     webhook — whichever is first; safe to run twice): the
//                     place is held, it counts in the headcount, and the
//                     emails go. No room by then? Refunded in full.
//   3. claimShout     the mate claims it: their account (found or made), terms,
//                     care note. The held place becomes theirs. No card.
//   4. settleShouts   30 mins out (the lock-in job): the final price is known,
//                     the difference goes back to the giver's card.
//
// Cancelling (giver, mate, or us) is part B.
// ─────────────────────────────────────────────────────────────────────────────

export type ShoutRow = {
  id: string;
  code: string;
  session_id: string;
  giver_user_id: string;
  recipient_name: string;
  recipient_email: string | null;
  deliver: "email" | "link";
  hide_price: boolean;
  note: string | null;
  amount_cents: number;
  final_cents: number | null;
  refund_cents: number | null;
  stripe_pi_id: string | null;
  state: string;
  hold_id: string | null;
  claimed_user_id: string | null;
};

const SESSION_COLS =
  "id, title, starts_at, state, cost_base, revenue_target, min_attendees, max_attendees, location_name, social_stretch_venue, host_id, gem_host_id, movement_type, duration_mins, getting_there, venue_instagram, social_venue_instagram";

const CODE_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";
function makeCode(): string {
  let c = "";
  for (let i = 0; i < 10; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return c;
}

export const firstNameOnly = (name: string | null | undefined) => (name ?? "").trim().split(/\s+/)[0] || "";
export const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

async function heldPlaces(admin: SupabaseClient, sessionId: string): Promise<number> {
  const { data } = await admin.from("holds").select("quantity").eq("session_id", sessionId).eq("state", "active");
  return (data ?? []).reduce((s, h) => s + (h.quantity ?? 1), 0);
}

/** Today's max for one more place: what the giver pays now, never more. */
export async function shoutQuote(admin: SupabaseClient, sessionId: string) {
  const { data: session } = await admin.from("sessions").select(SESSION_COLS).eq("id", sessionId).maybeSingle();
  if (!session) return { error: "Session not found", status: 404 } as const;
  if (session.state === "cancelled") return { error: "This one’s been called off.", status: 400 } as const;
  const p = phase(session.starts_at, session.state);
  if (p === "after2" || session.state === "locked") return { error: "Joining has closed for this one.", status: 400 } as const;
  const held = await heldPlaces(admin, sessionId);
  if (held >= session.max_attendees) return { error: "This one’s full. Have a look at what else is on.", status: 400 } as const;
  const each = maxPriceToPromise(session.cost_base, session.revenue_target, session.min_attendees, held + 1, p === "before36");
  return { session, amountCents: Math.round(each * 100), before36: p === "before36" } as const;
}

/** How many more places this person can shout at this session (max 4). */
export async function shoutsLeft(admin: SupabaseClient, sessionId: string, giverId: string): Promise<number> {
  const { count } = await admin
    .from("shouts")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("giver_user_id", giverId)
    .in("state", ["paid", "claimed", "settled"]);
  return Math.max(0, MAX_SHOUTS - (count ?? 0));
}

export type ShoutInput = {
  sessionId: string;
  name: string;
  deliver: "email" | "link";
  email?: string;
  permission?: boolean;
  hidePrice?: boolean;
  note?: string;
};

/** Check step 1. Returns the tidied details, or what to fix. */
export function checkShoutInput(b: Record<string, unknown>): { ok: ShoutInput } | { error: string } {
  const name = firstNameOnly(String(b.name ?? "")).slice(0, 40);
  if (!name) return { error: "Add their first name." };
  const deliver = b.deliver === "email" ? "email" : b.deliver === "link" ? "link" : null;
  if (!deliver) return { error: "Choose how they’ll get it." };
  let email: string | undefined;
  if (deliver === "email") {
    email = String(b.email ?? "").trim().toLowerCase();
    if (!VALID_EMAIL.test(email)) return { error: `Enter ${name}’s email.` };
    if (b.permission !== true) return { error: `Please tick to say ${name} knows it’s coming, or won’t mind one email from us.` };
  }
  const note = String(b.note ?? "").replace(/\s+/g, " ").trim();
  if (note.length > SHOUT_NOTE_MAX) return { error: `Keep the note to ${SHOUT_NOTE_MAX} characters.` };
  return { ok: { sessionId: String(b.sessionId ?? ""), name, deliver, email, permission: b.permission === true, hidePrice: b.hidePrice === true, note: note || undefined } };
}

/** The card they used last, if Stripe still has it. */
export async function savedCard(stripe: Stripe, customerId: string | null | undefined) {
  if (!customerId) return null;
  const pms = await stripe.paymentMethods.list({ customer: customerId, type: "card", limit: 1 }).catch(() => null);
  const pm = pms?.data[0];
  return pm?.card ? { id: pm.id, brand: pm.card.brand, last4: pm.card.last4 } : null;
}

/**
 * Step 2 → pay. Saves a pending shout and a PaymentIntent for today's max,
 * taken straight away. With a saved card it's confirmed here (the page only
 * steps in if the bank wants a check); otherwise the page's card form does it.
 */
export async function startShout(
  admin: SupabaseClient,
  stripe: Stripe,
  giver: { userId: string; attendeeId: string; customerId: string; name: string },
  input: ShoutInput,
  useSavedCard: boolean
): Promise<
  | { shoutId: string; amountCents: number; clientSecret: string; status: string }
  | { error: string; status?: number }
> {
  const quote = await shoutQuote(admin, input.sessionId);
  if ("error" in quote) return { error: quote.error!, status: quote.status };
  if ((await shoutsLeft(admin, input.sessionId, giver.userId)) < 1) {
    return { error: `You can shout up to ${MAX_SHOUTS} places at one session.`, status: 400 };
  }

  const { data: shout, error } = await admin
    .from("shouts")
    .insert({
      code: makeCode(),
      session_id: input.sessionId,
      giver_user_id: giver.userId,
      recipient_name: input.name,
      recipient_email: input.deliver === "email" ? input.email : null,
      deliver: input.deliver,
      hide_price: !!input.hidePrice,
      note: input.note ?? null,
      amount_cents: quote.amountCents,
    })
    .select("id")
    .single();
  if (error || !shout) {
    console.error("shout insert error:", error);
    return { error: "Couldn’t start your shout. Please try again.", status: 500 };
  }

  const saved = useSavedCard ? await savedCard(stripe, giver.customerId) : null;
  if (useSavedCard && !saved) return { error: "We couldn’t find your saved card. Use a new one.", status: 400 };

  const params: Stripe.PaymentIntentCreateParams = {
    amount: quote.amountCents,
    currency: "nzd",
    customer: giver.customerId,
    payment_method_types: ["card"],
    description: `Shout x1: ${quote.session.title} (for ${input.name})`,
    metadata: { kind: "shout", shout_id: shout.id, session_id: input.sessionId, attendee_id: giver.attendeeId, session_title: quote.session.title },
    ...(saved
      ? { payment_method: saved.id, confirm: true, return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? "https://stretchyyoga.co.nz"}/sessions/${input.sessionId}/shout?shout=${shout.id}` }
      : { setup_future_usage: "off_session" as const }),
  };
  let pi: Stripe.PaymentIntent;
  try {
    pi = await stripe.paymentIntents.create(params, { idempotencyKey: `shout-${shout.id}` });
  } catch (err) {
    const e = err as { message?: string; payment_intent?: { id?: string } };
    if (e.payment_intent?.id) await admin.from("shouts").update({ stripe_pi_id: e.payment_intent.id }).eq("id", shout.id);
    return { error: e.message ?? "That card didn’t go through. Try another card.", status: 402 };
  }
  await admin.from("shouts").update({ stripe_pi_id: pi.id }).eq("id", shout.id);
  return { shoutId: shout.id, amountCents: quote.amountCents, clientSecret: pi.client_secret!, status: pi.status };
}

/**
 * Paid → hold the place and send the emails. Safe to call any number of times
 * (the page and Stripe's webhook both call it): only the first call that moves
 * the shout from pending to paid does anything.
 */
export async function finaliseShout(
  admin: SupabaseClient,
  stripe: Stripe,
  shoutId: string
): Promise<{ shout: ShoutRow } | { error: string; status: number }> {
  const { data: shout } = await admin.from("shouts").select("*").eq("id", shoutId).maybeSingle<ShoutRow>();
  if (!shout) return { error: "Shout not found", status: 404 };
  if (shout.state !== "pending") return { shout };
  if (!shout.stripe_pi_id) return { error: "Not paid yet.", status: 400 };

  const pi = await stripe.paymentIntents.retrieve(shout.stripe_pi_id);
  if (pi.status !== "succeeded" || pi.amount_received < shout.amount_cents) return { error: "Not paid yet.", status: 400 };

  // Only one caller wins the move from pending to paid.
  const { data: won } = await admin
    .from("shouts")
    .update({ state: "paid", paid_at: new Date().toISOString() })
    .eq("id", shout.id)
    .eq("state", "pending")
    .select("id");
  if (!won || won.length === 0) {
    const { data: now } = await admin.from("shouts").select("*").eq("id", shout.id).single<ShoutRow>();
    return { shout: now! };
  }

  const { data: session } = await admin.from("sessions").select(SESSION_COLS).eq("id", shout.session_id).single();
  const full = !session || session.state === "cancelled" || (await heldPlaces(admin, shout.session_id)) >= session.max_attendees;
  if (full) {
    // Filled up (or called off) while they were paying: give it all back.
    await stripe.refunds.create({ payment_intent: shout.stripe_pi_id }, { idempotencyKey: `shout-full-${shout.id}` }).catch((e) => console.error("shout full refund error:", e));
    await admin.from("shouts").update({ state: "refunded", refund_cents: shout.amount_cents, cancelled_at: new Date().toISOString() }).eq("id", shout.id);
    return { error: "It filled up while you were paying, so we’ve refunded you in full.", status: 409 };
  }

  const { data: hold, error: holdErr } = await admin
    .from("holds")
    .insert({ session_id: shout.session_id, user_id: null, state: "active", quantity: 1, is_comp: false, stripe_pi_id: null, shout_id: shout.id })
    .select("id")
    .single();
  if (holdErr || !hold) {
    console.error("shout hold insert error:", holdErr);
    await admin.from("shouts").update({ state: "pending", paid_at: null }).eq("id", shout.id);
    return { error: "Paid, but we couldn’t hold the place. We’ll sort it and be in touch.", status: 500 };
  }
  await admin.from("shouts").update({ hold_id: hold.id }).eq("id", shout.id);

  await sendShoutEmails(admin, { ...shout, state: "paid", hold_id: hold.id }, session).catch((e) => console.error("shout emails error:", e));
  return { shout: { ...shout, state: "paid", hold_id: hold.id } };
}

async function giverOf(admin: SupabaseClient, userId: string) {
  const { data } = await admin.from("attendees").select("name, email").eq("auth_user_id", userId).maybeSingle();
  return { first: firstNameOnly(data?.name) || "A mate", email: data?.email ?? null };
}

const APP = () => process.env.NEXT_PUBLIC_APP_URL ?? "https://stretchyyoga.co.nz";

async function sendShoutEmails(admin: SupabaseClient, shout: ShoutRow, session: Record<string, any>) {
  const giver = await giverOf(admin, shout.giver_user_id);
  const extras = await buildSessionEmailExtras(admin, session, shout.session_id);
  const base = { sessionTitle: session.title, date: "", sessionId: shout.session_id, venue: session.location_name ?? undefined, socialStretchVenue: session.social_stretch_venue ?? undefined, ...extras };
  if (giver.email) {
    await sendAttendeeEmail("shout_sent", {
      ...base, to: giver.email, name: giver.first, shoutTo: shout.recipient_name, shoutPaid: money(shout.amount_cents),
      shoutDeliver: shout.deliver, shoutCode: shout.code,
    });
  }
  if (shout.deliver === "email" && shout.recipient_email) {
    await sendAttendeeEmail("shout_received", {
      ...base, to: shout.recipient_email, name: shout.recipient_name, shoutFrom: giver.first, shoutNote: shout.note ?? undefined, shoutCode: shout.code,
    });
  }
}

/** Everything the claim page needs, by the code in the link. */
export async function shoutByCode(admin: SupabaseClient, code: string) {
  const clean = (code ?? "").trim().toLowerCase();
  if (!/^[a-z0-9]{6,20}$/.test(clean)) return null;
  const { data: shout } = await admin.from("shouts").select("*").eq("code", clean).maybeSingle<ShoutRow>();
  if (!shout || shout.state === "pending") return null;
  const [{ data: session }, giver] = await Promise.all([
    admin.from("sessions").select("*").eq("id", shout.session_id).maybeSingle(),
    giverOf(admin, shout.giver_user_id),
  ]);
  if (!session) return null;
  return { shout, session, giverName: giver.first };
}

/** The mate claims their place: account found or made, terms, care note. No card. */
export async function claimShout(
  admin: SupabaseClient,
  code: string,
  b: { name?: unknown; email?: unknown; careNote?: unknown; agreed?: unknown }
): Promise<{ ok: true; newAccount: boolean; sessionId: string } | { error: string; status: number }> {
  const found = await shoutByCode(admin, code);
  if (!found) return { error: "This link doesn’t work. Check it with the person who sent it.", status: 404 };
  const { shout, session, giverName } = found;
  if (shout.state === "claimed" || shout.state === "settled") return { error: "This place has already been claimed.", status: 410 };
  if (shout.state !== "paid") return { error: "This shout isn’t available any more.", status: 410 };
  if (session.state === "cancelled" || session.state === "locked" || phase(session.starts_at, session.state) === "after2") {
    return { error: "Joining has closed for this one.", status: 410 };
  }

  const name = String(b.name ?? "").trim().slice(0, 60);
  const email = String(b.email ?? "").trim().toLowerCase();
  const careNote = String(b.careNote ?? "").trim().slice(0, 500);
  if (!name) return { error: "Add your first name.", status: 400 };
  if (!VALID_EMAIL.test(email)) return { error: "Enter a valid email.", status: 400 };
  if (b.agreed !== true) return { error: "Please tick to agree to the terms.", status: 400 };

  // Their account: existing by email, or a new one they finish by logging in.
  let userId: string | null = null;
  let newAccount = false;
  const { data: att } = await admin.from("attendees").select("auth_user_id").ilike("email", email).maybeSingle();
  if (att?.auth_user_id) userId = att.auth_user_id;
  else {
    const { data: created } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name: name } });
    if (created?.user) { userId = created.user.id; newAccount = true; }
    else userId = await findAuthUserIdByEmail(admin, email);
  }
  if (!userId) return { error: "Couldn’t set up your account. Please try again.", status: 500 };
  if (userId === shout.giver_user_id) return { error: "This place is for your mate to claim.", status: 400 };

  const { data: attendee } = await admin.from("attendees").select("id, moving_with_care_note").eq("auth_user_id", userId).maybeSingle();
  if (!attendee) await admin.from("attendees").insert({ auth_user_id: userId, name, email });
  if (careNote) {
    await admin.from("attendees").update({ moving_with_care_note: careNote, moving_with_care_duration: "until_changed", moving_with_care_ends_at: null }).eq("auth_user_id", userId);
  }

  const { data: already } = await admin.from("holds").select("id").eq("session_id", shout.session_id).eq("user_id", userId).eq("state", "active").maybeSingle();
  if (already) return { error: "You already have a place at this one. Let your mate know, so they can shout someone else.", status: 409 };

  // Only one claim wins.
  const { data: won } = await admin
    .from("shouts")
    .update({ state: "claimed", claimed_user_id: userId, claimed_at: new Date().toISOString() })
    .eq("id", shout.id)
    .eq("state", "paid")
    .select("id");
  if (!won || won.length === 0) return { error: "This place has already been claimed.", status: 410 };
  const { error: holdErr } = await admin.from("holds").update({ user_id: userId }).eq("id", shout.hold_id!).eq("state", "active");
  if (holdErr) {
    console.error("shout claim hold error:", holdErr);
    await admin.from("shouts").update({ state: "paid", claimed_user_id: null, claimed_at: null }).eq("id", shout.id);
    return { error: "Something went wrong. Please try again.", status: 500 };
  }

  // Emails: their place, and "{Name} claimed your shout" for the giver.
  const extras = await buildSessionEmailExtras(admin, session, shout.session_id);
  const base = { sessionTitle: session.title, date: "", sessionId: shout.session_id, venue: session.location_name ?? undefined, socialStretchVenue: session.social_stretch_venue ?? undefined, ...extras };
  await sendAttendeeEmail("comp_hold_confirmed", { ...base, to: email, name: firstNameOnly(name), newAccount, shoutFrom: giverName, spots: 1 }).catch(console.error);
  const giver = await giverOf(admin, shout.giver_user_id);
  if (giver.email) {
    await sendAttendeeEmail("shout_claimed", { ...base, to: giver.email, name: giver.first, shoutTo: firstNameOnly(name) || shout.recipient_name }).catch(console.error);
  }
  return { ok: true, newAccount, sessionId: shout.session_id };
}

/**
 * 30 mins out, from the lock-in job: each shouted place is settled at the
 * final price and the difference goes back to the giver's card. Unclaimed
 * places are settled the same way (the place stays empty). Returns one line
 * per giver for their emails.
 */
export async function settleShouts(
  admin: SupabaseClient,
  stripe: Stripe,
  sessionId: string,
  finalCents: number
): Promise<{ giverUserId: string; recipient: string; finalCents: number; refundCents: number }[]> {
  const { data: shouts } = await admin.from("shouts").select("*").eq("session_id", sessionId).in("state", ["paid", "claimed"]);
  const out = [];
  for (const s of (shouts ?? []) as ShoutRow[]) {
    const final = Math.min(finalCents, s.amount_cents);
    const refund = s.amount_cents - final;
    try {
      if (refund > 0 && s.stripe_pi_id) {
        await stripe.refunds.create({ payment_intent: s.stripe_pi_id, amount: refund }, { idempotencyKey: `shout-final-${s.id}` });
      }
      await admin.from("shouts").update({ state: "settled", final_cents: final, refund_cents: refund, settled_at: new Date().toISOString() }).eq("id", s.id);
      if (s.hold_id) await admin.from("holds").update({ state: "charged", amount_charged_nzd: final }).eq("id", s.hold_id);
      out.push({ giverUserId: s.giver_user_id, recipient: s.recipient_name, finalCents: final, refundCents: refund });
    } catch (e) {
      console.error(`Shout settle failed for ${s.id}:`, e);
    }
  }
  return out;
}

/** The shouts this person has made at a session (for "Manage my shout"). */
export async function myShouts(admin: SupabaseClient, sessionId: string, giverId: string) {
  const { data } = await admin
    .from("shouts")
    .select("id, code, recipient_name, deliver, state, amount_cents, final_cents, refund_cents, hide_price")
    .eq("session_id", sessionId)
    .eq("giver_user_id", giverId)
    .in("state", ["paid", "claimed", "settled"])
    .order("created_at");
  return data ?? [];
}

/** A session's final price per place, as the lock-in job works it out (for tests). */
export const finalPriceCents = (costBase: number, revenueTarget: number, people: number) => Math.round(calculatePrice(costBase, revenueTarget, people) * 100);
