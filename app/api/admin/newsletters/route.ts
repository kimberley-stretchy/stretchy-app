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
  | { type: "divider"; line?: "ink" | "cream" }
  | { type: "button"; label?: string; url?: string }
  | { type: "sessions"; sessionIds?: string[] };
import { sendBroadcast, sendTestNewsletter, getAudienceCount, getAudienceName, listScheduledBroadcasts, cancelBroadcast } from "@/lib/resendBroadcast";
import { nzLocalToISO } from "@/lib/nzTime";
import { marketingConfigured } from "@/lib/resendAudience";
import { notifyHQ } from "@/lib/notifyLifecycle";

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
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  const [sessions, count, audienceName, scheduled] = await Promise.all([
    upcomingSessions(admin),
    audienceId ? getAudienceCount(audienceId) : Promise.resolve(null),
    audienceId ? getAudienceName(audienceId) : Promise.resolve(null),
    audienceId ? listScheduledBroadcasts() : Promise.resolve(null),
  ]);
  return NextResponse.json({
    sessions,
    marketingConfigured: marketingConfigured(),
    audienceReady: !!audienceId,
    // Who a send would reach — shown in HQ before pressing send.
    audienceName,
    subscribed: count?.subscribed ?? null,
    // Newsletters queued for later, soonest first.
    scheduled: scheduled ?? [],
  });
}

export async function POST(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;
  const admin = getAdmin();

  const body = await request.json().catch(() => ({}));
  const { mode, subject, previewText, closingButton, scheme, heading, blocks, highlight, testEmail, scheduleDate, scheduleTime } = body as {
    mode: "preview" | "test" | "send" | "schedule";
    subject?: string; previewText?: string; closingButton?: { label?: string; url?: string } | null; scheme?: string; heading?: string; highlight?: boolean;
    blocks?: ClientBlock[]; testEmail?: string;
    scheduleDate?: string; scheduleTime?: string; // NZ wall time, e.g. "2026-10-20", "07:00"
  };

  // Scheduling: resolve NZ date + time to a real instant up front, so a bad
  // or past time is refused before anything is built or sent.
  let scheduledAt: string | undefined;
  if (mode === "schedule") {
    if (!scheduleDate || !/^\d{4}-\d{2}-\d{2}$/.test(scheduleDate) || !scheduleTime || !/^\d{2}:\d{2}$/.test(scheduleTime)) {
      return NextResponse.json({ error: "Pick a date and time to schedule it for." }, { status: 400 });
    }
    scheduledAt = nzLocalToISO(scheduleDate, scheduleTime);
    if (new Date(scheduledAt).getTime() < Date.now() + 5 * 60 * 1000) {
      return NextResponse.json({ error: "Pick a time at least 5 minutes from now." }, { status: 400 });
    }
    // Resend won't hold a broadcast more than 30 days out.
    if (new Date(scheduledAt).getTime() > Date.now() + 30 * 24 * 60 * 60 * 1000) {
      return NextResponse.json({ error: "Resend can only schedule up to 30 days ahead — pick an earlier date." }, { status: 400 });
    }
  }

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
    if (b.type === "divider") return { type: "divider", line: b.line === "cream" ? "cream" : "ink" };
    if (b.type === "button") return { type: "button", label: b.label ?? "", url: b.url ?? "" };
    return { type: "text", text: b.text ?? "" };
  });

  const { subject: subj, html } = buildNewsletter({
    subject: subject ?? "What's on at Stretchy 🌞",
    previewText,
    closingButton: closingButton === null ? null : closingButton ? { label: closingButton.label ?? "", url: closingButton.url ?? "" } : undefined,
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

  // mode === "send" (now) or "schedule" (later) — real broadcast to the Audience.
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!audienceId) {
    return NextResponse.json({ error: "No Audience configured — set RESEND_AUDIENCE_ID in Vercel first." }, { status: 400 });
  }
  const r = await sendBroadcast({ audienceId, subject: subj, html, name: subj, scheduledAt });
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 500 });

  if (scheduledAt) {
    const when = new Date(scheduledAt).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", hour12: true });
    const count = await getAudienceCount(audienceId);
    await notifyHQ({
      subject: `📅 Newsletter scheduled: ${subj}`,
      scheme: "orange",
      kicker: "Stretchy HQ · Newsletter scheduled",
      heading: "It's in the queue 📅",
      rows: [
        `<strong>Subject:</strong> ${subj}`,
        `🕘 Goes out <strong>${when}</strong> (NZT).`,
        count ? `To the subscribed contacts on the list at that time — ${count.subscribed} right now.` : `To the subscribed contacts on the list at that time.`,
        `Changed your mind? Cancel it in HQ → Newsletters → Scheduled.`,
      ],
    }).catch(() => {});
    return NextResponse.json({ ok: true, id: r.id, scheduledAt });
  }

  // Send receipt to HQ — topline of what went out and to how many.
  const count = await getAudienceCount(audienceId);
  const sentAt = new Date().toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
  const audienceLine = count
    ? `Sent to <strong>${count.subscribed}</strong> subscribed contact${count.subscribed === 1 ? "" : "s"}${count.total > count.subscribed ? ` (${count.total} in the Audience total)` : ""}.`
    : `Sent to the marketing Audience.`;
  await notifyHQ({
    subject: `📣 Newsletter sent: ${subj}`,
    scheme: "orange",
    kicker: "Stretchy HQ · Newsletter receipt",
    heading: "Your newsletter is on its way 🎉",
    rows: [
      `<strong>Subject:</strong> ${subj}`,
      audienceLine,
      `🕘 Sent ${sentAt} (NZT).`,
      `Delivery, opens and unsubscribes are tracked in Resend → Broadcasts.`,
    ],
  }).catch(() => {});

  return NextResponse.json({ ok: true, id: r.id, sentTo: count?.subscribed ?? null });
}

// DELETE /api/admin/newsletters?id=… — cancel a scheduled newsletter.
export async function DELETE(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const r = await cancelBroadcast(id);
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.error }, { status: 500 });
}
