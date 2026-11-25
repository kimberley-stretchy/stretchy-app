import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Invite a mate (SOCIAL_BOOKING_BRIEF.md 0d). Everyone gets their own link,
// stretchyyoga.co.nz/i/{code}. Opening it saves the code in a cookie; when
// that person holds their FIRST place, we note who invited them. Only ever
// shown as a count to the inviter, never names.

export const INVITE_COOKIE = "stretchy_invite";
export const INVITE_COOKIE_DAYS = 30;

// No 0/o/1/l/i, so codes are easy to read out loud.
const CHARS = "abcdefghjkmnpqrstuvwxyz23456789";

/** "Kimberley Torrie" → "kimberley" + 4 characters. Letters only, max 12. */
export function makeInviteCode(name: string | null | undefined, email: string | null | undefined): string {
  const first = (name && !name.includes("@") ? name : (email ?? "").split("@")[0]).trim().split(/\s+/)[0] ?? "";
  const letters = first.normalize("NFD").replace(/[^a-zA-Z]/g, "").toLowerCase().slice(0, 12) || "mate";
  let tail = "";
  for (let i = 0; i < 4; i++) tail += CHARS[Math.floor(Math.random() * CHARS.length)];
  return `${letters}${tail}`;
}

export function cleanCode(code: string | null | undefined): string | null {
  const c = (code ?? "").trim().toLowerCase();
  return /^[a-z0-9]{5,20}$/.test(c) ? c : null;
}

/**
 * Called after a place is held. If this person came in through someone's
 * invite link and has never held a place before, remember who invited them.
 * Best-effort: never throws, never blocks the booking.
 */
export async function recordInvite(admin: SupabaseClient, authUserId: string): Promise<void> {
  try {
    const code = cleanCode((await cookies()).get(INVITE_COOKIE)?.value);
    if (!code) return;

    const { data: me } = await admin.from("attendees").select("id, invited_by").eq("auth_user_id", authUserId).maybeSingle();
    if (!me || me.invited_by) return;

    // First place only: the hold just made is their only one, ever.
    const { count } = await admin.from("holds").select("id", { count: "exact", head: true }).eq("user_id", authUserId);
    if ((count ?? 0) > 1) return;

    const { data: inviter } = await admin.from("attendees").select("id").ilike("invite_code", code).maybeSingle();
    if (!inviter || inviter.id === me.id) return;

    await admin.from("attendees").update({ invited_by: inviter.id }).eq("id", me.id).is("invited_by", null);
  } catch (err) {
    console.error("recordInvite:", err);
  }
}
