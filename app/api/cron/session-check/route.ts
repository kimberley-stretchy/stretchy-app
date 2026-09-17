import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { sendPushToUsers } from "@/lib/push-server";
import { calculatePrice } from "@/lib/pricing";
import { sendAttendeeBatch, APP_URL } from "@/lib/stretchy-email";
import { notifyHostCancelled } from "@/lib/notifyHostScheduled";
import { notifyHostConfirmed, notifyHostRecruit, notifyHQ } from "@/lib/notifyLifecycle";
import { buildSessionEmailExtras, isFirstStretchy, movementLabel } from "@/lib/sessionEmailContext";

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

function fmtDate(startsAt: string): string {
  const d = new Date(startsAt);
  return (
    d.toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "long", day: "numeric", month: "long" }) +
    " at " +
    d.toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit", hour12: true })
  );
}

// Sum active-hold *quantity* (one row can be several spots) and collect the
// distinct holder auth-user ids, flagging which are comp (gifted) holds.
async function getHoldSummary(
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
  // Spots per holder — one row can be several spaces (e.g. "bring 4").
  const spotsByUser = new Map<string, number>();
  for (const h of rows) {
    if (!h.user_id) continue;
    spotsByUser.set(h.user_id, (spotsByUser.get(h.user_id) ?? 0) + (h.quantity ?? 1));
  }
  return { count, userIds, compUserIds, spotsByUser };
}

async function getAttendees(
  admin: SupabaseClient,
  userIds: string[]
): Promise<{ auth_user_id: string; name: string | null; email: string | null }[]> {
  if (userIds.length === 0) return [];
  const { data } = await admin.from("attendees").select("auth_user_id, name, email").in("auth_user_id", userIds);
  return data ?? [];
}

// User ids of everyone who marked "interested" in a session.
async function getInterestedUserIds(admin: SupabaseClient, sessionId: string): Promise<string[]> {
  const { data } = await admin.from("session_interest").select("user_id").eq("session_id", sessionId);
  return Array.from(new Set((data ?? []).map((r) => r.user_id).filter(Boolean)));
}

const firstNameOf = (name: string | null) => name?.split(" ")[0] ?? "there";

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

  // ── B) 36h DECISION ─────────────────────────────────────────────────────────
  const { data: sessions } = await admin
    .from("sessions")
    .select("id, title, starts_at, ends_at, location_name, min_attendees, max_attendees, cost_base, revenue_target, social_stretch_venue, state, host_id, gem_host_id, movement_type, duration_mins, getting_there, venue_instagram, social_venue_instagram")
    .eq("state", "open")
    .not("is_draft", "is", true)
    // Fires at the ~36h mark. Half-hour-offset bounds so a whole-hour session
    // lands MID-window (36h) — otherwise the cron's few-seconds drift lets a
    // 37h session slip past a whole-hour upper bound and decide an hour early
    // (which is what made the nudge + cancel land in the same run).
    .gte("starts_at", hoursFromNow(now, 34.5))
    .lt("starts_at", hoursFromNow(now, 36.5));

  const results: Record<string, unknown>[] = [];

  for (const session of sessions ?? []) {
    const { count: holds, userIds, compUserIds, spotsByUser } = await getHoldSummary(admin, session.id);
    const dateStr = fmtDate(session.starts_at);
    const hostSession = {
      id: session.id,
      title: session.title,
      startsAt: session.starts_at,
      locationName: session.location_name,
    };

    if (holds >= session.min_attendees) {
      // ── GOING AHEAD ──────────────────────────────────────────────────────────
      await admin.from("sessions").update({ state: "confirmed", confirmed_at: new Date().toISOString() }).eq("id", session.id);

      const finalPrice = `$${calculatePrice(
        session.cost_base,
        session.revenue_target,
        Math.max(holds, session.min_attendees)
      ).toFixed(2)} incl. GST`;

      // Attendees
      const emailExtras = await buildSessionEmailExtras(admin, session);
      const holders = await getAttendees(admin, userIds);
      const goAheadItems = [];
      for (const a of holders) {
        if (!a.email) continue;
        goAheadItems.push({
          type: "session_going_ahead" as const,
          payload: {
            to: a.email,
            name: firstNameOf(a.name),
            sessionTitle: session.title,
            date: dateStr,
            price: finalPrice,
            venue: session.location_name,
            socialStretchVenue: session.social_stretch_venue ?? "nearby",
            sessionId: session.id,
            isComp: compUserIds.has(a.auth_user_id),
            isFirstStretchy: await isFirstStretchy(admin, a.auth_user_id),
            spots: spotsByUser.get(a.auth_user_id),
            ...emailExtras,
          },
        });
      }
      await sendAttendeeBatch(goAheadItems);
      sendPushToUsers(userIds, {
        title: "It's happening! ✅",
        body: `${session.title} is confirmed. Price may still drop — see you there!`,
        url: `/notifications/going-ahead?session=${session.id}`,
        requireInteraction: true,
      }).catch(console.error);

      // Interested / watching (not already holding) — "it's on, now book".
      const interestedIds = (await getInterestedUserIds(admin, session.id)).filter((uid) => !userIds.includes(uid));
      const interested = await getAttendees(admin, interestedIds);
      await sendAttendeeBatch(interested.map((a) => ({
        type: "session_confirmed_open" as const,
        payload: {
          to: a.email ?? "",
          name: firstNameOf(a.name),
          sessionTitle: session.title,
          date: dateStr,
          price: finalPrice,
          venue: session.location_name,
          socialStretchVenue: session.social_stretch_venue ?? "nearby",
          sessionId: session.id,
          ...emailExtras,
        },
      })));
      if (interestedIds.length > 0) {
        sendPushToUsers(interestedIds, {
          title: "It's on 🎉",
          body: `${session.title} is happening — grab a spot before it fills.`,
          url: `/sessions/${session.id}`,
        }).catch(console.error);
      }

      // Teacher + GEM + HQ
      const hostDetails = { social: session.social_stretch_venue, teacherHandle: emailExtras.teacherHandle, gemHandle: emailExtras.gemHandle, venueHandle: emailExtras.venueHandle, socialVenueHandle: emailExtras.socialVenueHandle };
      if (session.host_id) notifyHostConfirmed({ hostId: session.host_id, role: "teacher", session: hostSession, gemName: emailExtras.gemName, style: emailExtras.teacherStyle, details: hostDetails }).catch(console.error);
      if (session.gem_host_id) notifyHostConfirmed({ hostId: session.gem_host_id, role: "gem", session: hostSession, style: emailExtras.teacherStyle, details: hostDetails }).catch(console.error);
      await notifyHQ({
        subject: `Confirmed: ${session.title} (${holds}/${session.min_attendees})`,
        scheme: "olive",
        kicker: "Stretchy HQ · Confirmed ✅",
        heading: `${session.title} is going ahead`,
        rows: [
          `<strong>${holds}</strong> holds — minimum met. Teacher and GEM have been notified.`,
          `🗓 ${dateStr}`,
          `📍 ${session.location_name}`,
          `Final price at lock-in (2h before): ${finalPrice}.`,
        ],
      });

      results.push({ session: session.title, action: "confirmed", holders });
    } else {
      // ── NOT THIS TIME ────────────────────────────────────────────────────────
      await admin.from("sessions").update({ state: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", session.id);
      await admin.from("holds").update({ state: "released" }).eq("session_id", session.id).eq("state", "active");

      // Attendees (the ids we captured before releasing)
      const holders = await getAttendees(admin, userIds);
      await sendAttendeeBatch(holders.map((a) => ({
        type: "session_cancelled" as const,
        payload: {
          to: a.email ?? "",
          name: firstNameOf(a.name),
          sessionTitle: session.title,
          date: dateStr,
          sessionId: session.id,
          spots: spotsByUser.get(a.auth_user_id),
        },
      })));
      sendPushToUsers(userIds, {
        title: "Not this time 💙",
        body: `${session.title} didn't reach the minimum. Nothing was charged.`,
        url: `/notifications/cancelled?session=${session.id}`,
      }).catch(console.error);

      // Teacher + GEM + HQ (notifyHostCancelled skips the HQ placeholder host)
      if (session.host_id) notifyHostCancelled({ hostId: session.host_id, role: "teacher", session: hostSession }).catch(console.error);
      if (session.gem_host_id) notifyHostCancelled({ hostId: session.gem_host_id, role: "gem", session: hostSession }).catch(console.error);
      await notifyHQ({
        subject: `Cancelled: ${session.title} (${holds}/${session.min_attendees})`,
        scheme: "cream",
        kicker: "Stretchy HQ · Cancelled",
        heading: `${session.title} didn't reach minimum`,
        rows: [
          `Only <strong>${holds}</strong> of ${session.min_attendees} holds — cancelled. All holds released, nothing charged.`,
          `🗓 ${dateStr}`,
          `📍 ${session.location_name}`,
          `Teacher and GEM have been notified.`,
        ],
      });

      results.push({ session: session.title, action: "cancelled", holders, needed: session.min_attendees });
    }
  }

  return NextResponse.json({ nudged, checked: (sessions ?? []).length, results });
}
