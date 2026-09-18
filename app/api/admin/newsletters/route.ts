import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";
import { calculatePrice } from "@/lib/pricing";
import { APP_URL } from "@/lib/stretchy-email";
import { buildNewsletter, NewsletterSession, NLBlock } from "@/lib/newsletterTemplate";

// What the composer sends: a session block carries ids (resolved to live data here).
type ClientBlock =
  | { type: "text"; text?: string }
  | { type: "image"; url?: string; frame?: "black" | "cream" }
  | { type: "divider" }
  | { type: "sessions"; sessionIds?: string[] };
import { sendBroadcast, sendTestNewsletter } from "@/lib/resendBroadcast";
import { marketingConfigured } from "@/lib/resendAudience";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
}

function fmtDate(startsAt: string): string {
  const d = new Date(startsAt);
  return (
    d.toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "long", day: "numeric", month: "long" }) +
    " at " +
    d.toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit", hour12: true })
  );
}

// Live upcoming sessions with headcounts — for the composer's picker + figures.
async function upcomingSessions(admin: ReturnType<typeof getAdmin>): Promise<NewsletterSession[]> {
  const { data: sessions } = await admin
    .from("sessions")
    .select("id, title, starts_at, location_name, min_attendees, cost_base, revenue_target, state")
    .not("is_draft", "is", true)
    .neq("state", "cancelled")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  const rows = sessions ?? [];
  if (rows.length === 0) return [];

  const { data: holds } = await admin
    .from("holds")
    .select("session_id, quantity")
    .in("session_id", rows.map((s) => s.id))
    .eq("state", "active");
  const goingBy = new Map<string, number>();
  for (const h of holds ?? []) goingBy.set(h.session_id, (goingBy.get(h.session_id) ?? 0) + (h.quantity ?? 1));

  return rows.map((s) => {
    const going = goingBy.get(s.id) ?? 0;
    const price = calculatePrice(s.cost_base, s.revenue_target, Math.max(going, s.min_attendees));
    return {
      title: s.title,
      dateStr: fmtDate(s.starts_at),
      venue: s.location_name,
      url: `${APP_URL}/sessions/${s.id}`,
      going,
      min: s.min_attendees,
      price: `$${price.toFixed(2)}`,
      confirmed: s.state === "confirmed" || s.state === "locked" || going >= s.min_attendees,
      // carry the id for selection (not part of NewsletterSession render)
      ...( { id: s.id } as object ),
    } as NewsletterSession & { id: string };
  });
}

export async function GET(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;
  const admin = getAdmin();
  const sessions = await upcomingSessions(admin);
  return NextResponse.json({
    sessions,
    marketingConfigured: marketingConfigured(),
    audienceReady: !!process.env.RESEND_AUDIENCE_ID,
  });
}

export async function POST(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;
  const admin = getAdmin();

  const body = await request.json().catch(() => ({}));
  const { mode, subject, scheme, heading, blocks, highlight, testEmail } = body as {
    mode: "preview" | "test" | "send";
    subject?: string; scheme?: string; heading?: string; highlight?: boolean;
    blocks?: ClientBlock[]; testEmail?: string;
  };

  if (mode !== "preview" && (!subject || !subject.trim())) {
    return NextResponse.json({ error: "A subject is required." }, { status: 400 });
  }

  // Resolve session blocks (which carry sessionIds) into live session data.
  const all = (await upcomingSessions(admin)) as (NewsletterSession & { id: string })[];
  const resolved: NLBlock[] = (blocks ?? []).map((b): NLBlock => {
    if (b.type === "sessions") {
      const sessions = (b.sessionIds ?? []).map((id) => all.find((s) => s.id === id)).filter(Boolean) as NewsletterSession[];
      return { type: "sessions", sessions };
    }
    if (b.type === "image") return { type: "image", url: b.url ?? "", frame: b.frame === "cream" ? "cream" : "black" };
    if (b.type === "divider") return { type: "divider" };
    return { type: "text", text: b.text ?? "" };
  });

  const { subject: subj, html } = buildNewsletter({
    subject: subject ?? "What's on at Stretchy 🌞",
    scheme,
    heading,
    highlight,
    blocks: resolved,
  });

  if (mode === "preview") {
    return NextResponse.json({ ok: true, html });
  }

  if (mode === "test") {
    if (!testEmail) return NextResponse.json({ error: "Enter a test email address." }, { status: 400 });
    const r = await sendTestNewsletter(testEmail, subj, html);
    return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: 500 });
  }

  // mode === "send" — real broadcast to the Audience.
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!audienceId) {
    return NextResponse.json({ error: "No Audience configured — set RESEND_AUDIENCE_ID in Vercel first." }, { status: 400 });
  }
  const r = await sendBroadcast({ audienceId, subject: subj, html, name: subj });
  return r.ok ? NextResponse.json({ ok: true, id: r.id }) : NextResponse.json({ error: r.error }, { status: 500 });
}
