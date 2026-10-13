import { SupabaseClient } from "@supabase/supabase-js";
import { sendAttendeeBatch, APP_URL } from "@/lib/stretchy-email";
import { notifyHostConfirmed, notifyHQ } from "@/lib/notifyLifecycle";
import { notifyHostCancelled } from "@/lib/notifyHostScheduled";
import { buildSessionEmailExtras, isFirstStretchy } from "@/lib/sessionEmailContext";
import { calculatePrice } from "@/lib/pricing";
import { sendPushToUsers } from "@/lib/push-server";
import { goNoGo, formatDayTime, formatTime } from "@/lib/sessionTimes";
import { notifyVenues } from "@/lib/notifyVenue";
import { confirmCards, type CardOutcome } from "@/lib/confirmCards";
import { cardDeadline } from "@/lib/authoriseAtConfirm";
import { friendlyDeclineCode } from "@/lib/cardFailed";

// The go/cancel decision lives here — NOT inline in the cron — so the hourly
// automation and HQ's manual "Keep it alive & confirm" override run the exact
// same code (same emails, same state changes, same push).

export interface DecisionSession {
  id: string;
  title: string;
  starts_at: string;
  location_name: string | null;
  min_attendees: number;
  cost_base: number;
  revenue_target: number;
  social_stretch_venue: string | null;
  host_id: string | null;
  gem_host_id: string | null;
  movement_type: string | null;
  duration_mins: number | null;
  getting_there: string | null;
  venue_instagram: string | null;
  social_venue_instagram: string | null;
}

export const firstNameOf = (name: string | null) => name?.split(" ")[0] ?? "there";

export function fmtDate(startsAt: string): string {
  const d = new Date(startsAt);
  return (
    d.toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "long", day: "numeric", month: "long" }) +
    " at " +
    d.toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit", hour12: true })
  );
}

// Sum active-hold *quantity* (one row can be several spots), the distinct holder
// ids, which are comp, and spots-per-holder.
export async function getHoldSummary(
  admin: SupabaseClient,
  sessionId: string
): Promise<{ count: number; userIds: string[]; compUserIds: Set<string>; spotsByUser: Map<string, number> }> {
  const { data } = await admin
    .from("holds")
    .select("user_id, quantity, is_comp")
    .eq("session_id", sessionId)
    .eq("state", "active");
  const rows = data ?? [];
  const count = rows.reduce((s, h) => s + (h.quantity ?? 1), 0);
  const userIds = Array.from(new Set(rows.map((h) => h.user_id).filter(Boolean)));
  const compUserIds = new Set(rows.filter((h) => h.is_comp && h.user_id).map((h) => h.user_id as string));
  const spotsByUser = new Map<string, number>();
  for (const h of rows) {
    if (!h.user_id) continue;
    spotsByUser.set(h.user_id, (spotsByUser.get(h.user_id) ?? 0) + (h.quantity ?? 1));
  }
  return { count, userIds, compUserIds, spotsByUser };
}

export async function getAttendees(
  admin: SupabaseClient,
  userIds: string[]
): Promise<{ auth_user_id: string; name: string | null; email: string | null }[]> {
  if (userIds.length === 0) return [];
  const { data } = await admin.from("attendees").select("auth_user_id, name, email").in("auth_user_id", userIds);
  return data ?? [];
}

export async function getInterestedUserIds(admin: SupabaseClient, sessionId: string): Promise<string[]> {
  const { data } = await admin.from("session_interest").select("user_id").eq("session_id", sessionId);
  return Array.from(new Set((data ?? []).map((r) => r.user_id).filter(Boolean)));
}

// ── CONFIRM ───────────────────────────────────────────────────────────────────
// Set state=confirmed, clear any grace flag, and fire "it's happening" to every
// holder (+comps), "it's on" to Interested, confirm+calendar to teacher/GEM, and
// the HQ digest. Idempotent-ish: safe to call once per session (the caller gates
// on state=open). Used by both the 36h auto-decision and the HQ override button.
export async function confirmSession(
  admin: SupabaseClient,
  session: DecisionSession,
  opts: { keptAlive?: boolean } = {}
): Promise<{ action: "confirmed"; holders: number }> {
  // Critical state change first, on its own — so it can't be blocked by the
  // grace column being absent (migration gap). Clearing grace is best-effort.
  await admin
    .from("sessions")
    .update({ state: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", session.id);
  await admin.from("sessions").update({ grace_started_at: null }).eq("id", session.id).then(undefined, () => {});

  const { count: holds, userIds, compUserIds, spotsByUser } = await getHoldSummary(admin, session.id);
  const dateStr = fmtDate(session.starts_at);
  const finalPrice = `$${calculatePrice(
    session.cost_base,
    session.revenue_target,
    Math.max(holds, session.min_attendees)
  ).toFixed(2)} incl. GST`;

  // The headcount it was confirmed at. Nobody pays more than the price at this
  // number, even if a place is released later. Best-effort.
  await admin.from("sessions").update({ confirmed_headcount: holds }).eq("id", session.id).then(undefined, () => {});

  // Confirm every card now, 36 hours out: a fresh authorisation wherever the one
  // from booking won't last until the charge. A failure here must never stop the
  // "it's going ahead" emails, so it's fully contained.
  const unitCents = Math.round(calculatePrice(session.cost_base, session.revenue_target, Math.max(holds, session.min_attendees)) * 100);
  let cards: { ran: boolean; outcomes: CardOutcome[] } = { ran: false, outcomes: [] };
  try {
    cards = await confirmCards(admin, session, unitCents);
  } catch (e) {
    console.error(`confirmCards failed for session ${session.id}:`, e);
  }
  const failedCodeByUser = new Map(cards.outcomes.filter((o) => o.status === "failed").map((o) => [o.userId, o.code]));
  const deadlineStr = formatDayTime(cardDeadline(session.starts_at));

  const emailExtras = await buildSessionEmailExtras(admin, session, session.id);

  const holders = await getAttendees(admin, userIds);
  const goAheadItems = [];
  for (const a of holders) {
    if (!a.email) continue;
    // Their card couldn't be confirmed: they get that email instead, and the
    // "it's going ahead" one once they've fixed it.
    if (failedCodeByUser.has(a.auth_user_id)) {
      goAheadItems.push({
        type: "card_confirm_failed" as const,
        payload: {
          to: a.email,
          name: firstNameOf(a.name),
          sessionTitle: session.title,
          date: dateStr,
          sessionId: session.id,
          spots: spotsByUser.get(a.auth_user_id),
          declineReason: friendlyDeclineCode(failedCodeByUser.get(a.auth_user_id)),
          cardDeadline: deadlineStr,
        },
      });
      continue;
    }
    goAheadItems.push({
      type: "session_going_ahead" as const,
      payload: {
        to: a.email,
        name: firstNameOf(a.name),
        sessionTitle: session.title,
        date: dateStr,
        price: finalPrice,
        venue: session.location_name ?? undefined,
        socialStretchVenue: session.social_stretch_venue ?? undefined,
        sessionId: session.id,
        isComp: compUserIds.has(a.auth_user_id),
        isFirstStretchy: await isFirstStretchy(admin, a.auth_user_id),
        spots: spotsByUser.get(a.auth_user_id),
        ...emailExtras,
      },
    });
  }
  await sendAttendeeBatch(goAheadItems);
  const failedUserIds = Array.from(failedCodeByUser.keys());
  if (failedUserIds.length > 0) {
    await sendPushToUsers(failedUserIds, {
      title: "We couldn't confirm your card",
      body: `${session.title} is going ahead. Update your card by ${deadlineStr} to keep your place.`,
      url: `/hold/${session.id}/card`,
      requireInteraction: true,
    }).catch(console.error);
  }
  await sendPushToUsers(userIds.filter((u) => !failedCodeByUser.has(u)), {
    title: "It's going ahead 🎉",
    body: `${session.title} is on. There's still room to join, and the price keeps dropping.`,
    url: `/notifications/going-ahead?session=${session.id}`,
    requireInteraction: true,
  }).catch(console.error);

  const interestedIds = (await getInterestedUserIds(admin, session.id)).filter((uid) => !userIds.includes(uid));
  const interested = await getAttendees(admin, interestedIds);
  await sendAttendeeBatch(
    interested.map((a) => ({
      type: "session_confirmed_open" as const,
      payload: {
        to: a.email ?? "",
        name: firstNameOf(a.name),
        sessionTitle: session.title,
        date: dateStr,
        price: finalPrice,
        venue: session.location_name ?? undefined,
        socialStretchVenue: session.social_stretch_venue ?? undefined,
        sessionId: session.id,
        ...emailExtras,
      },
    }))
  );
  if (interestedIds.length > 0) {
    await sendPushToUsers(interestedIds, {
      title: "It's on 🎉",
      body: `${session.title} is going ahead. Still room to join, up to 2 hours before.`,
      url: `/sessions/${session.id}`,
    }).catch(console.error);
  }

  const hostSession = { id: session.id, title: session.title, startsAt: session.starts_at, locationName: session.location_name ?? "" };
  const hostDetails = { social: session.social_stretch_venue, teacherHandle: emailExtras.teacherHandle, gemHandle: emailExtras.gemHandle, venueHandle: emailExtras.venueHandle, socialVenueHandle: emailExtras.socialVenueHandle };
  if (session.host_id) notifyHostConfirmed({ hostId: session.host_id, role: "teacher", session: hostSession, gemName: emailExtras.gemName, style: emailExtras.teacherStyle, details: hostDetails }).catch(console.error);
  if (session.gem_host_id) notifyHostConfirmed({ hostId: session.gem_host_id, role: "gem", session: hostSession, style: emailExtras.teacherStyle, details: hostDetails }).catch(console.error);
  // Both venues hear it's on, with the numbers so far.
  await notifyVenues(admin, session.id, "confirmed", holds);
  await notifyHQ({
    subject: `Confirmed: ${session.title} (${holds}/${session.min_attendees})`,
    scheme: "olive",
    kicker: "Stretchy HQ · Confirmed ✅",
    heading: `${session.title} is going ahead`,
    sessionId: session.id,
    rows: [
      opts.keptAlive
        ? `<strong>${holds}</strong> of ${session.min_attendees} holds — under the minimum, going ahead because HQ kept it alive. Teacher and GEM have been notified.`
        : `<strong>${holds}</strong> holds — minimum met. Teacher and GEM have been notified.`,
      `🗓 ${dateStr}`,
      `📍 ${session.location_name ?? "TBC"}`,
      `Final price at lock-in (2h before): ${finalPrice}.`,
      cardSummaryRow(cards, holders, deadlineStr),
    ],
  });

  return { action: "confirmed", holders: holds };
}

// One line for HQ's "Confirmed" email: did every card check out?
function cardSummaryRow(
  cards: { ran: boolean; outcomes: CardOutcome[] },
  holders: { auth_user_id: string; name: string | null; email: string | null }[],
  deadlineStr: string
): string {
  if (!cards.ran) return `<strong>Cards were not checked</strong> (the card step didn't run). Have a look in Stripe.`;
  const failed = cards.outcomes.filter((o) => o.status === "failed");
  const ok = cards.outcomes.length - failed.length;
  if (failed.length === 0) return `💳 <strong>All ${ok} card${ok === 1 ? "" : "s"} confirmed.</strong> Nothing for you to do.`;
  const who = failed.map((o) => {
    const a = holders.find((h) => h.auth_user_id === o.userId);
    return `${a?.name ?? "Unknown"} (${a?.email ?? "no email"}) · ${o.quantity} place${o.quantity === 1 ? "" : "s"} · ${friendlyDeclineCode(o.code)}`;
  });
  return `💳 ${ok} card${ok === 1 ? "" : "s"} confirmed · <strong>${failed.length} couldn't be confirmed:</strong><br>${who.join("<br>")}<br>They've been emailed a link to update their card, and have until ${deadlineStr}. You'll get an email when they fix it, or when their place is released.`;
}

// ── CANCEL ────────────────────────────────────────────────────────────────────
export async function cancelSession(
  admin: SupabaseClient,
  session: DecisionSession
): Promise<{ action: "cancelled"; holders: number }> {
  const { count: holds, userIds, spotsByUser } = await getHoldSummary(admin, session.id);
  // Read the session facts for the email BEFORE releasing the holds, so the
  // "{held} of {min}" count and dots show the room as it was.
  const emailExtras = await buildSessionEmailExtras(admin, session, session.id);

  await admin.from("sessions").update({ state: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", session.id);
  await admin.from("sessions").update({ grace_started_at: null }).eq("id", session.id).then(undefined, () => {});
  await admin.from("holds").update({ state: "released" }).eq("session_id", session.id).eq("state", "active");

  const dateStr = fmtDate(session.starts_at);
  const holders = await getAttendees(admin, userIds);
  await sendAttendeeBatch(
    holders.map((a) => ({
      type: "session_cancelled" as const,
      payload: {
        to: a.email ?? "",
        name: firstNameOf(a.name),
        sessionTitle: session.title,
        date: dateStr,
        venue: session.location_name ?? undefined,
        sessionId: session.id,
        spots: spotsByUser.get(a.auth_user_id),
        ...emailExtras,
        attendeeCount: holds,
      },
    }))
  );
  await sendPushToUsers(userIds, {
    title: "Not this time 💛",
    body: `${session.title} didn't reach its minimum, so it's called off. You pay nothing.`,
    url: `/notifications/cancelled?session=${session.id}`,
  }).catch(console.error);

  const hostSession = { id: session.id, title: session.title, startsAt: session.starts_at, locationName: session.location_name ?? "" };
  if (session.host_id) notifyHostCancelled({ hostId: session.host_id, role: "teacher", session: hostSession }).catch(console.error);
  if (session.gem_host_id) notifyHostCancelled({ hostId: session.gem_host_id, role: "gem", session: hostSession }).catch(console.error);
  await notifyVenues(admin, session.id, "cancelled");
  await notifyHQ({
    subject: `Cancelled: ${session.title} (${holds}/${session.min_attendees})`,
    scheme: "cream",
    kicker: "Stretchy HQ · Cancelled",
    heading: `${session.title} didn't reach minimum`,
    sessionId: session.id,
    rows: [
      `Only <strong>${holds}</strong> of ${session.min_attendees} holds — cancelled. All holds released, nothing charged.`,
      `🗓 ${dateStr}`,
      `📍 ${session.location_name ?? "TBC"}`,
      `Teacher and GEM have been notified.`,
    ],
  });

  return { action: "cancelled", holders: holds };
}

// ── HQ WINDOW ─────────────────────────────────────────────────────────────────
// At 37 hrs out a still-short session opens a one-hour, HQ-ONLY window: nobody
// else is told anything. HQ can press "Keep alive" before 36 hrs out; if they
// don't, the 36 hr yes / no calls it off. grace_started_at records that the
// alert has gone, so it's sent once. (The name is historical — this used to be
// a grace hour AFTER the 36 hr mark.)
export async function startGrace(
  admin: SupabaseClient,
  session: DecisionSession,
  holds: number
): Promise<void> {
  await admin.from("sessions").update({ grace_started_at: new Date().toISOString() }).eq("id", session.id);
  const needed = session.min_attendees - holds;
  const dateStr = fmtDate(session.starts_at);
  const decisionAt = formatDayTime(goNoGo(session.starts_at));
  await notifyHQ({
    subject: `⚠️ Your call by ${formatTime(goNoGo(session.starts_at))}: ${session.title} is ${needed} short (${holds}/${session.min_attendees})`,
    scheme: "purple",
    kicker: "Stretchy HQ · Your call — one hour to decide",
    heading: `${session.title} is ${needed} short`,
    sessionId: session.id,
    rows: [
      `It has <strong>${holds}</strong> of ${session.min_attendees}. Left alone, it's <strong>called off at 36 hours out (${decisionAt})</strong> and everyone's told then.`,
      `To run it anyway, press <strong>Keep alive</strong> in HQ before then. Nothing is sent straight away — at ${formatTime(goNoGo(session.starts_at))} everyone gets the "it's going ahead" email as normal.`,
      `If it reaches ${session.min_attendees} by itself before then, it goes ahead without you doing anything.`,
      `🗓 ${dateStr}`,
      `📍 ${session.location_name ?? "TBC"}`,
      `No customer emails have gone out about this — this alert is HQ-only.`,
    ],
    cta: { href: `${APP_URL}/admin/sessions`, text: "Open HQ to decide →" },
  });
}
