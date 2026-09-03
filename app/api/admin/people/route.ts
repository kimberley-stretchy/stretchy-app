import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/admin/people — everyone HQ can book: teachers, GEMs, venues & social spots.
export async function GET() {
  const admin = getAdmin();

  const [{ data: hosts }, { data: venues }] = await Promise.all([
    admin.from("hosts").select("id, name, roles, practice_types, neighbourhood, neighbourhoods, vetting_status, sessions_hosted, application_notes"),
    admin.from("interest_submissions").select("id, name, email, fields, type, created_at").in("type", ["venue", "social_stretch"]),
  ]);

  const areasOf = (h: { neighbourhood: string; neighbourhoods?: string[] | null }) =>
    h.neighbourhoods && h.neighbourhoods.length > 0 ? h.neighbourhoods.join(", ") : h.neighbourhood;

  const teachers = (hosts ?? [])
    .filter((h) => (h.roles ?? []).includes("teacher"))
    .map((h) => ({
      id: h.id,
      name: h.name,
      meta: [areasOf(h), ...(h.practice_types ?? [])].filter(Boolean).join(", "),
      status: h.vetting_status === "approved" ? "FREE" : h.vetting_status === "pending" ? "PENDING" : h.vetting_status?.toUpperCase() ?? "PENDING",
      note: h.application_notes,
    }));

  const gems = (hosts ?? [])
    .filter((h) => (h.roles ?? []).includes("gem"))
    .map((h) => ({
      id: h.id,
      name: h.name,
      meta: [areasOf(h), h.sessions_hosted ? `${h.sessions_hosted} sessions` : null].filter(Boolean).join(", "),
      status: h.vetting_status === "approved" ? "FREE" : h.vetting_status === "pending" ? "PENDING" : h.vetting_status?.toUpperCase() ?? "PENDING",
      note: h.application_notes,
    }));

  const venueRows = (venues ?? []).map((v) => ({
    id: v.id,
    name: v.name ?? (v.fields as Record<string, string>)?.address ?? "Untitled spot",
    meta: [
      v.type === "social_stretch" ? "Social Stretch" : "Movement space",
      (v.fields as Record<string, string>)?.capacity ? `holds ${(v.fields as Record<string, string>).capacity}` : null,
      (v.fields as Record<string, string>)?.rate ? `NZD ${(v.fields as Record<string, string>).rate}` : null,
    ].filter(Boolean).join(" · "),
    status: "NEW",
  }));

  return NextResponse.json({ teachers, gems, venues: venueRows });
}

// PATCH /api/admin/people — approve or decline a teacher/GEM's application.
export async function PATCH(request: NextRequest) {
  const { hostId, vettingStatus } = await request.json();
  if (!hostId || !["approved", "declined", "pending", "more_info"].includes(vettingStatus)) {
    return NextResponse.json({ error: "Missing hostId or invalid status" }, { status: 400 });
  }

  const admin = getAdmin();
  const { data: host, error } = await admin
    .from("hosts")
    .update({ vetting_status: vettingStatus })
    .eq("id", hostId)
    .select("id, name, email, roles")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (vettingStatus === "approved" && host?.email && process.env.RESEND_API_KEY) {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.stretchyyoga.co.nz";
    const firstName = host.name?.split(" ")[0] ?? "there";
    resend.emails
      .send({
        from: "Stretchy HQ <hello@stretchy.social>",
        to: host.email,
        subject: "You're approved to host with Stretchy",
        text: `Hi ${firstName},\n\nYou're approved — you can now see your sessions and get to work. Head to your dashboard: ${appUrl}/host/home\n\nStretchy HQ`,
        html: `<div style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;background:#F7F0E8;padding:32px;border-radius:16px;"><h1 style="font-size:26px;font-weight:900;color:#14110F;margin:0 0 12px;">You&rsquo;re approved. 🙌</h1><p style="color:rgba(20,17,15,.7);font-size:15px;margin:0 0 20px;">Hi ${firstName} — you&rsquo;re approved to host with Stretchy. You can now see your sessions and get to work.</p><a href="${appUrl}/host/home" style="display:inline-block;background:#14110F;color:#F7F0E8;text-decoration:none;font-size:14px;font-weight:700;padding:14px 26px;border-radius:999px;">Go to your dashboard →</a></div>`,
      })
      .catch((e) => console.error("Host approval email error:", e));
  }

  return NextResponse.json({ ok: true });
}
