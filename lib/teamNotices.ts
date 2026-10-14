import type { SupabaseClient } from "@supabase/supabase-js";

// Team notices from Stretchy HQ: short messages for every teacher and GEM.
// Read tolerantly — before the table exists this is simply "no notices".
export type TeamNotice = { id: string; message: string; author_name: string | null; created_at: string; expires_at: string | null };

/** Notices still showing (not past their "show until" date), newest first. */
export async function liveTeamNotices(admin: SupabaseClient, now: Date = new Date()): Promise<TeamNotice[]> {
  const { data, error } = await admin
    .from("team_notices")
    .select("id, message, author_name, created_at, expires_at")
    .or(`expires_at.is.null,expires_at.gt.${now.toISOString()}`)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) return [];
  return (data ?? []) as TeamNotice[];
}
