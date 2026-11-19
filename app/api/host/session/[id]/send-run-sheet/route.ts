import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { getViewer } from "@/lib/runSheetAccess";
import { FROM, HQ_EMAIL, page, h1, msg, label, box, row } from "@/lib/stretchy-email";
import { logEmail } from "@/lib/emailLog";
import { previousSessions } from "@/lib/stretchyBadge";

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// POST /api/host/session/[id]/send-run-sheet — "Submit today's check-in".
// The GEM, teacher or HQ sends HQ a snapshot of the day: who was checked in,
// who didn't make it, walk-ins and any notes. The check-ins themselves are
// already saved on each booking; this is the summary, kept in the email log.
// Body (all optional): { walkIns: number, walkInNames: string, note: string }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewer(request, id);
  if ("error" in viewer) return viewer.error;
  const { admin, me, session, role } = viewer;

  const body = await request.json().catch(() => ({}));
  const walkIns = Math.max(0, Math.min(100, Math.floor(Number(body.walkIns) || 0)));
  const walkInNames = String(body.walkInNames ?? "").trim().slice(0, 1000);
  const note = String(body.note ?? "").trim().slice(0, 3000);

  const { data: holds } = await admin
    .from("holds")
    .select("user_id, checked_in_at, quantity, is_comp")
    .eq("session_id", id)
    .in("state", ["active", "confirmed", "charged"]);
  const userIds = (holds ?? []).map((h) => h.user_id).filter(Boolean) as string[];
  const { data: people } = userIds.length
    ? await admin.from("attendees").select("auth_user_id, name").in("auth_user_id", userIds)
    : { data: [] as { auth_user_id: string; name: string }[] };
  const before = await previousSessions(admin, userIds, id);
  const nameOf = (uid: string) => {
    const n = (people ?? []).find((p) => p.auth_user_id === uid)?.name ?? "";
    return n ? (n.includes("@") ? n.split("@")[0] : n) : "Stretchy mate";
  };

  const places = (h: { quantity: number | null }) => h.quantity ?? 1;
  const label3 = (h: { user_id: string; quantity: number | null; is_comp: boolean | null }) =>
    `${esc(nameOf(h.user_id))}${places(h) > 1 ? ` (+${places(h) - 1})` : ""}${h.is_comp ? " · on us" : ""}${(before.get(h.user_id) ?? 0) === 0 ? " · first Stretchy" : ""}`;
  const here = (holds ?? []).filter((h) => h.checked_in_at);
  const missing = (holds ?? []).filter((h) => !h.checked_in_at);
  const booked = (holds ?? []).reduce((n, h) => n + places(h), 0);
  const hereCount = here.reduce((n, h) => n + places(h), 0);
  const total = hereCount + walkIns;

  const when = new Date(session.starts_at).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
  const subject = `Check-in: ${session.title}, ${when} · ${total} on the mat`;
  const html = page("cream", (sc) => `
    ${label(sc, "Stretchy HQ · Today's check-in")}
    ${h1(sc, `${total} on the mat. 🧘`)}
    ${msg(sc, `${esc(me.name)} (${role === "hq" ? "HQ" : role === "gem" ? "GEM" : "teacher"}) submitted the check-in for <strong>${esc(session.title)}</strong>, ${esc(when)} at ${esc(session.location_name ?? "")}.`)}
    ${box(sc, `
      ${row(sc, `✅ <strong>Checked in: ${hereCount}</strong> of ${booked} booked`)}
      ${row(sc, `🚶 <strong>Walk-ins: ${walkIns}</strong>${walkInNames ? ` · ${esc(walkInNames)}` : ""}`)}
      ${row(sc, `👋 <strong>Didn't make it: ${booked - hereCount}</strong>`)}
    `)}
    ${here.length ? `${label(sc, "Checked in")}${box(sc, here.map((h) => row(sc, label3(h))).join(""))}` : ""}
    ${missing.length ? `${label(sc, "Didn't make it")}${box(sc, missing.map((h) => row(sc, label3(h))).join(""))}` : ""}
    ${note ? `${label(sc, "Notes from the day")}${box(sc, `<p style="margin:0;white-space:pre-wrap;color:${sc.text};font-size:14px;line-height:1.5;">${esc(note)}</p>`)}` : ""}
    ${walkIns ? msg(sc, "Walk-ins pay after the fact, so follow up on payment with them.") : ""}
  `, { highlight: false });

  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: "Email not configured." }, { status: 500 });
  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({ from: FROM, to: HQ_EMAIL, subject, html });
  // The log keeps the day's numbers for the records, even if the email bounces.
  await logEmail({
    sessionId: id, recipient: HQ_EMAIL, emailType: "checkin_snapshot",
    subject: `${subject} · booked ${booked} · checked in ${hereCount} · walk-ins ${walkIns}`,
    status: error ? "error" : "sent", error: error ? String((error as { message?: string }).message ?? error) : null,
  });
  if (error) return NextResponse.json({ error: "Couldn't send it. Try again in a moment." }, { status: 500 });
  return NextResponse.json({ ok: true, booked, checkedIn: hereCount, walkIns, total });
}
