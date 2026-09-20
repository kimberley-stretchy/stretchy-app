import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";
import { Resend } from "resend";
import { buildRemittanceEmail, FROM, REPLY_TO, HQ_EMAIL } from "@/lib/stretchy-email";
import { buildRemittancePdf } from "@/lib/remittancePdf";
import { logEmail } from "@/lib/emailLog";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
}

// POST /api/admin/sessions/[id]/money/remit — send a payout/remittance email to the
// ticked payees (teacher / GEM / venue / supplier / charity). Manual: HQ pays via
// bank transfer; this is the confirmation. Optionally copies HQ. Nothing is sent
// automatically — only the recipients HQ selects here.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  const { id } = await params;
  const admin = getAdmin();
  const body = await request.json().catch(() => ({}));
  const items: { role: string; name: string; email: string; amount: number }[] = Array.isArray(body.items) ? body.items : [];
  const copyHq: boolean = !!body.copyHq;
  const note: string | undefined = typeof body.note === "string" && body.note.trim() ? body.note.trim() : undefined;

  if (items.length === 0) return NextResponse.json({ error: "No recipients selected." }, { status: 400 });
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: "Email not configured." }, { status: 500 });

  const { data: session } = await admin
    .from("sessions")
    .select("title, starts_at, location_name")
    .eq("id", id)
    .single();
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const dateStr =
    new Date(session.starts_at).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "long", day: "numeric", month: "long" }) +
    " at " + new Date(session.starts_at).toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit", hour12: true });

  const resend = new Resend(process.env.RESEND_API_KEY);
  const results: { name: string; email: string; ok: boolean; error?: string }[] = [];

  for (const it of items) {
    const email = (it.email ?? "").trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      results.push({ name: it.name, email, ok: false, error: "No/invalid email" });
      continue;
    }
    const amount = `$${Number(it.amount).toFixed(2)}`;
    const { subject, html } = buildRemittanceEmail({
      payeeName: it.name, role: it.role, amount,
      sessionTitle: session.title, dateStr, venue: session.location_name, note,
    });
    // Attach a branded PDF remittance/statement.
    let attachments: { filename: string; content: Buffer }[] | undefined;
    try {
      const pdf = await buildRemittancePdf({
        payeeName: it.name, role: it.role, amount: Number(it.amount),
        sessionTitle: session.title, dateStr, venue: session.location_name, note,
        reference: `${it.role.slice(0, 3).toUpperCase()}-${id.slice(0, 8)}`,
      });
      const safe = `${it.name}-${session.title}`.replace(/[^a-z0-9]+/gi, "-").toLowerCase().replace(/^-|-$/g, "");
      attachments = [{ filename: `stretchy-remittance-${safe}.pdf`, content: Buffer.from(pdf) }];
    } catch (e) {
      console.error("Remittance PDF build failed:", e);
    }
    const { error } = await resend.emails.send({
      from: FROM, to: email, reply_to: REPLY_TO,
      ...(copyHq ? { bcc: HQ_EMAIL } : {}),
      subject, html,
      ...(attachments ? { attachments } : {}),
    });
    await logEmail({
      sessionId: id, recipient: email,
      emailType: `remittance_${it.role.toLowerCase().replace(/[^a-z]/g, "")}`,
      subject, status: error ? "error" : "sent",
      error: error ? (error as { message?: string }).message ?? String(error) : null,
    });
    results.push({ name: it.name, email, ok: !error, error: error ? (error as { message?: string }).message ?? "send failed" : undefined });
  }

  // HQ summary copy of what just went out.
  if (copyHq) {
    const sent = results.filter((r) => r.ok);
    const total = items.filter((_, i) => results[i]?.ok).reduce((s, it) => s + Number(it.amount || 0), 0);
    const { subject, html } = buildRemittanceEmail({
      payeeName: `${sent.length} payee${sent.length === 1 ? "" : "s"}`, role: "Summary",
      amount: `$${total.toFixed(2)}`, sessionTitle: session.title, dateStr, venue: session.location_name,
      note: `Remittances sent to: ${sent.map((r) => r.name).join(", ") || "—"}.`, forHQ: true,
    });
    await resend.emails.send({ from: FROM, to: HQ_EMAIL, reply_to: REPLY_TO, subject, html }).catch(() => {});
  }

  const okCount = results.filter((r) => r.ok).length;
  return NextResponse.json({ ok: true, sent: okCount, failed: results.length - okCount, results });
}
