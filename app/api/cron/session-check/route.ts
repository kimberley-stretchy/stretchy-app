import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendPushToUsers } from "@/lib/push-server";
import { sendAttendeeBatch, APP_URL } from "@/lib/stretchy-email";
import { notifyHostRecruit, notifyHQ } from "@/lib/notifyLifecycle";
import { buildSessionEmailExtras, movementLabel } from "@/lib/sessionEmailContext";
import {
  DecisionSession,
  getHoldSummary,
  getAttendees,
  getInterestedUserIds,
  firstNameOf,
  fmtDate,
  confirmSession,
  cancelSession,
  startGrace,
} from "@/lib/sessionDecision";
import { followUpFailedCards, nightBeforeCardSummary } from "@/lib/confirmCards";
import { sendFirstStretchyFollowUps } from "@/lib/firstStretchyFollowUp";
import { stepsDue, hoursUntil, NUDGE_HOURS, HQ_WINDOW_HOURS, DECISION_HOURS } from "@/lib/sessionSchedule";

/**
 * GET /api/cron/session-check — runs every 15 minutes via Vercel Cron.
 *
 * The countdown rules live in lib/sessionSchedule.ts (tested on their own).
 * This file only fetches the sessions and carries out each step:
 *
 *  38 hrs out — "SO CLOSE" NUDGE (only if under the minimum)
 *     Email + push everyone holding or interested, tell the teacher + GEM, and
 *     give HQ a heads-up that its window opens in an hour.
 *
 *  37 hrs out — HQ-ONLY WINDOW (only if still under the minimum)
 *     HQ alone is told it will be called off at 36 hrs unless they press
 *     "Keep alive". No customer emails.
 *
 *  36 hrs out — THE YES / NO
 *     - minimum met, or HQ kept it alive → confirm; everyone told it's going ahead.
 *     - otherwise → cancel, release holds; everyone told it's not this time.
 *     Free cancelling closes at this same moment (app/api/holds), so what people
 *     are told is true the instant they're told it. There is no grace after it.
 *     Confirming also checks every card (lib/confirmCards.ts).
 *
 *  20 / 12 hrs out — CARDS THAT COULDN'T BE CONFIRMED
 *     One reminder, then the place is released. Nothing is charged.
 *
 * Emails are sent straight through Resend (lib/stretchy-email) — NOT via the
 * admin-gated /api/email route, which was silently 401-ing every cron send.
 */

// Confirming cards and sending emails for a full room takes a while; give the
// job a minute rather than the short default.
export const maxDuration = 60;

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
}

function hoursFromNow(now: Date, h: number): string {
  return new Date(now.getTime() + h * 60 * 60 * 1000).toISOString();
}

// Which of these sessions HQ has pressed "Keep alive" on. Read separately and
// tolerantly: if the keep_alive_at column hasn't been added yet, this is simply
// "none" rather than breaking the whole run.
async function keptAliveIds(admin: ReturnType<typeof getAdmin>, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { data, error } = await admin.from("sessions").select("id").in("id", ids).not("keep_alive_at", "is", null);
  if (error) return new Set();
  return new Set((data ?? []).map((r) => r.id as string));
}

export async function GET(request: NextRequest) {
  // Verify this is called by Vercel Cron (or manually by admin)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdmin();
  const now = new Date();

  // ── A) 38h "SO CLOSE" NUDGE ─────────────────────────────────────────────────
  // Wrapped so a nudge failure can never stop the steps below.
  let nudged = 0;
  // Any still-open session between 38 and 36 hrs out is looked at on every run
  // until it's actually been nudged — so one failed run (a throw, a transient
  // Resend error, the session still a draft at that minute) is retried on the
  // next tick, not lost. lib/sessionSchedule.ts decides whether a nudge is due.
  const { data: nudgeSessions } = await admin
    .from("sessions")
    .select("id, title, starts_at, location_name, min_attendees, social_stretch_venue, host_id, gem_host_id, movement_type, venue_instagram, social_venue_instagram, nudge_sent_at")
    .eq("state", "open")
    .not("is_draft", "is", true)
    .gt("starts_at", hoursFromNow(now, DECISION_HOURS))
    .lte("starts_at", hoursFromNow(now, NUDGE_HOURS));
  const nudgeKeptAlive = await keptAliveIds(admin, (nudgeSessions ?? []).map((s) => s.id));

  for (const s of nudgeSessions ?? []) {
    // Per-session isolation: one session's failure must never skip the rest, and
    // must never stop the 36h decision block below.
    try {
      if (s.nudge_sent_at) continue; // once-only, but only stamped after a send succeeds (below)

      const { count, userIds, compUserIds, spotsByUser } = await getHoldSummary(admin, s.id);
      const due = stepsDue({
        hoursUntil: hoursUntil(s.starts_at, now),
        held: count,
        min: s.min_attendees,
        nudgeSent: false,
        hqAlerted: true, // not this block's concern
        keptAlive: nudgeKeptAlive.has(s.id),
      });
      if (!due.includes("nudge")) continue; // already at the minimum, kept alive, or too empty to be "so close"

      const needed = s.min_attendees - count;
      const dateStr = fmtDate(s.starts_at);
      const shareUrl = `${APP_URL}/sessions/${s.id}`;

      // Everyone holding — paying AND comps — gets the "nearly there" nudge: comps
      // can't cancel/be charged, but they can still help fill it by sharing. The
      // template drops the cancellation-window box for comps.
      const nudgeExtras = await buildSessionEmailExtras(admin, s, s.id);
      const holders = await getAttendees(admin, userIds);
      const holderRes = await sendAttendeeBatch(holders.map((a) => ({
        type: "almost_there" as const,
        payload: {
          to: a.email ?? "",
          name: firstNameOf(a.name),
          sessionTitle: s.title,
          date: dateStr,
          venue: s.location_name,
          needed,
          shareUrl,
          sessionId: s.id,
          isHolder: true,
          isComp: compUserIds.has(a.auth_user_id),
          cancelUrl: `${APP_URL}/hold/${s.id}`,
          spots: spotsByUser.get(a.auth_user_id),
          socialStretchVenue: s.social_stretch_venue ?? undefined,
          ...nudgeExtras,
        },
      })));

      // Interested / watching (not already holding) — "grab a spot" variant.
      const interestedIds = (await getInterestedUserIds(admin, s.id)).filter((uid) => !userIds.includes(uid));
      const interested = await getAttendees(admin, interestedIds);
      const interestedRes = await sendAttendeeBatch(interested.map((a) => ({
        type: "almost_there" as const,
        payload: {
          to: a.email ?? "",
          name: firstNameOf(a.name),
          sessionTitle: s.title,
          date: dateStr,
          venue: s.location_name,
          needed,
          shareUrl,
          sessionId: s.id,
          isHolder: false,
          socialStretchVenue: s.social_stretch_venue ?? undefined,
          ...nudgeExtras,
        },
      })));

      // Push to holders + interested (best-effort, never blocks).
      await sendPushToUsers([...userIds, ...interestedIds], {
        title: needed <= 1 ? "1 more and it's on 👀" : `${needed} more and it's on 👀`,
        body: `${s.title} needs ${needed} more to go ahead. Know someone who'd love it?`,
        url: shareUrl,
      }).catch(console.error);

      // Teacher + GEM — "help fill it" heads-up (isolated; can't block the stamp).
      const recruitStyle = movementLabel(s.movement_type);
      const nudgeDetails = { social: s.social_stretch_venue, teacherHandle: nudgeExtras.teacherHandle, gemHandle: nudgeExtras.gemHandle, venueHandle: nudgeExtras.venueHandle, socialVenueHandle: nudgeExtras.socialVenueHandle };
      const recruitSession = { id: s.id, title: s.title, startsAt: s.starts_at, locationName: s.location_name };
      if (s.host_id) notifyHostRecruit({ hostId: s.host_id, role: "teacher", session: recruitSession, needed, shareUrl, style: recruitStyle, gemName: nudgeExtras.gemName, details: nudgeDetails }).catch(console.error);
      if (s.gem_host_id) notifyHostRecruit({ hostId: s.gem_host_id, role: "gem", session: recruitSession, needed, shareUrl, style: recruitStyle, details: nudgeDetails }).catch(console.error);

      // HQ heads-up ("from us") — isolated so an HQ-email hiccup can't stop the
      // once-only stamp (or cascade to other sessions).
      const teacherGemBits = [s.host_id ? "teacher" : null, s.gem_host_id ? "GEM" : null].filter(Boolean).join(" + ");
      try {
        await notifyHQ({
          subject: `Almost there: ${s.title} (${count}/${s.min_attendees})`,
          scheme: "purple",
          kicker: "Stretchy HQ · Decision at 36 hrs out",
          heading: `${s.title} — ${count}/${s.min_attendees}`,
          sessionId: s.id,
          rows: [
            `Needs <strong>${needed}</strong> more to go ahead.`,
            `<strong>Nudge just sent to:</strong> ${holders.length} holder${holders.length === 1 ? "" : "s"}${interestedIds.length ? `, ${interestedIds.length} interested` : ""}${teacherGemBits ? `, ${teacherGemBits}` : ""}.`,
            `🗓 ${dateStr}`,
            `📍 ${s.location_name}`,
            `If it's still short at 37 hours out, you'll get a "your call" email with one hour to keep it alive. The yes / no goes to everyone at 36 hours out.`,
          ],
          cta: { href: shareUrl, text: "View session →" },
        });
      } catch (e) {
        console.error(`Nudge HQ email failed for ${s.id}:`, e);
      }

      // Self-healing once-only: stamp nudge_sent_at ONLY if the customer sends
      // actually went through. A failed batch leaves it null so the next hourly
      // run retries — no silent permanent miss.
      if (!holderRes.error && !interestedRes.error) {
        await admin.from("sessions").update({ nudge_sent_at: new Date().toISOString() }).eq("id", s.id);
        nudged++;
      } else {
        console.error(`Nudge sends failed for ${s.id} — leaving unstamped to retry next run:`, holderRes.error, interestedRes.error);
      }
    } catch (e) {
      console.error(`38h nudge error for session ${s.id}:`, e);
    }
  }

  const sessionCols = "id, title, starts_at, location_name, min_attendees, cost_base, revenue_target, social_stretch_venue, host_id, gem_host_id, movement_type, duration_mins, getting_there, venue_instagram, social_venue_instagram, grace_started_at";
  const results: Record<string, unknown>[] = [];

  // ── B) 37h HQ-ONLY WINDOW ───────────────────────────────────────────────────
  // Still short between 37 and 36 hrs out → tell HQ, and only HQ, once. They
  // have until 36 hrs to press "Keep alive". grace_started_at is the "HQ has
  // been alerted" stamp. Checked every run in the window, so a late cancellation
  // that drops a session under its minimum still raises the alert.
  const { data: windowSessions } = await admin
    .from("sessions")
    .select(sessionCols)
    .eq("state", "open")
    .not("is_draft", "is", true)
    .gt("starts_at", hoursFromNow(now, DECISION_HOURS))
    .lte("starts_at", hoursFromNow(now, HQ_WINDOW_HOURS));
  const windowKeptAlive = await keptAliveIds(admin, (windowSessions ?? []).map((s) => s.id));

  for (const row of windowSessions ?? []) {
    const session = row as DecisionSession & { grace_started_at: string | null };
    try {
      const { count: holds } = await getHoldSummary(admin, session.id);
      const due = stepsDue({
        hoursUntil: hoursUntil(session.starts_at, now),
        held: holds,
        min: session.min_attendees,
        nudgeSent: true, // handled in block A
        hqAlerted: !!session.grace_started_at,
        keptAlive: windowKeptAlive.has(session.id),
      });
      if (due.includes("hq_alert")) {
        await startGrace(admin, session, holds);
        results.push({ session: session.title, action: "hq_alerted", holders: holds });
      }
    } catch (e) {
      console.error(`37h HQ window error for session ${session.id}:`, e);
    }
  }

  // ── C) 36h YES / NO ─────────────────────────────────────────────────────────
  // At 36 hrs out (or the next run after it): minimum met, or HQ kept it alive →
  // confirm. Otherwise → cancel. One decision, told to everyone now. The wide
  // lower bound means a missed run is caught by the next tick rather than lost.
  const { data: sessions } = await admin
    .from("sessions")
    .select(sessionCols)
    .eq("state", "open")
    .not("is_draft", "is", true)
    .gte("starts_at", hoursFromNow(now, 20))
    .lte("starts_at", hoursFromNow(now, DECISION_HOURS));
  const decisionKeptAlive = await keptAliveIds(admin, (sessions ?? []).map((s) => s.id));

  for (const row of sessions ?? []) {
    const session = row as DecisionSession & { grace_started_at: string | null };
    // Per-session isolation so one failure can't skip the rest.
    try {
      const { count: holds } = await getHoldSummary(admin, session.id);
      const keptAlive = decisionKeptAlive.has(session.id);
      const [step] = stepsDue({
        hoursUntil: hoursUntil(session.starts_at, now),
        held: holds,
        min: session.min_attendees,
        nudgeSent: true,
        hqAlerted: true,
        keptAlive,
      });

      if (step === "confirm") {
        const r = await confirmSession(admin, session, { keptAlive: keptAlive && holds < session.min_attendees });
        results.push({ session: session.title, action: "confirmed", holders: r.holders, keptAlive });
      } else if (step === "cancel") {
        const r = await cancelSession(admin, session);
        results.push({ session: session.title, action: "cancelled", holders: r.holders, needed: session.min_attendees });
      }
    } catch (e) {
      console.error(`36h decision error for session ${session.id}:`, e);
    }
  }

  // ── D) CARDS THAT COULDN'T BE CONFIRMED AT 36 HRS ───────────────────────────
  // One reminder at 20 hrs out; at 12 hrs out the place is released and the
  // person and HQ are told. Contained, so it can never affect the steps above.
  let cards = { reminded: 0, released: 0 };
  try {
    cards = await followUpFailedCards(admin, now);
    // …then HQ's night-before "are all cards sorted?" email, 12 hrs out.
    await nightBeforeCardSummary(admin, now);
  } catch (e) {
    console.error("Card follow-up error:", e);
  }

  // ── E) "HOW WAS YOUR FIRST STRETCHY?" ───────────────────────────────────────
  // Two days after someone's first session, once, in the daytime.
  let followUps = 0;
  try {
    followUps = await sendFirstStretchyFollowUps(admin, now);
  } catch (e) {
    console.error("First-Stretchy follow-up error:", e);
  }

  return NextResponse.json({ nudged, checked: (sessions ?? []).length, results, cards, followUps });
}
