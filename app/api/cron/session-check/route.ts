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

/**
 * GET /api/cron/session-check — runs hourly via Vercel Cron.
 *
 * Two time windows, evaluated newest-first so a session is only ever in one:
 *
 *  A) ~38h out (2h before the decision) — RECRUIT NUDGE
 *     For still-open sessions under their minimum: email + push the holders a
 *     "so close, tell your mates" nudge (with a share link) that doubles as the
 *     cancellation-window reminder, and send HQ a "decision in ~2h" heads-up.
 *
 *  B) ~36h out — THE DECISION
 *     - minimum met  → confirm, email/push all holders "it's happening",
 *                       notify the teacher + GEM + HQ it's going ahead.
 *     - minimum short → cancel, release holds, email/push all holders
 *                       "not this time", notify the teacher + GEM + HQ.
 *
 * Emails are sent straight through Resend (lib/stretchy-email) — NOT via the
 * admin-gated /api/email route, which was silently 401-ing every cron send.
 */

// ── Tunables ────────────────────────────────────────────────────────────────
// Only nudge sessions with at least this many holds at the 38h mark. Raise this
// (or switch to a fraction of min_attendees) to nudge only when genuinely close.
const NUDGE_MIN_HOLDS = 1;

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

// Grace window: a short session at 36h is held (HQ-alerted only), not cancelled.
// If HQ doesn't override within this long, the next run auto-cancels it. 50 min
// (not 60) so the very next hourly run always clears the bar even with cron drift.
const GRACE_MS = 50 * 60 * 1000;

export async function GET(request: NextRequest) {
  // Verify this is called by Vercel Cron (or manually by admin)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getAdmin();
  const now = new Date();

  // ── A) 38h RECRUIT NUDGE ────────────────────────────────────────────────────
  // Wrapped so a nudge failure can never stop the 36h decision below.
  let nudged = 0;
  // Catch-up band, not a single window. The nudge belongs at ~38h, but if that
  // one hourly run fails (a throw, a transient Resend error, the session still a
  // draft at that minute), a fixed 37.5–38.5h window would lose it forever. Here
  // any still-open, under-min session in [36.5h, 39h) is eligible every hourly
  // run until it's actually nudged — so a miss is retried on the next tick. The
  // lower bound stays strictly ABOVE the decision's 36.5h upper bound, so a nudge
  // and the go/cancel decision can never land in the same run.
  const { data: nudgeSessions } = await admin
    .from("sessions")
    .select("id, title, starts_at, location_name, min_attendees, social_stretch_venue, host_id, gem_host_id, movement_type, venue_instagram, social_venue_instagram, nudge_sent_at")
    .eq("state", "open")
    .not("is_draft", "is", true)
    .gte("starts_at", hoursFromNow(now, 36.5))
    .lt("starts_at", hoursFromNow(now, 39));

  for (const s of nudgeSessions ?? []) {
    // Per-session isolation: one session's failure must never skip the rest, and
    // must never stop the 36h decision block below.
    try {
      if (s.nudge_sent_at) continue; // once-only, but only stamped after a send succeeds (below)

      const { count, userIds, compUserIds, spotsByUser } = await getHoldSummary(admin, s.id);
      if (count >= s.min_attendees) continue; // already there — it'll confirm at 36h
      if (count < NUDGE_MIN_HOLDS) continue; // too empty to bother nudging

      const needed = s.min_attendees - count;
      const dateStr = fmtDate(s.starts_at);
      const shareUrl = `${APP_URL}/sessions/${s.id}`;

      // Everyone holding — paying AND comps — gets the "nearly there" nudge: comps
      // can't cancel/be charged, but they can still help fill it by sharing. The
      // template drops the cancellation-window box for comps.
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
          cancelUrl: `${APP_URL}/my-holds`,
          spots: spotsByUser.get(a.auth_user_id),
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
        },
      })));

      // Push to holders + interested (best-effort, never blocks).
      sendPushToUsers([...userIds, ...interestedIds], {
        title: needed <= 1 ? "1 more and it's on 👀" : `${needed} more and it's on 👀`,
        body: `${s.title} needs ${needed} more to lock in. Tell your mates!`,
        url: shareUrl,
      }).catch(console.error);

      // Teacher + GEM — "help fill it" heads-up (isolated; can't block the stamp).
      const recruitStyle = movementLabel(s.movement_type);
      const nudgeExtras = await buildSessionEmailExtras(admin, s);
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
          kicker: "Stretchy HQ · Decision in ~2h",
          heading: `${s.title} — ${count}/${s.min_attendees}`,
          sessionId: s.id,
          rows: [
            `Needs <strong>${needed}</strong> more hold${needed === 1 ? "" : "s"} to lock in.`,
            `<strong>Nudge just sent to:</strong> ${holders.length} holder${holders.length === 1 ? "" : "s"}${interestedIds.length ? `, ${interestedIds.length} interested` : ""}${teacherGemBits ? `, ${teacherGemBits}` : ""}.`,
            `🗓 ${dateStr}`,
            `📍 ${s.location_name}`,
            `The 36-hour auto-decision runs in about 2 hours. If it's still short then, it's cancelled and no one is charged.`,
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

  // ── B) 36h DECISION, with a 35h grace window ────────────────────────────────
  // At ~36h: minimum met → confirm now; still short → open a SILENT grace window
  // and alert HQ only (no customer emails). ~1h later (the 35h run) if it's still
  // short and HQ hasn't hit "Keep it alive & confirm", it auto-cancels. Filling
  // naturally during grace confirms it instead. Grace timing is measured from
  // grace_started_at (drift-proof), and the wide lower bound means a missed run is
  // simply caught by the next tick rather than lost.
  const { data: sessions } = await admin
    .from("sessions")
    .select("id, title, starts_at, location_name, min_attendees, cost_base, revenue_target, social_stretch_venue, host_id, gem_host_id, movement_type, duration_mins, getting_there, venue_instagram, social_venue_instagram, grace_started_at")
    .eq("state", "open")
    .not("is_draft", "is", true)
    .gte("starts_at", hoursFromNow(now, 20))
    .lt("starts_at", hoursFromNow(now, 36.5));

  const results: Record<string, unknown>[] = [];

  for (const row of sessions ?? []) {
    const session = row as DecisionSession & { grace_started_at: string | null };
    // Per-session isolation so one failure can't skip the rest.
    try {
      const { count: holds } = await getHoldSummary(admin, session.id);

      if (holds >= session.min_attendees) {
        // Minimum met — at the 36h mark, or filled naturally during grace → confirm.
        const r = await confirmSession(admin, session);
        results.push({ session: session.title, action: "confirmed", holders: r.holders });
        continue;
      }

      // Still short of the minimum.
      if (!session.grace_started_at) {
        // First sighting at the decision point → open the HQ-only grace window.
        // No customer emails yet; HQ has ~1h to override before it auto-cancels.
        await startGrace(admin, session, holds);
        results.push({ session: session.title, action: "grace_started", holders: holds });
      } else if (Date.now() - new Date(session.grace_started_at).getTime() >= GRACE_MS) {
        // Grace hour elapsed and HQ didn't keep it alive → auto-cancel now.
        const r = await cancelSession(admin, session);
        results.push({ session: session.title, action: "cancelled", holders: r.holders, needed: session.min_attendees });
      } else {
        // Still inside the grace hour — wait for HQ or the next run.
        results.push({ session: session.title, action: "grace_waiting", holders: holds });
      }
    } catch (e) {
      console.error(`36h decision error for session ${session.id}:`, e);
    }
  }

  return NextResponse.json({ nudged, checked: (sessions ?? []).length, results });
}
