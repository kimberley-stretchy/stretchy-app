import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { phase, goNoGo, finalCharge, formatDayTime } from "@/lib/sessionTimes";
import { sendAttendeeEmail, type AttendeeEmailType, type AttendeeEmailPayload } from "@/lib/stretchy-email";
import { buildSessionEmailExtras } from "@/lib/sessionEmailContext";
import { SESSION_COLS, giverOf, money, firstNameOnly, type ShoutRow } from "@/lib/shout";

// ─────────────────────────────────────────────────────────────────────────────
// Shout a mate, part B: cancelling (SOCIAL_BOOKING_BRIEF.md section 4).
//
//   We call it off        callOffShouts     → giver chooses re-book or refund
//                         expireCalledOff   → no choice in 7 days: refunded
//                         refundCalledOff   → the giver chose a refund
//                         (re-book: a new shout with rebook_of; once it's paid,
//                          finaliseShout refunds the old one)
//   Giver cancels         giverCancelShout  → up to 36 hrs out: full refund,
//                                             the link stops working, a mate
//                                             who'd claimed it is told kindly
//   Mate can't make it    mateCantMake      → unclaimed, from the claim page
//                         mateCancelsClaimed→ claimed, from their booking page
//                         Up to 36 hrs out: place released, giver refunded.
//                         Inside 36 hrs: giver told, no refund; the place stays
//                         paid so they can pass the link on.
//   Unclaimed at 48 hrs   nudgeUnclaimed    → one nudge to the giver
//
// Every money step moves the shout's state with a conditional update first,
// so running twice (a double tap, two cron runs) never refunds twice. Stripe
// refunds also carry an idempotency key per shout.
// ─────────────────────────────────────────────────────────────────────────────

export const CALLED_OFF_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

type Session = Record<string, any>;

async function loadShout(admin: SupabaseClient, shoutId: string) {
  const { data } = await admin.from("shouts").select("*").eq("id", shoutId).maybeSingle<ShoutRow & { declined_at: string | null; rebook_of: string | null }>();
  return data;
}

async function loadSession(admin: SupabaseClient, sessionId: string): Promise<Session | null> {
  const { data } = await admin.from("sessions").select(SESSION_COLS).eq("id", sessionId).maybeSingle();
  return data;
}

/** Move a shout from one of `from` to `to`. True only for the caller that moved it. */
async function move(admin: SupabaseClient, shoutId: string, from: string[], patch: Record<string, unknown>) {
  const { data } = await admin.from("shouts").update(patch).eq("id", shoutId).in("state", from).select("id");
  return !!data && data.length > 0;
}

/** Give the giver back everything they paid. */
async function refundAll(stripe: Stripe, s: ShoutRow, key: string) {
  if (!s.stripe_pi_id) return;
  await stripe.refunds.create({ payment_intent: s.stripe_pi_id }, { idempotencyKey: `shout-${key}-${s.id}` });
}

async function emailBase(admin: SupabaseClient, session: Session) {
  const extras = await buildSessionEmailExtras(admin, session, session.id);
  return { sessionTitle: session.title, date: "", sessionId: session.id, venue: session.location_name ?? undefined, socialStretchVenue: session.social_stretch_venue ?? undefined, ...extras };
}

async function emailGiver(admin: SupabaseClient, s: ShoutRow, session: Session, type: AttendeeEmailType, extra: Partial<AttendeeEmailPayload>) {
  const giver = await giverOf(admin, s.giver_user_id);
  if (!giver.email) return;
  await sendAttendeeEmail(type, { ...(await emailBase(admin, session)), to: giver.email, name: giver.first, shoutTo: s.recipient_name, shoutCode: s.code, shoutDeliver: s.deliver, shoutId: s.id, ...extra } as AttendeeEmailPayload);
}

/** The "you can't cancel now" message, the one place real dates are shown. */
export function noFreeCancel(startsAt: string) {
  return `Free cancelling closed 36 hours out (${formatDayTime(goNoGo(startsAt))}). The final price is charged 30 minutes before (${formatDayTime(finalCharge(startsAt))}) and any difference comes back to your card. Something serious come up? Get in touch.`;
}

// ── We call it off ───────────────────────────────────────────────────────────

/**
 * Called by both ways a session is called off (not enough people at 36 hrs,
 * or HQ cancels it), after the holds are released. Each paid shout waits for
 * the giver to choose: re-book their mate, or a refund.
 */
export async function callOffShouts(admin: SupabaseClient, sessionId: string): Promise<number> {
  const { data } = await admin.from("shouts").select("*").eq("session_id", sessionId).in("state", ["paid", "claimed"]);
  const session = await loadSession(admin, sessionId);
  if (!session) return 0;
  let n = 0;
  for (const s of (data ?? []) as ShoutRow[]) {
    if (!(await move(admin, s.id, ["paid", "claimed"], { state: "cancelled", cancelled_at: new Date().toISOString() }))) continue;
    n++;
    await emailGiver(admin, s, session, "shout_called_off", { shoutPaid: money(s.amount_cents) }).catch((e) => console.error("shout_called_off email error:", e));
  }
  return n;
}

/** The giver chose a refund (or, from expireCalledOff, didn't choose in time). */
export async function refundCalledOff(admin: SupabaseClient, stripe: Stripe, shoutId: string, giverId: string | null, why: "choice" | "expired" | "rebooked") {
  const s = await loadShout(admin, shoutId);
  if (!s || (giverId && s.giver_user_id !== giverId)) return { error: "Shout not found", status: 404 } as const;
  if (s.state === "refunded") return { ok: true, already: true } as const;
  if (s.state !== "cancelled") return { error: "This shout can’t be refunded here. Email hello@stretchyyoga.co.nz and we’ll sort it.", status: 400 } as const;
  if (!(await move(admin, s.id, ["cancelled"], { state: "refunded", refund_cents: s.amount_cents }))) return { ok: true, already: true } as const;
  try {
    await refundAll(stripe, s, "calledoff");
  } catch (e) {
    console.error(`Shout refund failed for ${s.id}:`, e);
    await admin.from("shouts").update({ state: "cancelled", refund_cents: null }).eq("id", s.id);
    return { error: "We couldn’t refund that just now. Please try again, or email hello@stretchyyoga.co.nz.", status: 502 } as const;
  }
  if (why !== "rebooked") {
    const session = await loadSession(admin, s.session_id);
    if (session) await emailGiver(admin, s, session, "shout_refunded", { shoutRefund: money(s.amount_cents), shoutWhy: why }).catch(console.error);
  }
  return { ok: true, already: false } as const;
}

/** From the session check: no choice 7 days after it was called off → refunded in full. */
export async function expireCalledOff(admin: SupabaseClient, stripe: Stripe, now: Date): Promise<number> {
  const { data } = await admin
    .from("shouts")
    .select("id")
    .eq("state", "cancelled")
    .lte("cancelled_at", new Date(now.getTime() - CALLED_OFF_DAYS * DAY_MS).toISOString());
  let n = 0;
  for (const s of data ?? []) {
    const r = await refundCalledOff(admin, stripe, s.id, null, "expired");
    if ("ok" in r && !r.already) n++;
  }
  return n;
}

/** For the re-book page: the called-off shout, if it's this giver's and still waiting. */
export async function calledOffShout(admin: SupabaseClient, shoutId: string, giverId: string) {
  const s = await loadShout(admin, shoutId);
  if (!s || s.giver_user_id !== giverId) return null;
  return s;
}

// ── The giver cancels ────────────────────────────────────────────────────────

export async function giverCancelShout(admin: SupabaseClient, stripe: Stripe, shoutId: string, giverId: string) {
  const s = await loadShout(admin, shoutId);
  if (!s || s.giver_user_id !== giverId) return { error: "Shout not found", status: 404 } as const;
  if (s.state === "refunded") return { ok: true } as const;
  if (s.state !== "paid" && s.state !== "claimed") return { error: "This shout can’t be cancelled now.", status: 400 } as const;
  const session = await loadSession(admin, s.session_id);
  if (!session) return { error: "Session not found", status: 404 } as const;
  if (phase(session.starts_at, session.state) !== "before36") return { error: noFreeCancel(session.starts_at), status: 400 } as const;

  if (!(await move(admin, s.id, [s.state], { state: "refunded", refund_cents: s.amount_cents, cancelled_at: new Date().toISOString() }))) {
    return { error: "This shout has just changed. Refresh and try again.", status: 409 } as const;
  }
  try {
    await refundAll(stripe, s, "cancel");
  } catch (e) {
    console.error(`Shout cancel refund failed for ${s.id}:`, e);
    await admin.from("shouts").update({ state: s.state, refund_cents: null, cancelled_at: null }).eq("id", s.id);
    return { error: "We couldn’t refund that just now. Please try again, or email hello@stretchyyoga.co.nz.", status: 502 } as const;
  }
  if (s.hold_id) await admin.from("holds").update({ state: "released" }).eq("id", s.hold_id).eq("state", "active");

  await emailGiver(admin, s, session, "shout_refunded", { shoutRefund: money(s.amount_cents), shoutWhy: "giver" }).catch(console.error);
  // A mate who'd already claimed it is told kindly. An unclaimed link just stops working.
  if (s.state === "claimed" && s.claimed_user_id) {
    const [{ data: mate }, giver] = await Promise.all([
      admin.from("attendees").select("name, email").eq("auth_user_id", s.claimed_user_id).maybeSingle(),
      giverOf(admin, s.giver_user_id),
    ]);
    if (mate?.email) {
      await sendAttendeeEmail("shout_called_off", { ...(await emailBase(admin, session)), to: mate.email, name: firstNameOnly(mate.name) || s.recipient_name, shoutFrom: giver.first, shoutRole: "mate" }).catch(console.error);
    }
  }
  return { ok: true } as const;
}

// ── The mate can't make it ───────────────────────────────────────────────────

/** "I can't make it" on the claim page (not claimed yet). */
export async function mateCantMake(admin: SupabaseClient, stripe: Stripe, code: string) {
  const clean = (code ?? "").trim().toLowerCase();
  if (!/^[a-z0-9]{6,20}$/.test(clean)) return { error: "This link doesn’t work.", status: 404 } as const;
  const { data: s } = await admin.from("shouts").select("*").eq("code", clean).maybeSingle<ShoutRow & { declined_at: string | null }>();
  if (!s || s.state === "pending") return { error: "This link doesn’t work.", status: 404 } as const;
  if (s.state !== "paid") return { ok: true } as const; // already sorted, claimed, or called off: nothing more to tell
  const session = await loadSession(admin, s.session_id);
  if (!session) return { error: "Session not found", status: 404 } as const;
  return releaseForMate(admin, stripe, s, session, "paid");
}

/** A mate who claimed their place cancels it from their booking page. */
export async function mateCancelsClaimed(admin: SupabaseClient, stripe: Stripe, shoutId: string, mateId: string) {
  const s = await loadShout(admin, shoutId);
  if (!s || s.claimed_user_id !== mateId || s.state !== "claimed") return { error: "No active place found", status: 404 } as const;
  const session = await loadSession(admin, s.session_id);
  if (!session) return { error: "Session not found", status: 404 } as const;
  if (phase(session.starts_at, session.state) !== "before36") return { error: noFreeCancel(session.starts_at), status: 400 } as const;
  return releaseForMate(admin, stripe, s, session, "claimed");
}

async function releaseForMate(admin: SupabaseClient, stripe: Stripe, s: ShoutRow & { declined_at?: string | null }, session: Session, from: "paid" | "claimed") {
  const name = firstNameOnly(s.recipient_name);
  if (phase(session.starts_at, session.state) === "before36") {
    if (!(await move(admin, s.id, [from], { state: "released", refund_cents: s.amount_cents, cancelled_at: new Date().toISOString() }))) return { ok: true } as const;
    try {
      await refundAll(stripe, s, "released");
    } catch (e) {
      console.error(`Shout release refund failed for ${s.id}:`, e);
      await admin.from("shouts").update({ state: from, refund_cents: null, cancelled_at: null }).eq("id", s.id);
      return { error: "Something went wrong. Please try again.", status: 502 } as const;
    }
    if (s.hold_id) await admin.from("holds").update({ state: "released" }).eq("id", s.hold_id).eq("state", "active");
    await emailGiver(admin, s, session, "shout_released", { shoutTo: name, shoutRefund: money(s.amount_cents) }).catch(console.error);
    return { ok: true, refunded: true } as const;
  }
  // Inside 36 hrs: no free cancelling. Tell the giver once, so they can pass it on.
  if (from === "paid" && !s.declined_at) {
    const { data: first } = await admin.from("shouts").update({ declined_at: new Date().toISOString() }).eq("id", s.id).is("declined_at", null).select("id");
    if (first?.length) await emailGiver(admin, s, session, "shout_released", { shoutTo: name }).catch(console.error);
  }
  return { ok: true, refunded: false } as const;
}

// ── 48 hrs out, still unclaimed ──────────────────────────────────────────────

export const NUDGE_SHOUT_HOURS = 48;

/** From the session check: one nudge to the giver, between 48 and 36 hrs out, for shouts made before 48 hrs out. */
export async function nudgeUnclaimed(admin: SupabaseClient, now: Date): Promise<number> {
  const hrs = (h: number) => new Date(now.getTime() + h * 60 * 60 * 1000).toISOString();
  const { data: sessions } = await admin
    .from("sessions")
    .select(SESSION_COLS)
    .in("state", ["open", "confirmed"])
    .gt("starts_at", hrs(36))
    .lte("starts_at", hrs(NUDGE_SHOUT_HOURS));
  let n = 0;
  for (const session of sessions ?? []) {
    const { data } = await admin.from("shouts").select("*").eq("session_id", session.id).eq("state", "paid").is("nudged_at", null).is("declined_at", null);
    const mark = new Date(session.starts_at).getTime() - NUDGE_SHOUT_HOURS * 60 * 60 * 1000;
    for (const s of (data ?? []) as (ShoutRow & { paid_at: string | null })[]) {
      // Only shouts made before the 48-hr mark: a fresh one doesn't need a nudge.
      if (!s.paid_at || new Date(s.paid_at).getTime() > mark) continue;
      const { data: won } = await admin.from("shouts").update({ nudged_at: now.toISOString() }).eq("id", s.id).is("nudged_at", null).select("id");
      if (!won?.length) continue;
      await emailGiver(admin, s, session, "shout_unclaimed_nudge", {}).catch((e) => console.error("shout nudge email error:", e));
      n++;
    }
  }
  return n;
}

/** "Send it again" from Manage my shout: once per emailed shout, not yet claimed. */
export async function resendShout(admin: SupabaseClient, shoutId: string, giverId: string) {
  const s = await loadShout(admin, shoutId);
  if (!s || s.giver_user_id !== giverId) return { error: "Shout not found", status: 404 } as const;
  if (s.state !== "paid" || s.deliver !== "email" || !s.recipient_email) return { error: "This one can’t be sent again.", status: 400 } as const;
  const session = await loadSession(admin, s.session_id);
  if (!session || session.state === "cancelled") return { error: "This one’s been called off.", status: 400 } as const;
  const { data: first } = await admin.from("shouts").update({ resent_at: new Date().toISOString() }).eq("id", s.id).is("resent_at", null).select("id");
  if (!first?.length) return { error: `We’ve already sent it again. Copy the link and send it to ${s.recipient_name} yourself.`, status: 400 } as const;
  const giver = await giverOf(admin, s.giver_user_id);
  await sendAttendeeEmail("shout_received", { ...(await emailBase(admin, session)), to: s.recipient_email, name: s.recipient_name, shoutFrom: giver.first, shoutNote: s.note ?? undefined, shoutCode: s.code });
  return { ok: true } as const;
}

// ── Tidying up ───────────────────────────────────────────────────────────────

/** The mate's email and the giver's note go one week after the session (the payment record stays). */
export const SHOUT_KEEP_MS = 7 * DAY_MS;

export async function clearFinishedShouts(admin: SupabaseClient, now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - SHOUT_KEEP_MS).toISOString();
  const { data } = await admin
    .from("shouts")
    .select("id, session:sessions!inner(starts_at)")
    .in("state", ["settled", "refunded", "released"])
    .or("recipient_email.not.is.null,note.not.is.null")
    .lt("session.starts_at", cutoff)
    .limit(500);
  const ids = (data ?? []).map((r) => r.id as string);
  if (ids.length === 0) return 0;
  await admin.from("shouts").update({ recipient_email: null, note: null }).in("id", ids);
  return ids.length;
}
