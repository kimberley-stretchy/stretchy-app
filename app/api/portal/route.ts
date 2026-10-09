import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";
import { requireHost } from "@/lib/hostAuth";
import { SECRET_LOCATION_FIELDS, type PortalLocation, type PortalPerson } from "@/lib/portal";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
}

// HQ admins see every location; approved teachers/GEMs see the locations
// their email is assigned to in the HQ portal directory.
async function whoIsAsking(request: NextRequest) {
  const asAdmin = await requireAdmin(request);
  if (!("error" in asAdmin)) return { user: asAdmin.user, name: asAdmin.user.user_metadata?.name as string | undefined, isAdmin: true } as const;
  const asHost = await requireHost(request);
  if ("error" in asHost) return { error: asHost.error } as const;
  return { user: asHost.user, name: asHost.host.name as string, isAdmin: false } as const;
}

// GET /api/portal — the team view. Codes + weekly instructions stay hidden
// until the current published agreement has been accepted.
export async function GET(request: NextRequest) {
  const who = await whoIsAsking(request);
  if ("error" in who) return who.error;
  const admin = getAdmin();
  const email = (who.user.email ?? "").toLowerCase();

  const [locs, people, links, agreement] = await Promise.all([
    admin.from("portal_locations").select("*").order("sort_order").order("name"),
    admin.from("portal_people").select("*").order("sort_order").order("name"),
    admin.from("portal_location_people").select("location_id, person_id"),
    admin.from("portal_agreements").select("id, version, title, body, body_teacher, body_gem, body_partner, published_at").not("published_at", "is", null).order("version", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const err = locs.error ?? people.error ?? links.error ?? agreement.error;
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });

  const allPeople: PortalPerson[] = (people.data ?? []).map((p) => ({
    ...p,
    location_ids: (links.data ?? []).filter((l) => l.person_id === p.id).map((l) => l.location_id),
  }));

  const me = allPeople.find((p) => p.email?.toLowerCase() === email);
  let locations = (locs.data ?? []) as PortalLocation[];
  if (!who.isAdmin) {
    const mine = new Set(me?.on_all_locations ? locations.map((l) => l.id) : me?.location_ids ?? []);
    locations = locations.filter((l) => mine.has(l.id));
  }

  let accepted = true;
  if (agreement.data) {
    const { data: row } = await admin
      .from("portal_agreement_acceptances")
      .select("accepted_at")
      .eq("agreement_id", agreement.data.id)
      .eq("user_id", who.user.id)
      .maybeSingle();
    accepted = !!row;
  }

  if (!accepted) {
    locations = locations.map((l) => {
      const copy: Record<string, unknown> = { ...l };
      for (const k of SECRET_LOCATION_FIELDS) copy[k] = null;
      return copy as PortalLocation;
    });
  }

  const ids = new Set(locations.map((l) => l.id));
  const visiblePeople = allPeople.filter((p) => p.on_all_locations || p.location_ids.some((id) => ids.has(id)));

  return NextResponse.json({
    isAdmin: who.isAdmin,
    inDirectory: who.isAdmin || !!me,
    myRole: me?.role ?? null,
    locations,
    people: visiblePeople,
    agreement: agreement.data ?? null,
    accepted,
  });
}

// POST /api/portal — { acceptAgreementId }
export async function POST(request: NextRequest) {
  const who = await whoIsAsking(request);
  if ("error" in who) return who.error;
  const admin = getAdmin();
  const body = await request.json().catch(() => ({}));

  const { data: current } = await admin
    .from("portal_agreements")
    .select("id")
    .not("published_at", "is", null)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!current || current.id !== body.acceptAgreementId) {
    return NextResponse.json({ error: "That agreement has changed — refresh and read the latest version." }, { status: 409 });
  }

  const { error } = await admin.from("portal_agreement_acceptances").upsert(
    { agreement_id: current.id, user_id: who.user.id, email: (who.user.email ?? "").toLowerCase(), name: who.name ?? null },
    { onConflict: "agreement_id,user_id", ignoreDuplicates: true }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
