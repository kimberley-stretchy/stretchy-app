import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendAttendeeEmail } from "@/lib/stretchy-email";
import { notifyHQ } from "@/lib/notifyLifecycle";

// ─────────────────────────────────────────────────────────────────────────────
// When someone tries to hold a place and their card doesn't go through.
//
// No place is held (that part was always right). What was missing: nobody was
// told. Now the person gets a short email with a link to try again, and HQ gets
// an alert saying who, which session, and why.
//
// At most one pair of emails per person per session every 30 minutes, so a few
// retries in a row don't send a pile of them. And nothing is sent if they
// already hold a place on that session (they got it on another try).
// ─────────────────────────────────────────────────────────────────────────────

const WINDOW_MS = 30 * 60 * 1000;

/** The bank's reason, in plain words. Never the raw code. */
export function friendlyDecline(err?: Stripe.PaymentIntent.LastPaymentError | null): string {
  const code = err?.decline_code ?? err?.code ?? "";
  switch (code) {
    case "insufficient_funds":
      return "Your bank told us there weren’t enough funds available.";
    case "expired_card":
      return "Your bank told us the card has expired.";
    case "incorrect_cvc":
    case "invalid_cvc":
      return "The security code (CVC) didn’t match.";
    case "incorrect_number":
    case "invalid_number":
      return "The card number wasn’t recognised.";
    case "card_not_supported":
      return "Your bank doesn’t allow this card for this kind of payment.";
    case "payment_intent_authentication_failure":
    case "authentication_required":
      return "Your bank’s security check wasn’t completed.";
    case "lost_card":
    case "stolen_card":
    case "pickup_card":
    case "do_not_honor":
    case "generic_decline":
    default:
      return "Your bank declined it, and didn’t tell us why.";
  }
}

export async function notifyBookingCardFailed(
  admin: SupabaseClient,
  pi: Stripe.PaymentIntent
): Promise<{ sent: boolean; reason?: string }> {
  // Only a first-time booking attempt: not the automatic re-authorisations when
  // someone changes their number of places, and not the lock-in charge (HQ's
  // "Starting in ~2h" email covers that one).
  const meta = pi.metadata ?? {};
  if (!meta.session_id || !meta.attendee_id) return { sent: false, reason: "not a booking" };
  if (meta.kind === "reauth" || meta.replaces_pi) return { sent: false, reason: "not a first attempt" };
  if (!pi.last_payment_error) return { sent: false, reason: "no failure recorded" };

  const [{ data: attendee }, { data: session }] = await Promise.all([
    admin.from("attendees").select("auth_user_id, name, email").eq("id", meta.attendee_id).maybeSingle(),
    admin.from("sessions").select("id, title, starts_at, location_name").eq("id", meta.session_id).maybeSingle(),
  ]);
  if (!attendee?.email || !session) return { sent: false, reason: "no attendee or session" };

  // They hold a place here already — a later try worked. Nothing to tell anyone.
  const { data: activeHold } = await admin
    .from("holds")
    .select("id")
    .eq("session_id", session.id)
    .eq("user_id", attendee.auth_user_id)
    .eq("state", "active")
    .maybeSingle();
  if (activeHold) return { sent: false, reason: "already holding" };

  // Already told them about this session in the last 30 minutes.
  const { data: recent } = await admin
    .from("email_log")
    .select("id")
    .eq("email_type", "booking_card_failed")
    .eq("recipient", attendee.email)
    .eq("session_id", session.id)
    .gte("created_at", new Date(Date.now() - WINDOW_MS).toISOString())
    .limit(1);
  if (recent && recent.length > 0) return { sent: false, reason: "already told" };

  const reason = friendlyDecline(pi.last_payment_error);
  const places = Math.max(1, Number(meta.quantity) || 1);
  const realName = attendee.name && !attendee.name.includes("@") ? attendee.name.split(" ")[0] : "there";

  await sendAttendeeEmail("booking_card_failed", {
    to: attendee.email,
    name: realName,
    sessionTitle: session.title,
    date: "",
    sessionId: session.id,
    spots: places,
    declineReason: reason,
  });

  await notifyHQ({
    subject: `Card didn’t go through: ${attendee.email} — ${session.title}`,
    scheme: "cream",
    kicker: "Stretchy HQ · Booking attempt failed",
    heading: "A card didn’t go through",
    sessionId: session.id,
    rows: [
      `<strong>${attendee.name && !attendee.name.includes("@") ? `${attendee.name} · ` : ""}${attendee.email}</strong> tried to hold ${places === 1 ? "a place" : `${places} places`} for <strong>${session.title}</strong>.`,
      `Why: ${reason}`,
      `<strong>No place is held and nothing was charged.</strong> They saw a message on screen and we’ve emailed them a link to try again.`,
      `If they try again and it works, you’ll see them in the attendee list as normal.`,
    ],
  });

  return { sent: true };
}
