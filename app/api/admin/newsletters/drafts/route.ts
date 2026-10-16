import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";

// Newsletter drafts, saved as JSON files in a PRIVATE Storage bucket (no
// table/migration needed; only reachable through these admin-only routes).
// One file per draft: <id>.json = { id, subject, updatedAt, data }, where
// `data` is the HQ composer's state exactly as it was saved.
// Once a newsletter goes out it's kept as a record with status "sent" (or
// "scheduled"), which HQ lists under SENT rather than DRAFTS.
const BUCKET = "newsletter-drafts";

function getAdmin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

type Status = "draft" | "sent" | "scheduled";
type DraftFile = {
  id: string; subject: string; updatedAt: string; data: unknown;
  status?: Status; sentAt?: string | null; sentTo?: number | null; scheduledFor?: string | null;
};

const validId = (id: string | null): id is string => !!id && /^[a-z0-9-]{8,64}$/.test(id);

async function readDraft(admin: ReturnType<typeof getAdmin>, id: string): Promise<DraftFile | null> {
  const { data } = await admin.storage.from(BUCKET).download(`${id}.json`);
  if (!data) return null;
  try { return JSON.parse(await data.text()) as DraftFile; } catch { return null; }
}

// GET — list drafts (newest first), or ?id= to load one.
export async function GET(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;
  const admin = getAdmin();

  const id = request.nextUrl.searchParams.get("id");
  if (id) {
    if (!validId(id)) return NextResponse.json({ error: "Bad draft id" }, { status: 400 });
    const draft = await readDraft(admin, id);
    return draft ? NextResponse.json({ draft }) : NextResponse.json({ error: "Draft not found" }, { status: 404 });
  }

  const { data: files, error } = await admin.storage.from(BUCKET).list("", { limit: 200, sortBy: { column: "updated_at", order: "desc" } });
  if (error) {
    // Bucket not created yet = no drafts yet.
    if (/not found/i.test(error.message)) return NextResponse.json({ drafts: [] });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const ids = (files ?? []).filter((f) => f.name.endsWith(".json")).map((f) => f.name.replace(/\.json$/, ""));
  const drafts = (await Promise.all(ids.map((d) => readDraft(admin, d))))
    .filter((d): d is DraftFile => !!d)
    .map(({ id, subject, updatedAt, status, sentAt, sentTo, scheduledFor }) => ({ id, subject, updatedAt, status: status ?? "draft", sentAt: sentAt ?? null, sentTo: sentTo ?? null, scheduledFor: scheduledFor ?? null }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return NextResponse.json({ drafts });
}

// POST — save a draft. { id?, subject, data, status?, sentAt?, sentTo?, scheduledFor? }.
// No id = new draft. Or { id, markSent: true } to move an existing draft to SENT.
export async function POST(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;
  const admin = getAdmin();

  const body = await request.json().catch(() => null);
  if (body && body.markSent && validId(body.id)) {
    const existing = await readDraft(admin, body.id);
    if (!existing) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    const moved: DraftFile = { ...existing, status: "sent", sentAt: existing.sentAt ?? new Date().toISOString() };
    const { error } = await admin.storage.from(BUCKET).upload(`${body.id}.json`, new Blob([JSON.stringify(moved)], { type: "application/json" }), { upsert: true, contentType: "application/json" });
    return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
  }
  if (!body || typeof body !== "object" || !body.data) return NextResponse.json({ error: "Nothing to save." }, { status: 400 });
  const id: string = validId(body.id) ? body.id : crypto.randomUUID();
  const draft: DraftFile = {
    id,
    subject: String(body.subject ?? "").slice(0, 200) || "Untitled newsletter",
    updatedAt: new Date().toISOString(),
    data: body.data,
    status: body.status === "sent" || body.status === "scheduled" ? body.status : "draft",
    sentAt: typeof body.sentAt === "string" ? body.sentAt : null,
    sentTo: typeof body.sentTo === "number" ? body.sentTo : null,
    scheduledFor: typeof body.scheduledFor === "string" ? body.scheduledFor : null,
  };
  const json = JSON.stringify(draft);
  if (json.length > 2_000_000) return NextResponse.json({ error: "Draft is too large to save." }, { status: 400 });

  await admin.storage.createBucket(BUCKET, { public: false }).catch(() => {});
  const { error } = await admin.storage.from(BUCKET).upload(`${id}.json`, new Blob([json], { type: "application/json" }), { upsert: true, contentType: "application/json" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id, updatedAt: draft.updatedAt });
}

// DELETE ?id= — remove a draft.
export async function DELETE(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;
  const id = request.nextUrl.searchParams.get("id");
  if (!validId(id)) return NextResponse.json({ error: "Bad draft id" }, { status: 400 });
  const { error } = await getAdmin().storage.from(BUCKET).remove([`${id}.json`]);
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
}
