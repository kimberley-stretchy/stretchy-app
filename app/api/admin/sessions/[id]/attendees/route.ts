import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";
import { careNotesFor } from "@/lib/careNotes";
import { stretchyBadge, previousSessions } from "@/lib/stretchyBadge";
import { APP_URL } from "@/lib/stretchy-email";
import { compPlace } from "@/lib/compPlace";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
}

// GET /api/admin/sessions/[id]/attendees — who's actually holding a spot,
// with contact details. Attendees live only in Supabase (the `attendees` +
// `holds` tables) — this route just reads that, it isn't a second store.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  const { id } = await params;
  const supabase = getSupabase();

  // Active before the final charge, "charged" after it — so the list is still
  // here on the day (it used to go empty at the final charge the session).
  const { data: holds, error } = await supabase
    .from("holds")
    .select("id, user_id, state, created_at, quantity, is_comp, checked_in_at")
    .eq("session_id", id)
    .in("state", ["active", "charged"])
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!holds || holds.length === 0) return NextResponse.json({ attendees: [] });

  const userIds = Array.from(new Set(holds.map((h) => h.user_id)));
  // Name, contact, and what they've told us about moving with care — the same
  // details the teacher and GEM see on the run sheet, plus contact for HQ.
  const { data: attendees } = await supabase
    .from("attendees")
    .select("auth_user_id, name, email, phone, sessions_attended")
    .in("auth_user_id", userIds);
  const care = await careNotesFor(supabase, userIds);
  const before = await previousSessions(supabase, userIds, id);

  const byUser = new Map((attendees ?? []).map((a) => [a.auth_user_id, a]));

  // One hold row per attendee, with quantity recording spot count — grouped
  // defensively in case any legacy multi-row holds still exist.
  const grouped = new Map<string, {
    userId: string; name: string; email: string; phone: string | null; spots: number; heldAt: string;
    isComp: boolean; checkedIn: boolean; careNote: string | null; careDuration: string | null; firstTimer: boolean; badge: string | null;
  }>();
  for (const h of holds) {
    const a = byUser.get(h.user_id);
    const existing = grouped.get(h.user_id);
    if (existing) {
      existing.spots += h.quantity ?? 1;
      existing.checkedIn = existing.checkedIn || !!h.checked_in_at;
    } else {
      grouped.set(h.user_id, {
        userId: h.user_id,
        name: a?.name ?? "Unknown",
        email: a?.email ?? "—",
        phone: a?.phone ?? null,
        spots: h.quantity ?? 1,
        heldAt: h.created_at,
        isComp: !!h.is_comp,
        checkedIn: !!h.checked_in_at,
        careNote: care.get(h.user_id)?.note ?? null,
        careDuration: care.get(h.user_id)?.duration ?? null,
        firstTimer: (before.get(h.user_id) ?? 0) === 0,
        badge: stretchyBadge(before.get(h.user_id) ?? 0),
      });
    }
  }

  return NextResponse.json({ attendees: Array.from(grouped.values()) });
}

// PATCH /api/admin/sessions/[id]/attendees — HQ checks someone in (or undoes it).
// Body: { userId, checkedIn }
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;
  const { id } = await params;
  const { userId, checkedIn } = await request.json().catch(() => ({}));
  if (!userId) return NextResponse.json({ error: "Missing person" }, { status: 400 });
  const { error } = await getSupabase()
    .from("holds")
    .update({ checked_in_at: checkedIn ? new Date().toISOString() : null })
    .eq("session_id", id)
    .eq("user_id", userId)
    .in("state", ["active", "charged"]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// POST /api/admin/sessions/[id]/attendees — HQ comps (gifts) someone a place.
// Body: { email, name?, quantity? }. Covered by Stretchy: no payment, no Stripe.
// Attaches to their existing account by email; if none exists we create the
// account (they finish setup by logging in) so the hold has somewhere to live.
// They then flow through the normal lifecycle: this "you're in — on us" email
// now, plus the 38h / 36h / 30 min nudges like any other holder.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  const { id: sessionId } = await params;
  const body = await request.json().catch(() => ({}));
  const result = await compPlace(getSupabase(), {
    sessionId,
    email: body.email ?? "",
    name: body.name ?? "",
    quantity: body.quantity,
  });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const quantity = Math.min(Math.max(Number(body.quantity) || 1, 1), 6);
  return NextResponse.json({
    ok: true,
    newAccount: result.newAccount,
    emailDelivered: result.emailDelivered,
    emailError: result.emailError,
    attendee: { name: result.attendeeName, email: String(body.email ?? "").trim().toLowerCase(), spots: quantity },
    manageUrl: `${APP_URL}/hold/${sessionId}`,
  });
}
