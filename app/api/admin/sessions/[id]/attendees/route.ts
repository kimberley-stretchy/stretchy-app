import { NextRequest, NextResponse } from "next/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";
import { sendAttendeeEmail, APP_URL } from "@/lib/stretchy-email";
import { buildSessionEmailExtras, isFirstStretchy } from "@/lib/sessionEmailContext";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
}

// Find an existing auth user id by email (no direct getByEmail in supabase-js;
// page through the admin list — fine for HQ's low-volume comp adds).
async function findAuthUserIdByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  const target = email.toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    const users = (data?.users ?? []) as { id: string; email?: string | null }[];
    if (error || users.length === 0) break;
    const hit = users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (hit) return hit.id;
    if (users.length < 200) break;
  }
  return null;
}

// GET /api/admin/sessions/[id]/attendees — who's actually holding a spot,
// with contact details. Attendees live only in Supabase (the `attendees` +
// `holds` tables) — this route just reads that, it isn't a second store.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  const { id } = await params;
  const supabase = getSupabase();

  const { data: holds, error } = await supabase
    .from("holds")
    .select("id, user_id, state, created_at, quantity")
    .eq("session_id", id)
    .eq("state", "active")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!holds || holds.length === 0) return NextResponse.json({ attendees: [] });

  const userIds = Array.from(new Set(holds.map((h) => h.user_id)));
  const { data: attendees } = await supabase
    .from("attendees")
    .select("auth_user_id, name, email")
    .in("auth_user_id", userIds);

  const byUser = new Map((attendees ?? []).map((a) => [a.auth_user_id, a]));

  // One hold row per attendee, with quantity recording spot count — grouped
  // defensively in case any legacy multi-row holds still exist.
  const grouped = new Map<string, { name: string; email: string; spots: number; heldAt: string }>();
  for (const h of holds) {
    const a = byUser.get(h.user_id);
    const key = h.user_id;
    const existing = grouped.get(key);
    if (existing) {
      existing.spots += h.quantity ?? 1;
    } else {
      grouped.set(key, {
        name: a?.name ?? "Unknown",
        email: a?.email ?? "—",
        spots: h.quantity ?? 1,
        heldAt: h.created_at,
      });
    }
  }

  return NextResponse.json({ attendees: Array.from(grouped.values()) });
}

// POST /api/admin/sessions/[id]/attendees — HQ comps (gifts) someone a place.
// Body: { email, name?, quantity? }. Covered by Stretchy: no payment, no Stripe.
// Attaches to their existing account by email; if none exists we create the
// account (they finish setup by logging in) so the hold has somewhere to live.
// They then flow through the normal lifecycle: this "you're in — on us" email
// now, plus the 38h / 36h / 2h nudges like any other holder.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  const { id: sessionId } = await params;
  const admin = getSupabase();

  const body = await request.json().catch(() => ({}));
  const email = (body.email ?? "").trim().toLowerCase();
  const nameInput = (body.name ?? "").trim();
  const quantity = Math.min(Math.max(Number(body.quantity) || 1, 1), 6);

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }

  // Session must exist and be live-ish (not cancelled).
  const { data: session } = await admin
    .from("sessions")
    .select("id, title, starts_at, location_name, social_stretch_venue, state, host_id, gem_host_id, movement_type, duration_mins, getting_there, venue_instagram, social_venue_instagram")
    .eq("id", sessionId)
    .single();
  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });
  if (session.state === "cancelled") return NextResponse.json({ error: "That session is cancelled." }, { status: 400 });

  // ── Resolve the account (existing by email, else create it) ─────────────────
  let userId: string | null = null;
  let attendeeName = nameInput || email.split("@")[0];
  let newAccount = false;

  const { data: existingAtt } = await admin
    .from("attendees")
    .select("id, auth_user_id, name")
    .ilike("email", email)
    .maybeSingle();

  if (existingAtt?.auth_user_id) {
    userId = existingAtt.auth_user_id;
    if (existingAtt.name) attendeeName = existingAtt.name;
  } else {
    // No attendee row — the auth user may still exist. Try to create; on a
    // duplicate, look them up.
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: nameInput ? { full_name: nameInput } : undefined,
    });
    if (created?.user) {
      userId = created.user.id;
      newAccount = true;
    } else {
      userId = await findAuthUserIdByEmail(admin, email);
      if (!userId) {
        console.error("Comp add: could not create or find user:", createErr);
        return NextResponse.json({ error: "Could not set up an account for that email." }, { status: 500 });
      }
    }
  }

  // Ensure an attendee row exists for this account.
  const { data: attendeeRow } = await admin
    .from("attendees")
    .select("id, name")
    .eq("auth_user_id", userId)
    .maybeSingle();
  if (!attendeeRow) {
    await admin.from("attendees").insert({ auth_user_id: userId, name: attendeeName, email });
  } else if (attendeeRow.name) {
    attendeeName = attendeeRow.name;
  }

  // ── The comp hold ───────────────────────────────────────────────────────────
  const { data: existingHold } = await admin
    .from("holds")
    .select("id, quantity, is_comp")
    .eq("session_id", sessionId)
    .eq("user_id", userId)
    .eq("state", "active")
    .maybeSingle();

  if (existingHold) {
    return NextResponse.json(
      { error: `${attendeeName} already holds ${existingHold.quantity} spot${existingHold.quantity === 1 ? "" : "s"} here.` },
      { status: 409 }
    );
  }

  const { error: holdErr } = await admin.from("holds").insert({
    session_id: sessionId,
    user_id: userId,
    state: "active",
    quantity,
    is_comp: true,
    stripe_pi_id: null,
  });
  if (holdErr) {
    console.error("Comp hold insert error:", holdErr);
    return NextResponse.json({ error: holdErr.message }, { status: 500 });
  }

  // ── "You're in — on us" email ───────────────────────────────────────────────
  const startDate = new Date(session.starts_at);
  const dateStr =
    startDate.toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "long", day: "numeric", month: "long" }) +
    " at " +
    startDate.toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit", hour12: true });

  const emailExtras = await buildSessionEmailExtras(admin, session);
  const firstTimer = await isFirstStretchy(admin, userId);
  await sendAttendeeEmail(
    "comp_hold_confirmed",
    {
      to: email,
      name: attendeeName.split(" ")[0] || "there",
      sessionTitle: session.title,
      date: dateStr,
      venue: session.location_name,
      socialStretchVenue: session.social_stretch_venue ?? "nearby",
      sessionId,
      newAccount,
      isFirstStretchy: firstTimer,
      ...emailExtras,
    },
    { bcc: "kimberley@stretchyyoga.co.nz" }
  );

  return NextResponse.json({
    ok: true,
    newAccount,
    attendee: { name: attendeeName, email, spots: quantity },
    manageUrl: `${APP_URL}/hold/${sessionId}`,
  });
}
