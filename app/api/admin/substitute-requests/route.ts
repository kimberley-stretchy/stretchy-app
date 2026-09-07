import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { requireAdmin } from "@/lib/adminAuth";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/admin/substitute-requests — HQ marks a session as needing cover for a role,
// and broadcasts it by email to every eligible teacher/GEM. First to claim gets it.
export async function POST(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  const { sessionId, role, note } = await request.json();
  if (!sessionId || !["teacher", "gem"].includes(role)) {
    return NextResponse.json({ error: "Missing sessionId or invalid role" }, { status: 400 });
  }

  const admin = getAdmin();

  const { data: session } = await admin
    .from("sessions")
    .select("id, title, movement_type, starts_at, location_name, host_id, gem_host_id")
    .eq("id", sessionId)
    .single();
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const originalHostId = role === "teacher" ? session.host_id : session.gem_host_id;

  const { data: created, error } = await admin
    .from("substitute_requests")
    .insert({ session_id: sessionId, role, original_host_id: originalHostId ?? null, note: note || null })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Find eligible hosts: right role, and for teacher requests, matching practice type.
  const { data: candidates } = await admin.from("hosts").select("id, name, email, roles, practice_types").contains("roles", [role]);
  const eligible = (candidates ?? []).filter((h) => {
    if (h.id === originalHostId) return false;
    if (role !== "teacher") return true;
    const practiceTypes: string[] = h.practice_types ?? [];
    return practiceTypes.length === 0 || practiceTypes.includes(session.movement_type);
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://stretchyyoga.co.nz";
  const startDate = new Date(session.starts_at);
  const dateStr =
    startDate.toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "long", day: "numeric", month: "long" }) +
    " at " + startDate.toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit", hour12: true });
  const roleLabel = role === "teacher" ? "a teacher" : "a Good Energy Manager";
  const claimUrl = `${appUrl}/host/substitute/${created.id}`;

  if (eligible.length > 0 && process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await Promise.allSettled(
      eligible.map((h) =>
        resend.emails.send({
          from: "Stretchy HQ <hello@stretchy.social>",
          to: h.email,
          subject: `Can you cover ${session.title}? — ${roleLabel} needed`,
          text: `Hi ${h.name?.split(" ")[0] ?? "there"},\n\n${session.title} (${dateStr}, ${session.location_name}) needs ${roleLabel} — the original one can't make it.\n\nFirst to say yes gets it: ${claimUrl}\n\nStretchy HQ`,
          html: `
            <div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;background:#F7F0E8;padding:32px;border-radius:16px;">
              <p style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:800;letter-spacing:.14em;color:#902F8A;margin:0 0 12px;">STRETCHY HQ · COVER NEEDED</p>
              <h1 style="font-size:26px;font-weight:900;color:#14110F;margin:0 0 12px;">Can you cover this one?</h1>
              <p style="color:rgba(20,17,15,.7);font-size:15px;margin:0 0 20px;">We need ${roleLabel} for <strong>${session.title}</strong> — ${dateStr} at ${session.location_name}. The original one can&rsquo;t make it.</p>
              <a href="${claimUrl}" style="display:inline-block;background:#14110F;color:#F7F0E8;text-decoration:none;font-size:14px;font-weight:700;padding:14px 26px;border-radius:999px;">I&rsquo;ll take it →</a>
              <p style="font-size:12px;color:rgba(20,17,15,.5);margin:20px 0 0;">First to claim it gets it — no need to reply if you can't.</p>
            </div>
          `,
        }).catch((e) => console.error("Substitute request email error:", e))
      )
    );
  }

  return NextResponse.json({ ok: true, requestId: created.id, notified: eligible.length });
}
