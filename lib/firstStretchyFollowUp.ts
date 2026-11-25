import type { SupabaseClient } from "@supabase/supabase-js";
import { sendAttendeeEmail } from "@/lib/stretchy-email";
import { calculatePrice } from "@/lib/pricing";
import { headcountForPrice } from "@/lib/authoriseAtConfirm";

// ─────────────────────────────────────────────────────────────────────────────
// "How was your first Stretchy?" — one email, two days after someone's FIRST
// session: how many came and how far the price dropped, then rate it, same
// time next week, suggest a Stretchy, and share. Replies go to Kimberley.
//
//   • Only ever once per person (checked against the email log).
//   • Only first-timers: this was the only session they've been charged for.
//   • If the GEM checked people in, only people who were checked in get it —
//     nobody who missed it is asked how it was.
//   • Sent in the daytime (9am–7pm Auckland), never at 6am two days on.
// Run by the session-check job; it finds nothing to do on most runs.
// ─────────────────────────────────────────────────────────────────────────────

export const FOLLOW_UP_AFTER_HOURS = 48;
export const FOLLOW_UP_WINDOW_DAYS = 7; // if it couldn't go out in time, stop trying after a week

const aucklandHour = (d: Date) =>
  Number(new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", hourCycle: "h23" }).format(d));

/** Is a session that started at `startsAt` due its follow-up at `now`? */
export function followUpDue(startsAt: string | Date, now: Date): boolean {
  const hoursSince = (now.getTime() - new Date(startsAt).getTime()) / 3_600_000;
  if (hoursSince < FOLLOW_UP_AFTER_HOURS || hoursSince > FOLLOW_UP_WINDOW_DAYS * 24) return false;
  const h = aucklandHour(now);
  return h >= 9 && h < 19;
}

export async function sendFirstStretchyFollowUps(admin: SupabaseClient, now: Date = new Date()): Promise<number> {
  const ago = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();
  const { data: sessions } = await admin
    .from("sessions")
    .select("id, title, starts_at, cost_base, revenue_target, min_attendees, max_attendees, confirmed_headcount")
    .eq("state", "locked")
    .gte("starts_at", ago(FOLLOW_UP_WINDOW_DAYS * 24))
    .lte("starts_at", ago(FOLLOW_UP_AFTER_HOURS));

  let sent = 0;
  for (const s of sessions ?? []) {
    if (!followUpDue(s.starts_at, now)) continue;
    try {
      const { data: holds } = await admin.from("holds").select("user_id, checked_in_at, quantity").eq("session_id", s.id).eq("state", "charged");
      const rows = (holds ?? []).filter((h) => h.user_id);
      // "22 of you came, $22.82 → $14.52 each": the places charged, the price
      // at the minimum, and the final price everyone paid.
      const headcount = (holds ?? []).reduce((n, h) => n + (h.quantity ?? 1), 0);
      const finalPrice = calculatePrice(s.cost_base, s.revenue_target, headcountForPrice(headcount, s.min_attendees, s.confirmed_headcount));
      // "Same time next week?": the next session in the same series.
      const { data: next } = await admin
        .from("sessions")
        .select("id")
        .eq("title", s.title)
        .in("state", ["open", "confirmed"])
        .eq("is_draft", false)
        .gt("starts_at", now.toISOString())
        .order("starts_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      const anyCheckIns = rows.some((h) => h.checked_in_at);
      const came = anyCheckIns ? rows.filter((h) => h.checked_in_at) : rows;

      for (const h of came) {
        // First-timers only: this is the one session they've been charged for.
        const { count } = await admin.from("holds").select("id", { count: "exact", head: true }).eq("user_id", h.user_id).eq("state", "charged");
        if ((count ?? 0) !== 1) continue;

        const { data: a } = await admin.from("attendees").select("name, email").eq("auth_user_id", h.user_id).maybeSingle();
        if (!a?.email) continue;
        const { data: already } = await admin.from("email_log").select("id").eq("email_type", "first_stretchy_followup").eq("recipient", a.email).limit(1);
        if (already && already.length > 0) continue;

        const res = await sendAttendeeEmail("first_stretchy_followup", {
          to: a.email,
          name: a.name && !a.name.includes("@") ? a.name.split(" ")[0] : "there",
          sessionTitle: s.title,
          date: "",
          sessionId: s.id,
          attendeeCount: headcount,
          unitPriceCents: Math.round(finalPrice * 100),
          costBase: s.cost_base,
          revenueTarget: s.revenue_target,
          minAttendees: s.min_attendees,
          maxAttendees: s.max_attendees,
          nextSessionId: next?.id ?? undefined,
        });
        if (!res.error) sent++;
      }
    } catch (e) {
      console.error(`First-Stretchy follow-up errored for session ${s.id}:`, e);
    }
  }
  return sent;
}
