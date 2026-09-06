import type { SupabaseClient } from "@supabase/supabase-js";

export type MfaStatus = "ok" | "enroll_required" | "verify_required";

// Supabase resets assurance to aal1 every new session even for an already-
// enrolled factor, so this has to be checked per-request, not once at
// enrollment time. "verify_required" means a factor exists but this session
// hasn't completed the challenge yet; "enroll_required" means no factor exists.
export async function checkMfaStatus(supabase: SupabaseClient): Promise<MfaStatus> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return "enroll_required";
  if (data.currentLevel === "aal2") return "ok";
  return data.nextLevel === "aal2" ? "verify_required" : "enroll_required";
}
