import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";
import { LOCATION_FIELDS, PERSON_FIELDS, pick, type PortalPerson } from "@/lib/portal";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
}

// GET /api/admin/portal — everything HQ edits in the team portal.
export async function GET(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;
  const admin = getAdmin();

  const [locs, people, links, agreements, acceptances] = await Promise.all([
    admin.from("portal_locations").select("*").order("sort_order").order("name"),
    admin.from("portal_people").select("*").order("sort_order").order("name"),
    admin.from("portal_location_people").select("location_id, person_id"),
    admin.from("portal_agreements").select("*").order("version", { ascending: false }),
    admin.from("portal_agreement_acceptances").select("agreement_id, email, name, accepted_at").order("accepted_at", { ascending: false }),
  ]);
  const err = locs.error ?? people.error ?? links.error ?? agreements.error ?? acceptances.error;
  if (err) return NextResponse.json({ error: err.message }, { status: 500 });

  const withLocations: PortalPerson[] = (people.data ?? []).map((p) => ({
    ...p,
    location_ids: (links.data ?? []).filter((l) => l.person_id === p.id).map((l) => l.location_id),
  }));

  const all = agreements.data ?? [];
  const published = all.find((a) => a.published_at) ?? null;
  const draft = all[0] && !all[0].published_at ? all[0] : null;

  return NextResponse.json({
    locations: locs.data ?? [],
    people: withLocations,
    agreement: { published, draft },
    acceptances: published ? (acceptances.data ?? []).filter((a) => a.agreement_id === published.id) : [],
  });
}

// POST /api/admin/portal — { action, ... }
export async function POST(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;
  const admin = getAdmin();
  const body = await request.json().catch(() => ({}));
  const now = new Date().toISOString();

  const fail = (message: string, status = 400) => NextResponse.json({ error: message }, { status });

  switch (body.action) {
    case "saveLocation": {
      const loc = body.location ?? {};
      const fields = pick(loc, LOCATION_FIELDS);
      if (loc.id) {
        if ("name" in fields && !fields.name) return fail("Location needs a name");
        const { error } = await admin.from("portal_locations").update({ ...fields, updated_at: now }).eq("id", loc.id);
        if (error) return fail(error.message, 500);
      } else {
        if (!fields.name) return fail("Location needs a name");
        const { error } = await admin.from("portal_locations").insert(fields);
        if (error) return fail(error.message, 500);
      }
      break;
    }

    case "deleteLocation": {
      if (!body.id) return fail("Missing id");
      const { error } = await admin.from("portal_locations").delete().eq("id", body.id);
      if (error) return fail(error.message, 500);
      break;
    }

    case "savePerson": {
      const p = body.person ?? {};
      const fields = pick(p, PERSON_FIELDS);
      if (typeof fields.email === "string") fields.email = fields.email.toLowerCase();
      if (!p.id && !fields.name) return fail("Person needs a name");
      if ("name" in fields && !fields.name) return fail("Person needs a name");

      let id = p.id as string | undefined;
      if (id) {
        const { error } = await admin.from("portal_people").update({ ...fields, updated_at: now }).eq("id", id);
        if (error) return fail(error.message, 500);
      } else {
        const { data, error } = await admin.from("portal_people").insert(fields).select("id").single();
        if (error) return fail(error.message, 500);
        id = data.id;
      }

      if (Array.isArray(p.location_ids)) {
        const { error: delErr } = await admin.from("portal_location_people").delete().eq("person_id", id);
        if (delErr) return fail(delErr.message, 500);
        const rows = (p.location_ids as string[]).map((location_id) => ({ location_id, person_id: id }));
        if (rows.length) {
          const { error } = await admin.from("portal_location_people").insert(rows);
          if (error) return fail(error.message, 500);
        }
      }
      break;
    }

    case "deletePerson": {
      if (!body.id) return fail("Missing id");
      const { error } = await admin.from("portal_people").delete().eq("id", body.id);
      if (error) return fail(error.message, 500);
      break;
    }

    // Edits always land on the latest unpublished version (created if needed).
    case "saveAgreementDraft": {
      const title = String(body.title ?? "").trim() || "Stretchy team agreement";
      const sections = {
        body: String(body.body ?? ""),
        body_teacher: String(body.body_teacher ?? ""),
        body_gem: String(body.body_gem ?? ""),
        body_partner: String(body.body_partner ?? ""),
      };
      const { data: latest } = await admin.from("portal_agreements").select("id, version, published_at").order("version", { ascending: false }).limit(1).maybeSingle();
      if (latest && !latest.published_at) {
        const { error } = await admin.from("portal_agreements").update({ title, ...sections, updated_at: now }).eq("id", latest.id);
        if (error) return fail(error.message, 500);
      } else {
        const { error } = await admin.from("portal_agreements").insert({ version: (latest?.version ?? 0) + 1, title, ...sections });
        if (error) return fail(error.message, 500);
      }
      break;
    }

    case "publishAgreement": {
      const { data: latest } = await admin.from("portal_agreements").select("id, body, published_at").order("version", { ascending: false }).limit(1).maybeSingle();
      if (!latest || latest.published_at) return fail("No draft to publish");
      if (!latest.body.trim()) return fail("The agreement is empty");
      const { error } = await admin.from("portal_agreements").update({ published_at: now, updated_at: now }).eq("id", latest.id);
      if (error) return fail(error.message, 500);
      break;
    }

    default:
      return fail("Unknown action");
  }

  return NextResponse.json({ ok: true });
}
