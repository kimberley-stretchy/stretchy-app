import type { SupabaseClient } from "@supabase/supabase-js";

// The little badge beside someone's name on the run sheet and in HQ:
//   their 1st session  → "1ST STRETCHY"
//   their 2nd          → "2ND STRETCHY"
//   their 5th or more  → "REGULAR"
//   3rd and 4th        → no badge
// Counted from the sessions they've actually been charged for (or gifted) —
// the same test the emails use for "first Stretchy".

/** `previous` = sessions they've been to before this one. */
export function stretchyBadge(previous: number): "1ST STRETCHY" | "2ND STRETCHY" | "REGULAR" | null {
  const nth = previous + 1;
  if (nth === 1) return "1ST STRETCHY";
  if (nth === 2) return "2ND STRETCHY";
  if (nth >= 5) return "REGULAR";
  return null;
}

/** How many OTHER sessions each person has been to. Never throws; unknown = 0. */
export async function previousSessions(admin: SupabaseClient, userIds: string[], thisSessionId: string): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (userIds.length === 0) return out;
  const { data, error } = await admin.from("holds").select("user_id, session_id").in("user_id", userIds).eq("state", "charged").neq("session_id", thisSessionId);
  if (error) return out;
  const seen = new Map<string, Set<string>>();
  for (const h of data ?? []) {
    if (!seen.has(h.user_id)) seen.set(h.user_id, new Set());
    seen.get(h.user_id)!.add(h.session_id);
  }
  seen.forEach((set, uid) => out.set(uid, set.size));
  return out;
}
