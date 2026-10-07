import type { SupabaseClient } from "@supabase/supabase-js";

// Teachers/GEMs added straight from HQ get a hosts row with no auth_user_id
// (they haven't logged in yet). The first time someone signs in with that
// email — magic link or Google, so the email is verified — attach the row to
// their login, keeping whatever vetting_status HQ gave it.
// Returns the host row's id, or null if there's nothing to claim.
export async function claimHostByEmail(
  admin: SupabaseClient,
  user: { id: string; email?: string | null }
): Promise<string | null> {
  const email = user.email?.trim();
  if (!email) return null;

  const { data: unclaimed } = await admin
    .from("hosts")
    .select("id")
    .is("auth_user_id", null)
    .ilike("email", email)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!unclaimed) return null;

  const { error } = await admin
    .from("hosts")
    .update({ auth_user_id: user.id })
    .eq("id", unclaimed.id)
    .is("auth_user_id", null);
  return error ? null : unclaimed.id;
}
