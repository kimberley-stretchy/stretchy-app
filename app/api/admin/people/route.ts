import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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
