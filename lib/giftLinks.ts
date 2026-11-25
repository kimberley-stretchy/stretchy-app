import type { SupabaseClient } from "@supabase/supabase-js";
import { phase, formatDay, formatTime } from "@/lib/sessionTimes";
import { roomLabel } from "@/lib/places";

// Gift links (stretchyyoga.co.nz/gift/{code}): someone (e.g. Daisy, a GEM) passes
// the link to friends; each friend claims ONE free place, on Stretchy, at any
// session up to the link's end date. Claimed places are normal "on us" holds
// (lib/compPlace.ts), so they count in the headcount.

export type GiftLink = { code: string; from_name: string; max_uses: number; expires_at: string };

export type GiftSession = {
  id: string;
  day: string;     // "Fri 27 Nov"
  time: string;    // "6:15am"
  place: string;   // "Herne Bay"
  venue: string | null;
  /** "7 more to go ahead", "Going ahead ✓ · still room to join"… as on the session cards. */
  room: string;
};

export type GiftStatus =
  | { kind: "missing" }
  | { kind: "ended"; gift: GiftLink }
  | { kind: "used"; gift: GiftLink }
  | { kind: "open"; gift: GiftLink; left: number; sessions: GiftSession[] };

export function cleanGiftCode(code: string | null | undefined): string | null {
  const c = (code ?? "").trim().toLowerCase();
  return /^[a-z0-9-]{4,40}$/.test(c) ? c : null;
}

export async function giftStatus(admin: SupabaseClient, rawCode: string): Promise<GiftStatus> {
  const code = cleanGiftCode(rawCode);
  if (!code) return { kind: "missing" };
  const { data: gift } = await admin.from("gift_links").select("code, from_name, max_uses, expires_at").eq("code", code).maybeSingle();
  if (!gift) return { kind: "missing" };
  if (Date.now() > new Date(gift.expires_at).getTime()) return { kind: "ended", gift };

  const { count } = await admin.from("gift_link_uses").select("id", { count: "exact", head: true }).eq("code", code);
  const left = gift.max_uses - (count ?? 0);
  if (left <= 0) return { kind: "used", gift };

  return { kind: "open", gift, left, sessions: await giftSessions(admin, gift.expires_at) };
}

/** Sessions a gift can be used for: open or going ahead, up to the end date, joining still open, room left. */
export async function giftSessions(admin: SupabaseClient, until: string): Promise<GiftSession[]> {
  const { data: sessions } = await admin
    .from("sessions")
    .select("id, title, starts_at, state, location_name, min_attendees, max_attendees")
    .in("state", ["open", "confirmed"])
    .eq("is_draft", false)
    .gt("starts_at", new Date().toISOString())
    .lte("starts_at", until)
    .order("starts_at", { ascending: true });
  const list = (sessions ?? []).filter((s) => phase(s.starts_at, s.state) !== "after2");
  if (!list.length) return [];

  const { data: holds } = await admin.from("holds").select("session_id, quantity").eq("state", "active").in("session_id", list.map((s) => s.id));
  const held: Record<string, number> = {};
  for (const h of holds ?? []) held[h.session_id] = (held[h.session_id] ?? 0) + (h.quantity ?? 1);

  return list
    .filter((s) => (held[s.id] ?? 0) < s.max_attendees)
    .map((s) => ({
      id: s.id,
      day: formatDay(s.starts_at),
      time: formatTime(s.starts_at),
      place: String(s.title).split("|")[0].split(" - ")[0].trim(),
      venue: (s.location_name as string | null)?.trim() || null,
      room: roomLabel(held[s.id] ?? 0, s.min_attendees, s.max_attendees, s.state === "confirmed"),
    }));
}
