import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cleanResearch } from "@/lib/socialResearch";
import { alertResearch } from "@/lib/socialLeadEmails";

// POST /api/social-research — one response to the stretchy.social/research
// survey. Everything is optional, contact details included. Saves the row and
// emails Kimberley (cc Studio Dawn). Spam: a hidden honeypot field and a light
// per-address limit.
// Body: { answers, name?, organisation?, email?, website?, source?, hp? }

const recent = new Map<string, number[]>(); // ip → submit times (per server instance, best-effort)
const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export async function POST(request: NextRequest) {
  const b = await request.json().catch(() => ({}));
  if (typeof b.hp === "string" && b.hp.trim()) return NextResponse.json({ ok: true });

  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const now = Date.now();
  const times = (recent.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (times.length >= 10) return NextResponse.json({ error: "Too many tries. Please try again later." }, { status: 429 });
  recent.set(ip, [...times, now]);

  const answers = cleanResearch(b.answers);
  const email = text(b.email, 200);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return NextResponse.json({ error: "That email doesn’t look quite right. Fix it, or leave it blank to stay anonymous." }, { status: 400 });
  }
  const row = {
    name: text(b.name, 120),
    organisation: text(b.organisation, 160),
    email: email?.toLowerCase() ?? null,
    website: text(b.website, 300),
    source: text(b.source, 60),
    answers,
  };
  if (Object.keys(answers).length === 0 && !row.name && !row.email) {
    return NextResponse.json({ error: "Answer at least one question before you submit." }, { status: 400 });
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await admin.from("social_research").insert(row).select("*").single();
  if (error || !data) {
    console.error("social_research insert error:", error);
    return NextResponse.json({ error: "Couldn’t send that just now. Please try again, or email kimberley@stretchyyoga.co.nz." }, { status: 500 });
  }
  await alertResearch(data).catch(() => {});
  return NextResponse.json({ ok: true });
}
