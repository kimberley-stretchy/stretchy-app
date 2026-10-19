import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { COUNTRIES, GROUPS, LEAD_TYPES, SIZES, STARTS, BRINGS, validateStep1, type LeadType } from "@/lib/socialLeads";
import { alertHQ, confirmToPerson } from "@/lib/socialLeadEmails";

// POST /api/social-lead — step 1 of a stretchy.social form. Saves the row,
// emails Kimberley and the person, and returns the row id so the optional
// step 2 answers can be added to the same row (PATCH /api/social-lead/:id).
// Spam: a hidden honeypot field, one submission per email per type every two
// minutes, and a light per-address limit.

const recent = new Map<string, number[]>(); // ip → submit times (per server instance, best-effort)
const pick = (v: unknown, allowed: string[]) => (typeof v === "string" && allowed.includes(v) ? v : null);
const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export async function POST(request: NextRequest) {
  const b = await request.json().catch(() => ({}));
  // A filled honeypot is a bot: pretend it worked, save nothing.
  if (typeof b.hp === "string" && b.hp.trim()) return NextResponse.json({ ok: true, id: null });

  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const now = Date.now();
  const times = (recent.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (times.length >= 10) return NextResponse.json({ error: "Too many tries. Please try again later." }, { status: 429 });
  recent.set(ip, [...times, now]);

  const type = (LEAD_TYPES as string[]).includes(b.type) ? (b.type as LeadType) : null;
  if (!type) return NextResponse.json({ error: "Unknown form." }, { status: 400 });
  const errors = validateStep1({ name: b.name ?? "", email: b.email ?? "", country: pick(b.country, COUNTRIES) ?? "" });
  if (Object.keys(errors).length) return NextResponse.json({ error: "Please check the form.", errors }, { status: 400 });

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const email = String(b.email).trim().toLowerCase();

  // The same person pressing send twice → the row they already made.
  const { data: dupe } = await admin
    .from("social_leads")
    .select("id")
    .eq("email", email)
    .eq("type", type)
    .gte("created_at", new Date(now - 120_000).toISOString())
    .limit(1);
  if (dupe?.[0]) return NextResponse.json({ ok: true, id: dupe[0].id });

  const { count } = await admin.from("social_leads").select("id", { count: "exact", head: true });
  const row = {
    type,
    name: text(b.name, 120)!,
    email,
    organisation: text(b.org, 160),
    group_type: type === "invest" ? null : pick(b.group, GROUPS),
    region: text(b.region, 120),
    country: pick(b.country, COUNTRIES)!,
    group_size: type === "beta" ? pick(b.size, SIZES) : null,
    beta_start: type === "beta" ? pick(b.start, STARTS) : null,
    brings: type === "talk" && Array.isArray(b.brings) ? b.brings.filter((x: unknown) => typeof x === "string" && BRINGS.includes(x)) : null,
    about: type === "invest" ? text(b.about, 2000) : null,
    message: type === "invest" ? null : text(b.message, 2000),
    opt_in: b.optin === true,
    source: text(b.source, 200) ?? "stretchy.social",
    founding: (count ?? 0) < 50,
  };
  const { data, error } = await admin.from("social_leads").insert(row).select("*").single();
  if (error || !data) {
    console.error("social_leads insert error:", error);
    return NextResponse.json({ error: "Couldn’t send that just now. Please try again, or email kimberley@stretchyyoga.co.nz." }, { status: 500 });
  }

  await Promise.allSettled([alertHQ(data), confirmToPerson(data)]);
  return NextResponse.json({ ok: true, id: data.id });
}
