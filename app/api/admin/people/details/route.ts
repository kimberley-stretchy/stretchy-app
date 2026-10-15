import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";

// PATCH /api/admin/people/details — HQ edits a teacher's or GEM's profile
// details: { hostId, name?, phone?, instagram?, tiktok?, website?, bio?, neighbourhoods? }
// The same contact details are copied to their Team portal card (matched by
// email) so the team view always shows the latest.
function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
}

const clean = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) || null : undefined);

export async function PATCH(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;
  const body = await request.json().catch(() => ({}));
  if (!body.hostId) return NextResponse.json({ error: "Missing person" }, { status: 400 });

  const phone = clean(body.phone, 30);
  if (phone && !/^[\d\s+()-]{6,30}$/.test(phone)) {
    return NextResponse.json({ error: "That doesn’t look like a phone number." }, { status: 400 });
  }
  const name = clean(body.name, 120);
  if (name === null) return NextResponse.json({ error: "They need a name." }, { status: 400 });

  const fields: Record<string, unknown> = {};
  if (name !== undefined) fields.name = name;
  for (const k of ["instagram", "tiktok", "website"] as const) if (clean(body[k], 200) !== undefined) fields[k] = clean(body[k], 200);
  if (clean(body.bio, 2000) !== undefined) fields.bio = clean(body.bio, 2000);
  if (typeof body.neighbourhoods === "string") {
    fields.neighbourhoods = body.neighbourhoods.split(",").map((s: string) => s.trim()).filter(Boolean);
  }

  const admin = getAdmin();
  const { data: host, error } = await admin.from("hosts").update(fields).eq("id", body.hostId).select("email").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Phone on its own: before the phone column is added this is the one part
  // that can't save, and it mustn't take the rest of the edit with it.
  let phoneSaved = true;
  if (phone !== undefined) {
    const { error: phoneErr } = await admin.from("hosts").update({ phone }).eq("id", body.hostId);
    if (phoneErr) phoneSaved = false;
  }

  // Keep their Team portal card in step.
  if (host?.email) {
    const card: Record<string, unknown> = {};
    if (phone !== undefined) card.phone = phone;
    for (const k of ["name", "instagram", "tiktok"] as const) if (k in fields) card[k] = fields[k];
    if (Object.keys(card).length) {
      await admin.from("portal_people").update(card).ilike("email", host.email.replace(/[\\%_]/g, (c) => `\\${c}`)).then(undefined, () => {});
    }
  }

  return NextResponse.json({ ok: true, phoneSaved });
}
