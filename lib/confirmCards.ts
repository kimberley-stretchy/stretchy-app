import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authoriseSavedCard, needsFreshAuthorisation, cardFollowUp, cardDeadline, type AuthoriseResult } from "@/lib/authoriseAtConfirm";
import { finalCharge, formatDayTime } from "@/lib/sessionTimes";
import { hoursUntil } from "@/lib/sessionSchedule";
import { sendAttendeeEmail } from "@/lib/stretchy-email";
import { notifyHQ } from "@/lib/notifyLifecycle";
import { sendPushToUsers } from "@/lib/push-server";

// ─────────────────────────────────────────────────────────────────────────────
// The card step of the 36-hour "it's going ahead" moment.
//
// For every paying booking on the session: if the authorisation placed at
// booking can't be relied on to still be alive at charge time (2 hours out), put
// a fresh one on the saved card now, for the most that person can pay. If the
// card says no, the booking is marked (holds.card_failed_at) so the person can be
// asked to fix it and HQ knows — 34 hours ahead, not at 4am on the day.
//
// It never takes money, and a repeat run can't authorise the same booking twice.
// Nothing here throws: a problem with one booking is reported, not fatal.
// ─────────────────────────────────────────────────────────────────────────────

export type CardOutcome = {
  holdId: string;
  userId: string;
  quantity: number;
  /** kept = booking-time authorisation still good · authorised = fresh one placed */
  status: "kept" | "authorised" | "failed";
  /** The bank's code when it failed (for HQ; never shown raw to the person). */
  code?: string;
};

export function getStripeOrNull(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key, { apiVersion: "2024-04-10" }) : null;
}

export async function confirmCards(
  admin: SupabaseClient,
  session: { id: string; title: string; starts_at: string },
  unitCents: number
): Promise<{ ran: boolean; outcomes: CardOutcome[] }> {
  const stripe = getStripeOrNull();
  if (!stripe) return { ran: false, outcomes: [] }; // previews have no Stripe keys

  const { data: holds } = await admin
    .from("holds")
    .select("id, user_id, quantity, stripe_pi_id, is_comp")
    .eq("session_id", session.id)
    .eq("state", "active");
  const paying = (holds ?? []).filter((h) => !h.is_comp && h.user_id);
  if (paying.length === 0) return { ran: true, outcomes: [] };

  const { data: attendees } = await admin
    .from("attendees")
    .select("id, auth_user_id, stripe_customer_id, stripe_pm_id")
    .in("auth_user_id", paying.map((h) => h.user_id));
  const byUser = new Map((attendees ?? []).map((a) => [a.auth_user_id as string, a]));

  const captureAt = finalCharge(session.starts_at);
  const outcomes: CardOutcome[] = [];

  for (const h of paying) {
    const quantity = h.quantity ?? 1;
    const base = { holdId: h.id as string, userId: h.user_id as string, quantity };
    try {
      const pi = h.stripe_pi_id ? await stripe.paymentIntents.retrieve(h.stripe_pi_id).catch(() => null) : null;
      if (!needsFreshAuthorisation(pi, captureAt)) {
        outcomes.push({ ...base, status: "kept" });
        continue;
      }

      const attendee = byUser.get(h.user_id as string);
      const customerId = (typeof pi?.customer === "string" ? pi.customer : pi?.customer?.id) ?? attendee?.stripe_customer_id;
      const bookedWith = (typeof pi?.payment_method === "string" ? pi.payment_method : pi?.payment_method?.id) ?? attendee?.stripe_pm_id;

      const result: AuthoriseResult = customerId
        ? await authoriseSavedCard(stripe, {
            customerId,
            paymentMethodId: bookedWith,
            amountCents: unitCents * quantity,
            currency: pi?.currency,
            description: `Session x${quantity}: ${session.title}`,
            metadata: {
              session_id: session.id,
              attendee_id: String(attendee?.id ?? pi?.metadata?.attendee_id ?? ""),
              hold_id: String(h.id),
              quantity: String(quantity),
              ...(h.stripe_pi_id ? { replaces_pi: h.stripe_pi_id } : {}),
            },
            idempotencyKey: `confirm-auth-${h.id}-${unitCents * quantity}`,
          })
        : { ok: false, code: "no_saved_card", message: "No Stripe customer on file." };

      if (result.ok) {
        await admin.from("holds").update({ stripe_pi_id: result.piId, card_failed_at: null, card_fail_reason: null }).eq("id", h.id);
        // The old authorisation, if it's somehow still sitting there, is released
        // so the person never has two pending amounts.
        if (pi?.status === "requires_capture") await stripe.paymentIntents.cancel(pi.id).catch(() => {});
        outcomes.push({ ...base, status: "authorised" });
      } else {
        const code = (result as { code: string }).code;
        await admin.from("holds").update({ card_failed_at: new Date().toISOString(), card_fail_reason: code }).eq("id", h.id);
        outcomes.push({ ...base, status: "failed", code });
      }
    } catch (e) {
      console.error(`confirmCards: hold ${h.id} errored`, e);
      await admin.from("holds").update({ card_failed_at: new Date().toISOString(), card_fail_reason: "error" }).eq("id", h.id).then(undefined, () => {});
      outcomes.push({ ...base, status: "failed", code: "error" });
    }
  }
  return { ran: true, outcomes };
}

// ── Following up a card that couldn't be confirmed ───────────────────────────
// Run by the session-check job every 15 minutes. For each booking still marked
// card_failed_at on a session that's going ahead: one reminder at 20 hours out,
// and at 12 hours out the place is released (nothing charged) and the person and
// HQ are told. The timing rule is cardFollowUp() in lib/authoriseAtConfirm.ts.
const nameOf = (n: string | null | undefined) => (n && !n.includes("@") ? n.split(" ")[0] : "there");

export async function followUpFailedCards(
  admin: SupabaseClient,
  now: Date = new Date()
): Promise<{ reminded: number; released: number }> {
  let reminded = 0;
  let released = 0;
  const { data: rows, error } = await admin
    .from("holds")
    .select("id, user_id, quantity, stripe_pi_id, card_reminded_at, session_id")
    .eq("state", "active")
    .not("card_failed_at", "is", null);
  if (error || !rows || rows.length === 0) return { reminded, released };

  const sessionIds = Array.from(new Set(rows.map((r) => r.session_id as string)));
  const { data: sessions } = await admin.from("sessions").select("id, title, starts_at, state").in("id", sessionIds);
  const sessionById = new Map((sessions ?? []).map((s) => [s.id as string, s]));
  const stripe = getStripeOrNull();

  for (const h of rows) {
    try {
      const s = sessionById.get(h.session_id as string);
      if (!s || s.state !== "confirmed") continue; // locked, cancelled or finished: not ours to touch
      const step = cardFollowUp({ hoursUntil: hoursUntil(s.starts_at, now), reminded: !!h.card_reminded_at });
      if (step === "wait") continue;

      const { data: a } = await admin.from("attendees").select("name, email").eq("auth_user_id", h.user_id).maybeSingle();
      const quantity = h.quantity ?? 1;
      const common = { to: a?.email ?? "", name: nameOf(a?.name), sessionTitle: s.title, date: "", sessionId: s.id, spots: quantity };

      if (step === "remind") {
        if (a?.email) await sendAttendeeEmail("card_confirm_reminder", { ...common, cardDeadline: formatDayTime(cardDeadline(s.starts_at)) });
        await admin.from("holds").update({ card_reminded_at: now.toISOString() }).eq("id", h.id);
        reminded++;
        continue;
      }

      // release — only if it's still unfixed at this very moment
      const { data: freed } = await admin
        .from("holds")
        .update({ state: "released" })
        .eq("id", h.id)
        .eq("state", "active")
        .not("card_failed_at", "is", null)
        .select("id");
      if (!freed || freed.length === 0) continue;
      // Drop any pending amount that might still be sitting on their card.
      if (stripe && h.stripe_pi_id) await stripe.paymentIntents.cancel(h.stripe_pi_id).catch(() => {});
      if (a?.email) await sendAttendeeEmail("card_place_released", common);
      await sendPushToUsers([h.user_id as string], {
        title: "Your place has been released",
        body: `We couldn't confirm a card for ${s.title} in time, so it's gone back to the group.`,
        url: `/sessions/${s.id}`,
      }).catch(console.error);
      await notifyHQ({
        subject: `Place released (no working card): ${a?.email ?? "unknown"} — ${s.title}`,
        scheme: "cream",
        kicker: "Stretchy HQ · Place released",
        heading: "A place was released",
        sessionId: s.id,
        rows: [
          `<strong>${a?.name ? `${a.name} · ` : ""}${a?.email ?? "unknown"}</strong> didn't update their card in time, so their ${quantity === 1 ? "place" : `${quantity} places`} for <strong>${s.title}</strong> went back to the group.`,
          `<strong>Nothing was charged.</strong> They've been emailed, and can join again if there's room.`,
          `Nobody else's price goes up because of this.`,
        ],
      });
      released++;
    } catch (e) {
      console.error(`followUpFailedCards: hold ${h.id} errored`, e);
    }
  }
  return { reminded, released };
}

// ── The night-before card summary, for HQ ────────────────────────────────────
// At 12 hours out (6:15pm the evening before a 6:15am session), once any
// unfixed places have been released, HQ gets ONE email: either "all cards
// confirmed, nothing to do tonight" or who needs a look. Sent once per session
// (checked against the email log).
//
// Kimberley asked for this as a one-off for the first session (Fri 23 Oct 2026).
// To keep it for every session, remove the SUMMARY_ONLY_BEFORE check.
const SUMMARY_ONLY_BEFORE = "2026-10-24T00:00:00Z";
const SUMMARY_SUBJECT = "Night before";

export async function nightBeforeCardSummary(admin: SupabaseClient, now: Date = new Date()): Promise<number> {
  let sent = 0;
  const inHours = (h: number) => new Date(now.getTime() + h * 3600 * 1000).toISOString();
  const { data: sessions } = await admin
    .from("sessions")
    .select("id, title, starts_at, min_attendees")
    .eq("state", "confirmed")
    .gt("starts_at", inHours(2.5))
    .lte("starts_at", inHours(12))
    .lt("starts_at", SUMMARY_ONLY_BEFORE);

  for (const s of sessions ?? []) {
    try {
      const { data: already } = await admin
        .from("email_log")
        .select("id")
        .eq("session_id", s.id)
        .eq("email_type", "hq_digest")
        .like("subject", `${SUMMARY_SUBJECT}%`)
        .limit(1);
      if (already && already.length > 0) continue;

      const { data: holds } = await admin
        .from("holds")
        .select("user_id, quantity, is_comp, state, card_failed_at")
        .eq("session_id", s.id)
        .or("state.eq.active,card_failed_at.not.is.null");
      const rows = holds ?? [];
      const ids = Array.from(new Set(rows.map((h) => h.user_id).filter(Boolean)));
      const { data: people } = ids.length ? await admin.from("attendees").select("auth_user_id, name, email").in("auth_user_id", ids) : { data: [] };
      const who = (uid: string) => {
        const a = (people ?? []).find((p) => p.auth_user_id === uid);
        return `${a?.name && !a.name.includes("@") ? `${a.name} · ` : ""}${a?.email ?? "unknown"}`;
      };

      const active = rows.filter((h) => h.state === "active");
      const unfixed = active.filter((h) => h.card_failed_at);
      const released = rows.filter((h) => h.state === "released" && h.card_failed_at);
      const places = active.reduce((n, h) => n + (h.quantity ?? 1), 0);
      const allGood = unfixed.length === 0;

      await notifyHQ({
        subject: `${SUMMARY_SUBJECT}: ${allGood ? "all cards confirmed ✅" : `${unfixed.length} card${unfixed.length === 1 ? "" : "s"} need a look ⚠️`} — ${s.title}`,
        scheme: allGood ? "olive" : "orange",
        kicker: "Stretchy HQ · Night before",
        heading: allGood ? "All cards confirmed" : "A card needs a look tonight",
        sessionId: s.id,
        rows: [
          allGood
            ? `<strong>Nothing for you to do tonight.</strong> Every booking for ${s.title} has a confirmed card, and the final price is charged by itself 2 hours before.`
            : `<strong>These bookings still don't have a working card:</strong><br>${unfixed.map((h) => who(h.user_id as string)).join("<br>")}<br>Worth a message tonight.`,
          `<strong>${places}</strong> place${places === 1 ? "" : "s"} held (minimum ${s.min_attendees}).`,
          ...active.map((h) => `${who(h.user_id as string)} · ${h.quantity ?? 1} place${(h.quantity ?? 1) === 1 ? "" : "s"} · ${h.is_comp ? "on us" : h.card_failed_at ? "<strong>card not confirmed</strong>" : "card confirmed"}`),
          ...(released.length ? [`Released (no working card in time): ${released.map((h) => who(h.user_id as string)).join(", ")}`] : []),
          `You'll still get the usual "Starting in ~2h" email in the early hours. It can wait until after the session unless it's marked ⚠️.`,
        ],
      });
      sent++;
    } catch (e) {
      console.error(`nightBeforeCardSummary: session ${s.id} errored`, e);
    }
  }
  return sent;
}
