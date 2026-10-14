import type { SupabaseClient } from "@supabase/supabase-js";

// "Moving with care" notes — what someone has told us about an injury,
// pregnancy, surgery, or anything else their teacher should know. Sensitive:
// only that session's teacher and GEM, and Stretchy HQ, ever see them.
//
// Read on its own and tolerantly: if the columns aren't in the database yet,
// this is simply "no notes" — it must never stop names or check-in loading.
export type CareNote = { note: string; duration: string | null };

export async function careNotesFor(admin: SupabaseClient, userIds: string[]): Promise<Map<string, CareNote>> {
  const out = new Map<string, CareNote>();
  if (userIds.length === 0) return out;
  const { data, error } = await admin
    .from("attendees")
    .select("auth_user_id, moving_with_care_note, moving_with_care_duration, moving_with_care_ends_at")
    .in("auth_user_id", userIds);
  if (error) return out;
  const now = Date.now();
  for (const a of data ?? []) {
    const note = (a.moving_with_care_note ?? "").trim();
    if (!note) continue;
    // A note with an end date stops showing once that date has passed.
    if (a.moving_with_care_ends_at && new Date(a.moving_with_care_ends_at).getTime() < now) continue;
    out.set(a.auth_user_id, { note, duration: a.moving_with_care_duration ?? null });
  }
  return out;
}
