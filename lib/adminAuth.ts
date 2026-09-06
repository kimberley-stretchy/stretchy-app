import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { checkMfaStatus } from "@/lib/mfaCheck";

// Every /api/admin/* route must call this first and bail out on `error`.
// Mirrors the two checks HQShell enforces client-side (role:admin + the
// @stretchyyoga.co.nz domain) — the UI gate alone does nothing to protect
// the API route itself, which anyone can call directly.
export async function requireAdmin(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  let { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      user = data.user;
    }
  }

  if (!user) {
    return { error: NextResponse.json({ error: "Not logged in" }, { status: 401 }) } as const;
  }

  const role = user.user_metadata?.role;
  const email = user.email ?? "";
  if (role !== "admin" || !email.toLowerCase().endsWith("@stretchyyoga.co.nz")) {
    return { error: NextResponse.json({ error: "Not authorised" }, { status: 403 }) } as const;
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

  return { user } as const;
}
