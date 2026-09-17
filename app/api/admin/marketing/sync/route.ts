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
  const { data: people, error } = await admin
    .from("attendees")
    .select("email, name, marketing_consent")
    .not("email", "is", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let synced = 0;
  let failed = 0;
  for (const p of people ?? []) {
    if (!p.email) continue;
    const r = await syncMarketingContact({ email: p.email, firstName: p.name, subscribed: !!p.marketing_consent });
    if (r.ok) synced++;
    else failed++;
  }

  const optedIn = (people ?? []).filter((p) => p.marketing_consent).length;
  return NextResponse.json({ ok: true, total: people?.length ?? 0, optedIn, synced, failed });
}
