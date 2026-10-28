import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SYDNEY_AREAS, TIMES, OTHER_CITIES, referralGroup } from "@/lib/australia";
import { sendAuWaitlistEmails } from "@/lib/australiaEmails";
import { syncMarketingContact } from "@/lib/resendAudience";

// POST /api/australia/waitlist — a Stretchy Australia (Sydney) waitlist sign-up
// from /australia. Saves it, emails the person and HQ, and (if they ticked for
// news) adds them to the Australia audience for newsletters. Signing up again
// with the same email updates their answers. Spam: honeypot + light limit.

const recent = new Map<string, number[]>();
const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const pick = (v: unknown, allowed: string[]) => (Array.isArray(v) ? Array.from(new Set(v.filter((x): x is string => typeof x === "string" && allowed.includes(x)))) : []);

export async function POST(request: NextRequest) {
  const b = await request.json().catch(() => ({}));
  if (typeof b.hp === "string" && b.hp.trim()) return NextResponse.json({ ok: true });

  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const now = Date.now();
  const times = (recent.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (times.length >= 10) return NextResponse.json({ error: "Too many tries. Please try again later." }, { status: 429 });
  recent.set(ip, [...times, now]);

  const name = text(b.name, 120);
  const email = text(b.email, 200)?.toLowerCase() ?? null;
  if (!name) return NextResponse.json({ error: "Add your name." }, { status: 400 });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ error: "That email doesn’t look quite right." }, { status: 400 });

  const heard = text(b.heard_from, 200);
  const row = {
    name,
    email,
    sydney_areas: pick(b.sydney_areas, SYDNEY_AREAS),
    sydney_other: text(b.sydney_other, 200),
    times: pick(b.times, TIMES),
    other_cities: pick(b.other_cities, OTHER_CITIES),
    other_city_note: text(b.other_city_note, 200),
    is_teacher: b.is_teacher === true,
    is_gem: b.is_gem === true,
    team_tip: text(b.team_tip, 500),
    venue_tip: text(b.venue_tip, 500),
    heard_from: heard,
    heard_group: referralGroup(heard),
    opt_in: b.opt_in === true,
    // Vercel tells us the visitor's state (NSW, VIC…); never stored with more detail.
    state: request.headers.get("x-vercel-ip-country") === "AU" ? request.headers.get("x-vercel-ip-country-region") : null,
    source: text(b.source, 60),
  };

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: existing } = await admin.from("au_waitlist").select("id").ilike("email", email).maybeSingle();
  const { error } = existing
    ? await admin.from("au_waitlist").update(row).eq("id", existing.id)
    : await admin.from("au_waitlist").insert(row);
  if (error) {
    console.error("au_waitlist save error:", error);
    return NextResponse.json({ error: "Couldn’t save that just now. Please try again, or email kimberley@stretchyyoga.co.nz." }, { status: 500 });
  }

  await Promise.allSettled([
    sendAuWaitlistEmails(row),
    row.opt_in ? syncMarketingContact({ email, firstName: name, subscribed: true, audienceId: process.env.RESEND_AUDIENCE_ID_AU ?? null }) : Promise.resolve(),
  ]);
  return NextResponse.json({ ok: true });
}
