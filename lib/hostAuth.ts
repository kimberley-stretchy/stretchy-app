import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkMfaStatus } from "@/lib/mfaCheck";

// Every /api/host/* route that touches attendee-facing or session-changing
// data must call this first. Teacher/GEM is NOT user_metadata.role — it's a
// self-declared `roles` array on the `hosts` table, gated by admin-approved
// vetting_status. Mirrors requireAdmin() in lib/adminAuth.ts, plus the MFA gate.
// Not used by onboarding (self-service profile creation happens before
// approval, so it can't require an approved vetting_status).
export async function requireHost(request?: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  let { data: { user } } = await supabase.auth.getUser();
  if (!user && request) {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      user = data.user;
    }
  }

  if (!user) {
    return { error: NextResponse.json({ error: "Not logged in", code: "not_logged_in" }, { status: 401 }) } as const;
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: host } = await admin
    .from("hosts")
    .select("id, name, roles, vetting_status")
    .eq("auth_user_id", user.id)
    .single();

  if (!host) {
    return { error: NextResponse.json({ error: "No host profile found", code: "no_host_profile" }, { status: 400 }) } as const;
  }
  if (host.vetting_status !== "approved") {
    return { error: NextResponse.json({ error: "Your application isn't approved yet", code: "not_vetted" }, { status: 403 }) } as const;
  }

  const mfaStatus = await checkMfaStatus(supabase);
  if (mfaStatus !== "ok") {
    return {
      error: NextResponse.json(
        { error: "Two-factor verification required", code: mfaStatus === "verify_required" ? "mfa_required" : "mfa_enroll_required" },
        { status: 403 }
      ),
    } as const;
  }

  return { user, host } as const;
}
