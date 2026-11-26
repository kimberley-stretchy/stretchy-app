import type { SupabaseClient } from "@supabase/supabase-js";
import { sendAttendeeBatch } from "@/lib/stretchy-email";
import { sendPushToUsers } from "@/lib/push-server";
import { finalCharge } from "@/lib/sessionTimes";

// ─────────────────────────────────────────────────────────────────────────────
// Buddy me up (SOCIAL_BOOKING_BRIEF.md section 6).
//
// Anyone holding a place can switch it on, with an optional Say hello line.
// Once a session is going ahead (36 hrs out) we match people up: pairs, and a
// group of three when the numbers are uneven. People who came on their own are
// matched with each other first. Anyone who switches it on later is matched on
// the next 15-minute run, until joining closes 30 mins before.
//
// Only first names and Say hello lines are ever shared. Everything is deleted
// one week after the session (clearFinishedBuddies), or when it's called off.
// ─────────────────────────────────────────────────────────────────────────────

import { HELLO_MAX, NO_CONTACT_DETAILS } from "@/lib/buddyWords";
export { HELLO_MAX, HELLO_PROMPTS, NO_CONTACT_DETAILS } from "@/lib/buddyWords";

/**
 * Tidy a Say hello line. Returns the cleaned line (null if empty), or an error
 * when it looks like it contains contact details: a phone number, an email,
 * a web link or an @handle. Those are swapped in person, never through us.
 */
export function cleanHello(raw: unknown): { hello: string | null } | { error: string } {
  if (raw == null) return { hello: null };
  if (typeof raw !== "string") return { error: "That Say hello line didn't come through. Try again." };
  const hello = raw.replace(/\s+/g, " ").trim();
  if (!hello) return { hello: null };
  if (hello.length > HELLO_MAX) return { error: `Keep it to ${HELLO_MAX} characters.` };
  const digits = hello.replace(/[\s\-().+]/g, "").match(/\d{6,}/);
  const looksLikeContact =
    !!digits ||
    /@\w/.test(hello) ||
    /https?:\/\/|www\.|\.(com|co|nz|net|org|io|me)\b/i.test(hello) ||
    /\b(insta|instagram|ig|snap|snapchat|tiktok|whatsapp|facebook|fb)\s*[:@]/i.test(hello);
  if (looksLikeContact) return { error: NO_CONTACT_DETAILS };
  return { hello };
}

type Person = { userId: string; solo: boolean };

/**
 * Split people into buddy groups: pairs, with one group of three when the
 * numbers are uneven. People on their own are matched with each other first.
 * One person on their own makes no group. Pure, so it can be tested.
 */
export function groupBuddies(people: Person[], shuffle: <T>(a: T[]) => T[] = shuffled): string[][] {
  if (people.length < 2) return [];
  const ordered = [...shuffle(people.filter((p) => p.solo)), ...shuffle(people.filter((p) => !p.solo))].map((p) => p.userId);
  const groups: string[][] = [];
  for (let i = 0; i + 1 < ordered.length; i += 2) groups.push([ordered[i], ordered[i + 1]]);
  if (ordered.length % 2 === 1) groups[groups.length - 1].push(ordered[ordered.length - 1]);
  return groups;
}

function shuffled<T>(a: T[]): T[] {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Buddy info is kept for one week after the session. */
export const BUDDY_KEEP_MS = 7 * 24 * 60 * 60 * 1000;

const firstName = (name: string | null | undefined) => (name ?? "").trim().split(/\s+/)[0] || "A Stretchy-goer";

type MatchSession = { id: string; title: string; starts_at: string; state: string };

/**
 * Match everyone who has switched Buddy me up on and isn't matched yet, then
 * email (and push) each pair or group. Safe to run again and again: people
 * already matched are left alone, except that one late person on their own
 * joins the smallest existing group (that group gets a fresh intro).
 *
 * Only for sessions going ahead, and only until joining closes.
 */
export async function runBuddyMatching(admin: SupabaseClient, session: MatchSession, now = new Date()): Promise<{ matched: number; solo: number }> {
  if (session.state !== "confirmed") return { matched: 0, solo: 0 };
  if (now >= finalCharge(session.starts_at)) return { matched: 0, solo: 0 };

  const [{ data: optins }, { data: matches }, { data: holds }] = await Promise.all([
    admin.from("buddy_optins").select("user_id, hello, solo_notified_at").eq("session_id", session.id),
    admin.from("buddy_matches").select("user_id, group_no").eq("session_id", session.id),
    admin.from("holds").select("user_id, quantity").eq("session_id", session.id).eq("state", "active"),
  ]);
  await admin.from("sessions").update({ buddy_matched_at: now.toISOString() }).eq("id", session.id).is("buddy_matched_at", null);

  // Only people still holding a place.
  const spots = new Map<string, number>();
  for (const h of holds ?? []) if (h.user_id) spots.set(h.user_id, (spots.get(h.user_id) ?? 0) + (h.quantity ?? 1));
  const live = (optins ?? []).filter((o) => spots.has(o.user_id));
  const matchedIds = new Set((matches ?? []).map((m) => m.user_id));
  const waiting = live.filter((o) => !matchedIds.has(o.user_id));
  if (waiting.length === 0) return { matched: 0, solo: 0 };

  const groupsByNo = new Map<number, string[]>();
  for (const m of matches ?? []) groupsByNo.set(m.group_no, [...(groupsByNo.get(m.group_no) ?? []), m.user_id]);
  let nextNo = Math.max(0, ...Array.from(groupsByNo.keys())) + 1;

  const changed: { no: number; members: string[]; newMembers: string[] }[] = [];
  const newRows: { session_id: string; user_id: string; group_no: number }[] = [];

  if (waiting.length === 1) {
    const one = waiting[0].user_id;
    // Join the smallest group that has room (max 4), else stay on their own.
    const smallest = Array.from(groupsByNo.entries()).filter(([, m]) => m.length < 4).sort((a, b) => a[1].length - b[1].length)[0];
    if (smallest) {
      newRows.push({ session_id: session.id, user_id: one, group_no: smallest[0] });
      changed.push({ no: smallest[0], members: [...smallest[1], one], newMembers: [one] });
    } else if (!waiting[0].solo_notified_at) {
      const [a] = await getPeople(admin, [one]);
      if (a?.email) {
        await sendAttendeeBatch([{ type: "buddy_solo", payload: { to: a.email, name: firstName(a.name), sessionTitle: session.title, date: "", sessionId: session.id } }]);
        await admin.from("buddy_optins").update({ solo_notified_at: now.toISOString() }).eq("session_id", session.id).eq("user_id", one);
        return { matched: 0, solo: 1 };
      }
    }
  } else {
    for (const g of groupBuddies(waiting.map((o) => ({ userId: o.user_id, solo: (spots.get(o.user_id) ?? 1) === 1 })))) {
      const no = nextNo++;
      for (const u of g) newRows.push({ session_id: session.id, user_id: u, group_no: no });
      changed.push({ no, members: g, newMembers: g });
    }
  }
  if (newRows.length === 0) return { matched: 0, solo: 0 };

  // Save first; ignoreDuplicates means two overlapping runs can't double-match anyone.
  const { error } = await admin.from("buddy_matches").upsert(newRows, { onConflict: "session_id,user_id", ignoreDuplicates: true });
  if (error) throw error;

  // Everyone in a new or grown group hears who their buddies are.
  const everyone = Array.from(new Set(changed.flatMap((c) => c.members)));
  const people = new Map((await getPeople(admin, everyone)).map((a) => [a.auth_user_id, a]));
  const helloOf = new Map(live.map((o) => [o.user_id, o.hello ?? undefined]));
  const items = [];
  for (const c of changed) {
    for (const u of c.members) {
      const me = people.get(u);
      if (!me?.email) continue;
      const buddies = c.members.filter((x) => x !== u).map((x) => ({ name: firstName(people.get(x)?.name), hello: helloOf.get(x) }));
      items.push({ type: "buddy_intro" as const, payload: { to: me.email, name: firstName(me.name), sessionTitle: session.title, date: "", sessionId: session.id, buddies } });
    }
  }
  await sendAttendeeBatch(items);
  await sendPushToUsers(everyone, {
    title: "Meet your Stretchy Buddy 👋",
    body: `${session.title}: we've matched you up. Check your email to see who.`,
    url: `/hold/${session.id}`,
  }).catch(console.error);

  return { matched: newRows.length, solo: 0 };
}

async function getPeople(admin: SupabaseClient, userIds: string[]) {
  if (userIds.length === 0) return [] as { auth_user_id: string; name: string | null; email: string | null }[];
  const { data } = await admin.from("attendees").select("auth_user_id, name, email").in("auth_user_id", userIds);
  return (data ?? []) as { auth_user_id: string; name: string | null; email: string | null }[];
}

/** What someone sees on their own booking: who they're matched with, if anyone. */
export async function myBuddies(admin: SupabaseClient, sessionId: string, userId: string): Promise<{ name: string; hello?: string }[]> {
  const { data: mine } = await admin.from("buddy_matches").select("group_no").eq("session_id", sessionId).eq("user_id", userId).maybeSingle();
  if (!mine) return [];
  const { data: group } = await admin.from("buddy_matches").select("user_id").eq("session_id", sessionId).eq("group_no", mine.group_no);
  const others = (group ?? []).map((g) => g.user_id).filter((u) => u !== userId);
  if (others.length === 0) return [];
  const [people, { data: hellos }] = await Promise.all([
    getPeople(admin, others),
    admin.from("buddy_optins").select("user_id, hello").eq("session_id", sessionId).in("user_id", others),
  ]);
  const helloOf = new Map((hellos ?? []).map((h) => [h.user_id, h.hello ?? undefined]));
  return others.map((u) => ({ name: firstName(people.find((p) => p.auth_user_id === u)?.name), hello: helloOf.get(u) }));
}

/** Delete every buddy opt-in and match one week after the session, or once it's called off. */
export async function clearFinishedBuddies(admin: SupabaseClient, now = new Date()): Promise<number> {
  const { data: rows } = await admin.from("buddy_optins").select("session_id");
  const { data: mrows } = await admin.from("buddy_matches").select("session_id");
  const ids = Array.from(new Set([...(rows ?? []), ...(mrows ?? [])].map((r) => r.session_id)));
  if (ids.length === 0) return 0;
  const { data: sessions } = await admin.from("sessions").select("id, starts_at, duration_mins, state").in("id", ids);
  // Kept for one week after the session starts, then deleted (Kimberley, 26 Nov 2026).
  const done = (sessions ?? [])
    .filter((s) => s.state === "cancelled" || new Date(s.starts_at).getTime() + BUDDY_KEEP_MS < now.getTime())
    .map((s) => s.id);
  // A session that no longer exists has already taken its rows with it (on delete cascade).
  if (done.length === 0) return 0;
  await admin.from("buddy_matches").delete().in("session_id", done);
  await admin.from("buddy_optins").delete().in("session_id", done);
  return done.length;
}
