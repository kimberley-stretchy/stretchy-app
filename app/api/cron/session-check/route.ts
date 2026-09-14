import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { sendPushToUsers } from "@/lib/push-server";
import { calculatePrice } from "@/lib/pricing";
import { sendAttendeeEmail, APP_URL } from "@/lib/stretchy-email";
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
// Also blast the general city waitlist (NOT session-specific — best-effort city
// match on the venue name). Off by default; flip to true to widen the net.
const NUDGE_WAITLIST = false;

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
): Promise<{ count: number; userIds: string[]; compUserIds: Set<string> }> {
  const { data } = await admin
    .from("holds")
    .select("user_id, quantity, is_comp")
    .eq("session_id", sessionId)
    .eq("state", "active");
  const rows = data ?? [];
  const count = rows.reduce((s, h) => s + (h.quantity ?? 1), 0);
  const userIds = Array.from(new Set(rows.map((h) => h.user_id).filter(Boolean)));
  const compUserIds = new Set(rows.filter((h) => h.is_comp && h.user_id).map((h) => h.user_id as string));
  return { count, userIds, compUserIds };
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
  try {
    const { data: nudgeSessions } = await admin
      .from("sessions")
      .select("id, title, starts_at, location_name, min_attendees, social_stretch_venue, host_id, gem_host_id, movement_type, venue_instagram, social_venue_instagram")
      .eq("state", "open")
      // Fires ~37–38.5h out (covers the 38h mark and tonight's 37h catch-up).
      // Half-hour-offset bounds so whole-hour sessions land mid-window — the
      // hourly cron fires a few seconds after :00, so integer-hour bounds get
      // missed by that drift.
      .not("is_draft", "is", true)
      .gte("starts_at", hoursFromNow(now, 36.5))
      .lt("starts_at", hoursFromNow(now, 38.5));

    for (const s of nudgeSessions ?? []) {
      const { count, userIds, compUserIds } = await getHoldSummary(admin, s.id);
      if (count >= s.min_attendees) continue; // already there — it'll confirm at 36h
      if (count < NUDGE_MIN_HOLDS) continue; // too empty to bother nudging

      // Fire ONCE per session — never a double nudge within the window. Fail-open:
      // if the nudge_sent_at column isn't there yet, the read errors and we send
      // anyway (guard just doesn't apply until the migration is run).
      const { data: nudgeRow, error: nudgeErr } = await admin.from("sessions").select("nudge_sent_at").eq("id", s.id).maybeSingle();
      if (!nudgeErr && nudgeRow?.nudge_sent_at) continue;

      const needed = s.min_attendees - count;
      const dateStr = fmtDate(s.starts_at);
      const shareUrl = `${APP_URL}/sessions/${s.id}`;

      // Holders (paid) — recruit nudge + cancellation-window reminder. Comps are
      // gifted in and can't cancel/be charged, so they skip this one.
      const payingHolderIds = userIds.filter((uid) => !compUserIds.has(uid));
      const holders = await getAttendees(admin, payingHolderIds);
      for (const a of holders) {
        if (!a.email) continue;
        await sendAttendeeEmail("almost_there", {
          to: a.email,
          name: firstNameOf(a.name),
          sessionTitle: s.title,
          date: dateStr,
          venue: s.location_name,
          needed,
          shareUrl,
          sessionId: s.id,
          isHolder: true,
          cancelUrl: `${APP_URL}/my-holds`,
        });
      }

      // Interested / watching (not already holding) — "grab a spot" variant.
      const interestedIds = (await getInterestedUserIds(admin, s.id)).filter((uid) => !userIds.includes(uid));
      const interested = await getAttendees(admin, interestedIds);
      for (const a of interested) {
        if (!a.email) continue;
        await sendAttendeeEmail("almost_there", {
          to: a.email,
          name: firstNameOf(a.name),
          sessionTitle: s.title,
          date: dateStr,
          venue: s.location_name,
          needed,
          shareUrl,
          sessionId: s.id,
          isHolder: false,
        });
      }

      // Push to paying holders + interested.
      sendPushToUsers([...payingHolderIds, ...interestedIds], {
        title: needed <= 1 ? "1 more and it's on 👀" : `${needed} more and it's on 👀`,
        body: `${s.title} needs ${needed} more to lock in. Tell your mates!`,
        url: shareUrl,
      }).catch(console.error);

      // Teacher + GEM — "help fill it" heads-up.
      const recruitStyle = movementLabel(s.movement_type);
      const nudgeExtras = await buildSessionEmailExtras(admin, s);
      const nudgeDetails = { social: s.social_stretch_venue, teacherHandle: nudgeExtras.teacherHandle, gemHandle: nudgeExtras.gemHandle, venueHandle: nudgeExtras.venueHandle, socialVenueHandle: nudgeExtras.socialVenueHandle };
      const recruitSession = { id: s.id, title: s.title, startsAt: s.starts_at, locationName: s.location_name };
      if (s.host_id) notifyHostRecruit({ hostId: s.host_id, role: "teacher", session: recruitSession, needed, shareUrl, style: recruitStyle, gemName: nudgeExtras.gemName, details: nudgeDetails }).catch(console.error);
      if (s.gem_host_id) notifyHostRecruit({ hostId: s.gem_host_id, role: "gem", session: recruitSession, needed, shareUrl, style: recruitStyle, details: nudgeDetails }).catch(console.error);

      // Optional: general city waitlist (not session-specific — best-effort match)
      if (NUDGE_WAITLIST) {
        try {
          const { data: wl } = await admin.from("waitlist").select("name, email, city");
          const venue = (s.location_name ?? "").toLowerCase();
          for (const w of wl ?? []) {
            const city = (w.city ?? "").toLowerCase();
            if (!w.email || !city || !venue.includes(city)) continue;
            await sendAttendeeEmail("almost_there", {
              to: w.email,
              name: firstNameOf(w.name),
              sessionTitle: s.title,
              date: dateStr,
              venue: s.location_name,
              needed,
              shareUrl,
              sessionId: s.id,
              isHolder: false,
            });
          }
        } catch (e) {
          console.error("Waitlist nudge error:", e);
        }
      }

      // HQ heads-up ("from us") — the matching record of exactly what just went
      // out to customers / teacher / GEM.
      const teacherGemBits = [s.host_id ? "teacher" : null, s.gem_host_id ? "GEM" : null].filter(Boolean).join(" + ");
      await notifyHQ({
        subject: `Almost there: ${s.title} (${count}/${s.min_attendees})`,
        scheme: "purple",
        kicker: "Stretchy HQ · Decision in ~2h",
        heading: `${s.title} — ${count}/${s.min_attendees}`,
        rows: [
          `Needs <strong>${needed}</strong> more hold${needed === 1 ? "" : "s"} to lock in.`,
          `<strong>Nudge just sent to:</strong> ${payingHolderIds.length} holder${payingHolderIds.length === 1 ? "" : "s"}${interestedIds.length ? `, ${interestedIds.length} interested` : ""}${teacherGemBits ? `, ${teacherGemBits}` : ""}.`,
          `🗓 ${dateStr}`,
          `📍 ${s.location_name}`,
          `The 36-hour auto-decision runs in about 2 hours. If it's still short then, it's cancelled and no one is charged.`,
        ],
        cta: { href: shareUrl, text: "View session →" },
      });

      // Mark it nudged so it can't fire again (fail-open: ignored if column absent).
      await admin.from("sessions").update({ nudge_sent_at: new Date().toISOString() }).eq("id", s.id);

      nudged++;
    }
  } catch (e) {
    console.error("38h nudge block error:", e);
  }

  // ── B) 36h DECISION ─────────────────────────────────────────────────────────
  const { data: sessions } = await admin
    .from("sessions")
    .select("id, title, starts_at, ends_at, location_name, min_attendees, max_attendees, cost_base, revenue_target, social_stretch_venue, state, host_id, gem_host_id, movement_type, duration_mins, getting_there, venue_instagram, social_venue_instagram")
    .eq("state", "open")
    .not("is_draft", "is", true)
    .gte("starts_at", hoursFromNow(now, 35))
    .lt("starts_at", hoursFromNow(now, 37));

  const results: Record<string, unknown>[] = [];

  for (const session of sessions ?? []) {
    const { count: holds, userIds, compUserIds } = await getHoldSummary(admin, session.id);
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
      for (const a of holders) {
        if (!a.email) continue;
        await sendAttendeeEmail("session_going_ahead", {
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
          ...emailExtras,
        });
      }
      sendPushToUsers(userIds, {
        title: "It's happening! ✅",
        body: `${session.title} is confirmed. Price may still drop — see you there!`,
        url: `/notifications/going-ahead?session=${session.id}`,
        requireInteraction: true,
      }).catch(console.error);

      // Interested / watching (not already holding) — "it's on, now book".
      const interestedIds = (await getInterestedUserIds(admin, session.id)).filter((uid) => !userIds.includes(uid));
      const interested = await getAttendees(admin, interestedIds);
      for (const a of interested) {
        if (!a.email) continue;
        await sendAttendeeEmail("session_confirmed_open", {
          to: a.email,
          name: firstNameOf(a.name),
          sessionTitle: session.title,
          date: dateStr,
          price: finalPrice,
          venue: session.location_name,
          socialStretchVenue: session.social_stretch_venue ?? "nearby",
          sessionId: session.id,
          ...emailExtras,
        });
      }
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
      for (const a of holders) {
        if (!a.email) continue;
        await sendAttendeeEmail("session_cancelled", {
          to: a.email,
          name: firstNameOf(a.name),
          sessionTitle: session.title,
          date: dateStr,
          sessionId: session.id,
        });
      }
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
