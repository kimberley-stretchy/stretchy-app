import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";
import { syncMarketingContact, marketingConfigured } from "@/lib/resendAudience";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
}

// POST /api/admin/marketing/sync — one-off backfill: push every opted-in attendee
// into the Resend marketing Audience (and mark the rest unsubscribed there). Run
// this once after creating the Audience + setting RESEND_AUDIENCE_ID, and any time
// you want to reconcile. Idempotent.
export async function POST(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  if (!marketingConfigured()) {
    return NextResponse.json(
      { error: "Marketing Audience not configured. Create an Audience in Resend and set RESEND_AUDIENCE_ID in Vercel, then retry." },
      { status: 400 }
    );
  }

  const admin = getAdmin();

  // Only push the OPTED-IN. We never push not-consented people as "unsubscribed",
  // because that would clobber contacts imported straight into Resend (e.g. a CRM
  // import) that are legitimately subscribed. Explicit opt-outs are handled by the
  // per-user toggle, not this reconcile.
  const [{ data: accounts, error: e1 }, { data: signups, error: e2 }] = await Promise.all([
    admin.from("attendees").select("email, name, marketing_consent").eq("marketing_consent", true).not("email", "is", null),
    admin.from("newsletter_signups").select("email"),
  ]);
  if (e1 || e2) return NextResponse.json({ error: (e1 ?? e2)!.message }, { status: 500 });

  // Merge opted-in accounts + all newsletter signups (a signup IS an opt-in),
  // de-duped by email.
  const byEmail = new Map<string, { email: string; name: string | null }>();
  for (const a of accounts ?? []) if (a.email) byEmail.set(a.email.toLowerCase(), { email: a.email, name: a.name });
  for (const s of signups ?? []) if (s.email && !byEmail.has(s.email.toLowerCase())) byEmail.set(s.email.toLowerCase(), { email: s.email, name: null });

  const optedIn = Array.from(byEmail.values());
  let synced = 0;
  let failed = 0;
  for (const p of optedIn) {
    const r = await syncMarketingContact({ email: p.email, firstName: p.name, subscribed: true });
    if (r.ok) synced++;
    else failed++;
  }

  return NextResponse.json({ ok: true, total: optedIn.length, optedIn: optedIn.length, synced, failed });
}
