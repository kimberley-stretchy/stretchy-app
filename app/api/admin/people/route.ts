import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { requireAdmin } from "@/lib/adminAuth";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
}

// GET /api/admin/people — everyone HQ can book: teachers, GEMs, venues & social spots.
export async function GET(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  const admin = getAdmin();

  const [{ data: hosts }, { data: venues }, { data: upcomingSessions }, { data: applications }] = await Promise.all([
    admin.from("hosts").select("id, name, email, roles, practice_types, neighbourhood, neighbourhoods, vetting_status, sessions_hosted, application_notes, bio, avatar_url"),
    admin.from("interest_submissions").select("id, name, email, fields, type, created_at").in("type", ["venue", "social_stretch"]),
    admin
      .from("sessions")
      .select("id, title, starts_at, location_name, host_id, gem_host_id")
      .neq("state", "cancelled")
      .gt("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true }),
    // "Teach a Stretchy" / "Become a GEM" form entries — people who've
    // applied but haven't created a host login yet.
    admin
      .from("interest_submissions")
      .select("id, name, email, fields, type, created_at")
      .in("type", ["teacher", "gem"])
      .order("created_at", { ascending: false }),
  ]);

  const areasOf = (h: { neighbourhood: string; neighbourhoods?: string[] | null }) =>
    h.neighbourhoods && h.neighbourhoods.length > 0 ? h.neighbourhoods.join(", ") : h.neighbourhood;

  const activeSessionsFor = (hostId: string) => [
    ...(upcomingSessions ?? [])
      .filter((s) => s.host_id === hostId)
      .map((s) => ({ id: s.id, title: s.title, startsAt: s.starts_at, locationName: s.location_name, role: "teacher" as const })),
    ...(upcomingSessions ?? [])
      .filter((s) => s.gem_host_id === hostId)
      .map((s) => ({ id: s.id, title: s.title, startsAt: s.starts_at, locationName: s.location_name, role: "gem" as const })),
  ];

  const teachers = (hosts ?? [])
    .filter((h) => (h.roles ?? []).includes("teacher"))
    .map((h) => ({
      id: h.id,
      name: h.name,
      email: h.email,
      meta: [areasOf(h), ...(h.practice_types ?? [])].filter(Boolean).join(", "),
      status: h.vetting_status === "approved" ? "FREE" : h.vetting_status === "pending" ? "AWAITING REVIEW" : h.vetting_status?.toUpperCase() ?? "AWAITING REVIEW",
      note: h.application_notes,
      bio: h.bio,
      avatarUrl: h.avatar_url,
      practiceTypes: h.practice_types ?? [],
      neighbourhoods: h.neighbourhoods && h.neighbourhoods.length > 0 ? h.neighbourhoods : [h.neighbourhood].filter(Boolean),
      activeSessions: activeSessionsFor(h.id),
    }));

  const gems = (hosts ?? [])
    .filter((h) => (h.roles ?? []).includes("gem"))
    .map((h) => ({
      id: h.id,
      name: h.name,
      email: h.email,
      meta: [areasOf(h), h.sessions_hosted ? `${h.sessions_hosted} sessions` : null].filter(Boolean).join(", "),
      status: h.vetting_status === "approved" ? "FREE" : h.vetting_status === "pending" ? "AWAITING REVIEW" : h.vetting_status?.toUpperCase() ?? "AWAITING REVIEW",
      note: h.application_notes,
      bio: h.bio,
      avatarUrl: h.avatar_url,
      practiceTypes: h.practice_types ?? [],
      neighbourhoods: h.neighbourhoods && h.neighbourhoods.length > 0 ? h.neighbourhoods : [h.neighbourhood].filter(Boolean),
      activeSessions: activeSessionsFor(h.id),
    }));

  // Form applicants show as APPLIED until they sign up at /host/login — then
  // they have a hosts row and appear above as AWAITING REVIEW instead.
  // Newest entry per email wins, so double-submits show once.
  const hostEmails = new Set((hosts ?? []).map((h) => h.email?.trim().toLowerCase()).filter(Boolean));
  const seen = new Set<string>();
  const applicantsFor = (type: "teacher" | "gem") =>
    (applications ?? [])
      .filter((a) => a.type === type)
      .filter((a) => {
        const key = `${type}:${a.email?.trim().toLowerCase()}`;
        if (!a.email || hostEmails.has(a.email.trim().toLowerCase()) || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((a) => {
        const f = (a.fields ?? {}) as Record<string, unknown>;
        const list = (v: unknown) => (Array.isArray(v) ? v.filter(Boolean).map(String) : typeof v === "string" && v ? [v] : []);
        const areas = type === "teacher" ? list(f.location) : list(f.where);
        const styles = type === "teacher" ? list(f.styles) : [];
        const when = type === "teacher" ? [...list(f.days), ...list(f.times)] : list(f.when);
        const extra = [
          type === "teacher" && f.qualifications ? `Qualifications: ${f.qualifications}` : null,
          type === "gem" && f.why ? `Why: ${f.why}` : null,
          when.length ? `Available: ${when.join(", ")}` : null,
          f.firstAid ? `First aid: ${f.firstAid === true ? "yes" : f.firstAid}` : null,
        ].filter(Boolean).join("\n");
        return {
          id: `application:${a.id}`,
          name: a.name ?? a.email,
          email: a.email,
          meta: [...areas, ...styles].join(", "),
          status: "APPLIED",
          note: null,
          bio: extra || null,
          avatarUrl: null,
          practiceTypes: styles,
          neighbourhoods: areas,
          activeSessions: [] as ReturnType<typeof activeSessionsFor>,
        };
      });

  teachers.push(...applicantsFor("teacher"));
  gems.push(...applicantsFor("gem"));

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
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

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

// POST /api/admin/people — HQ adds a teacher/GEM directly, already approved,
// so they can be scheduled straight away. Either from scratch
// ({ name, email, roles, neighbourhoods?, practiceTypes? }) or by approving a
// form applicant ({ applicationId }). No login needed yet: the row is linked
// to their account the first time they sign in with this email
// (lib/claimHost.ts). If a host with this email already exists, they're
// approved and given the role instead of being duplicated.
export async function POST(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  const admin = getAdmin();
  const body = await request.json();
  const list = (v: unknown) =>
    (Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [])
      .map((x) => String(x).trim())
      .filter(Boolean);

  let name: string = (body.name ?? "").trim();
  let email: string = (body.email ?? "").trim().toLowerCase();
  let roles: string[] = list(body.roles).filter((r) => r === "teacher" || r === "gem");
  let neighbourhoods = list(body.neighbourhoods);
  let practiceTypes = list(body.practiceTypes);

  if (body.applicationId) {
    const { data: app } = await admin
      .from("interest_submissions")
      .select("name, email, type, fields")
      .eq("id", body.applicationId)
      .single();
    if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });
    const f = (app.fields ?? {}) as Record<string, unknown>;
    name = name || (app.name ?? "").trim();
    email = email || (app.email ?? "").trim().toLowerCase();
    roles = roles.length ? roles : [app.type];
    neighbourhoods = neighbourhoods.length ? neighbourhoods : list(app.type === "teacher" ? f.location : f.where);
    practiceTypes = practiceTypes.length ? practiceTypes : app.type === "teacher" ? list(f.styles) : [];
  }

  if (!name || !/^\S+@\S+\.\S+$/.test(email) || roles.length === 0) {
    return NextResponse.json({ error: "Name, a valid email and at least one role are needed." }, { status: 400 });
  }

  const { data: existing } = await admin.from("hosts").select("id, roles").ilike("email", email).limit(1).maybeSingle();
  if (existing) {
    const mergedRoles = Array.from(new Set([...(existing.roles ?? []), ...roles]));
    const { error } = await admin
      .from("hosts")
      .update({ roles: mergedRoles, vetting_status: "approved" })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, hostId: existing.id, existed: true });
  }

  const { data: created, error } = await admin
    .from("hosts")
    .insert({
      name,
      email,
      roles,
      neighbourhoods,
      neighbourhood: neighbourhoods[0] ?? "",
      practice_types: practiceTypes,
      vetting_status: "approved",
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, hostId: created.id });
}
