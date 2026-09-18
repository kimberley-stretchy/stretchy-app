import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";
import { marketingConfigured } from "@/lib/resendAudience";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
}

// GET /api/admin/customers — the people/accounts list for HQ, with marketing
// opt-in status and how many holds they've placed. Also includes home-page
// newsletter-only signups (no account) so the whole marketing list is visible.
export async function GET(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  const admin = getAdmin();

  const [{ data: attendees }, { data: holds }, { data: signups }] = await Promise.all([
    admin.from("attendees").select("id, auth_user_id, name, email, created_at, marketing_consent, date_of_birth").order("created_at", { ascending: false }),
    admin.from("holds").select("user_id, quantity, state"),
    admin.from("newsletter_signups").select("email, created_at"),
  ]);

  // Spots-ever-held per account (any state).
  const spotsByUser = new Map<string, number>();
  for (const h of holds ?? []) {
    if (!h.user_id) continue;
    spotsByUser.set(h.user_id, (spotsByUser.get(h.user_id) ?? 0) + (h.quantity ?? 1));
  }

  const accountEmails = new Set((attendees ?? []).map((a) => (a.email ?? "").toLowerCase()));
  const customers = (attendees ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    email: a.email,
    createdAt: a.created_at,
    marketingConsent: !!a.marketing_consent,
    spotsHeld: a.auth_user_id ? spotsByUser.get(a.auth_user_id) ?? 0 : 0,
    hasAccount: true,
  }));

  // Newsletter-only signups (marketing list, but never made an account).
  const newsletterOnly = (signups ?? [])
    .filter((s) => s.email && !accountEmails.has(s.email.toLowerCase()))
    .map((s) => ({
      id: `nl:${s.email}`,
      name: null as string | null,
      email: s.email,
      createdAt: s.created_at,
      marketingConsent: true,
      spotsHeld: 0,
      hasAccount: false,
    }));

  const all = [...customers, ...newsletterOnly].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return NextResponse.json({
    customers: all,
    counts: {
      total: all.length,
      accounts: customers.length,
      optedIn: all.filter((c) => c.marketingConsent).length,
      newsletterOnly: newsletterOnly.length,
    },
    marketingConfigured: marketingConfigured(),
  });
}
