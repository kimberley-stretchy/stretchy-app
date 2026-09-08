import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { Resend } from "resend";
import { requireAdmin } from "@/lib/adminAuth";
import { notifyHostScheduled, notifyHostCancelled } from "@/lib/notifyHostScheduled";

// Create inside each request handler so env vars are always available at runtime
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
}
function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });
}

const KIMBERLEY_EMAIL = "kimberley@stretchyyoga.co.nz";
const KIMBERLEY_NAME  = "Kimberley Torrie";

// Get or create Kimberley's host record so sessions can reference it
async function getOrCreateHostId(): Promise<string> {
  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from("hosts")
    .select("id")
    .eq("email", KIMBERLEY_EMAIL)
    .single();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("hosts")
    .insert({
      name: KIMBERLEY_NAME,
      email: KIMBERLEY_EMAIL,
      neighbourhood: "Auckland",
      practice_types: ["yoga"],
      vetting_status: "approved",
    })
    .select("id")
    .single();

  if (error) throw new Error(`Could not create host: ${error.message}`);
  return created.id;
}

// GET /api/admin/sessions — list all sessions, or a single session by ?id=
export async function GET(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  let query = supabase
    .from("sessions")
    .select(`
      id, title, description, movement_type, starts_at, ends_at, duration_mins,
      location_name, location_address, getting_there,
      cost_base, revenue_target, currency, min_attendees, max_attendees, state, created_at,
      social_stretch_venue, social_stretch_note, what_to_bring, cost_lines, host_paid_at,
      host_id, gem_host_id, is_repeat, repeat_frequency, is_draft
    `)
    .order("starts_at", { ascending: true });

  if (id) query = query.eq("id", id);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Count active holds for each session — sum quantity, not row count, since
  // one hold row can now represent more than one spot.
  const sessionIds = (data || []).map((s) => s.id);
  const holdCounts: Record<string, number> = {};
  if (sessionIds.length > 0) {
    const { data: holds } = await supabase
      .from("holds")
      .select("session_id, quantity")
      .in("session_id", sessionIds)
      .eq("state", "active");

    (holds || []).forEach((h) => {
      holdCounts[h.session_id] = (holdCounts[h.session_id] || 0) + (h.quantity ?? 1);
    });
  }

  const sessions = (data || []).map((s) => ({
    ...s,
    current_holds: holdCounts[s.id] || 0,
  }));

  return NextResponse.json(sessions);
}

// POST /api/admin/sessions — create a new session
export async function POST(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  const supabase = getSupabase();
  const body = await request.json();

  const {
    title,
    description,
    movement_type,
    starts_at,
    duration_mins,
    location_name,
    location_address,
    getting_there,
    revenue_target,
    currency,
    min_attendees,
    max_attendees,
    social_stretch_venue,
    social_stretch_note,
    what_to_bring,
    cost_lines,
    host_id: hostIdInput,
    gem_host_id,
    is_draft,
    is_repeat,
    repeat_frequency,
  } = body;

  if (!title || !starts_at || !location_name || !revenue_target || !min_attendees || !max_attendees) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // cost_lines: [{ role: "Teacher"|"Venue"|"GEM"|"Charity"|custom, name: string, amount: number }]
  const costLines: { role: string; name: string; amount: number }[] = Array.isArray(cost_lines) ? cost_lines : [];
  const cost_base = costLines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

  const realHostAssigned = !!hostIdInput;
  const host_id = hostIdInput || (await getOrCreateHostId());

  const startsDate = new Date(starts_at);
  const endsDate = new Date(startsDate.getTime() + (duration_mins || 60) * 60 * 1000);

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      host_id,
      gem_host_id: gem_host_id || null,
      title,
      description: description || null,
      movement_type: movement_type || "yoga",
      starts_at,
      ends_at: endsDate.toISOString(),
      duration_mins: duration_mins || 60,
      location_name,
      location_address: location_address || "",
      getting_there: getting_there || null,
      cost_base,
      cost_lines: costLines,
      revenue_target: Number(revenue_target),
      currency: currency || "NZD",
      min_attendees: Number(min_attendees),
      max_attendees: Number(max_attendees),
      social_stretch_venue: social_stretch_venue || null,
      social_stretch_note: social_stretch_note || null,
      what_to_bring: what_to_bring || [],
      state: "open",
      is_draft: !!is_draft,
      is_repeat: !!is_repeat,
      repeat_frequency: is_repeat ? repeat_frequency || null : null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Create session error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sessionForNotify = {
    title,
    startsAt: starts_at,
    endsAt: endsDate.toISOString(),
    locationName: location_name,
    locationAddress: location_address,
  };
  if (realHostAssigned) {
    notifyHostScheduled({ hostId: host_id, role: "teacher", session: sessionForNotify }).catch((e) => console.error("Teacher notify error:", e));
  }
  if (gem_host_id) {
    notifyHostScheduled({ hostId: gem_host_id, role: "gem", session: sessionForNotify }).catch((e) => console.error("GEM notify error:", e));
  }

  return NextResponse.json({ id: data.id }, { status: 201 });
}

// PATCH /api/admin/sessions — update session state or details
export async function PATCH(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  const supabase = getSupabase();
  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) return NextResponse.json({ error: "Missing session id" }, { status: 400 });

  const { error } = await supabase
    .from("sessions")
    .update(updates)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

// DELETE /api/admin/sessions — cancel a session: release every active hold's
// Stripe authorization, mark those holds released, and email attendees —
// previously this only flipped the session's own state and left holders'
// cards authorized and never told, so cancelling here fixed nothing for them.
export async function DELETE(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  const supabase = getSupabase();
  const stripe = getStripe();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { data: session } = await supabase
    .from("sessions")
    .select("id, title, starts_at, location_name, host_id, gem_host_id")
    .eq("id", id)
    .single();

  if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const { data: holds } = await supabase
    .from("holds")
    .select("id, user_id, stripe_pi_id, quantity")
    .eq("session_id", id)
    .eq("state", "active");

  // Release every authorization before touching the session/holds rows, so a
  // Stripe failure can't leave the session cancelled with money still held.
  for (const hold of holds ?? []) {
    if (hold.stripe_pi_id) {
      try {
        await stripe.paymentIntents.cancel(hold.stripe_pi_id);
      } catch (e) {
        console.error(`Failed to cancel PI ${hold.stripe_pi_id} for hold ${hold.id}:`, e);
      }
    }
  }

  await supabase.from("holds").update({ state: "released" }).eq("session_id", id).eq("state", "active");

  const { error } = await supabase
    .from("sessions")
    .update({ state: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notify the assigned teacher/GEM too — skip the auto-provisioned Kimberley
  // placeholder host (unassigned sessions default to her record), same
  // distinction the create-session route already makes for "scheduled" emails.
  const sessionForNotify = { title: session.title, startsAt: session.starts_at, locationName: session.location_name };
  if (session.host_id) {
    const { data: teacherHost } = await supabase.from("hosts").select("email").eq("id", session.host_id).single();
    if (teacherHost?.email !== KIMBERLEY_EMAIL) {
      notifyHostCancelled({ hostId: session.host_id, role: "teacher", session: sessionForNotify }).catch((e) => console.error("Teacher cancel-notify error:", e));
    }
  }
  if (session.gem_host_id) {
    notifyHostCancelled({ hostId: session.gem_host_id, role: "gem", session: sessionForNotify }).catch((e) => console.error("GEM cancel-notify error:", e));
  }

  // Email every affected attendee — fire and forget, don't block the response.
  if ((holds ?? []).length > 0 && process.env.RESEND_API_KEY) {
    const userIds = Array.from(new Set((holds ?? []).map((h) => h.user_id)));
    const { data: attendees } = await supabase
      .from("attendees")
      .select("auth_user_id, name, email")
      .in("auth_user_id", userIds);

    const startDate = new Date(session.starts_at);
    const dateStr = startDate.toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "long", day: "numeric", month: "long" }) +
      " at " + startDate.toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit", hour12: true });

    const resend = new Resend(process.env.RESEND_API_KEY);
    for (const a of attendees ?? []) {
      if (!a.email) continue;
      const firstName = a.name?.split(" ")[0] ?? "there";
      resend.emails.send({
        from: "Stretchy <hello@stretchy.social>",
        to: a.email,
        bcc: "kimberley@stretchyyoga.co.nz",
        reply_to: "kimberley@stretchyyoga.co.nz",
        subject: `This one's not going ahead — ${session.title}`,
        headers: { "X-Priority": "1", "Importance": "High" },
        text: `Hi ${firstName},\n\nSorry — ${session.title} (${dateStr}) at ${session.location_name} has been cancelled. Nothing was charged, and your card authorisation has been fully released.\n\nBrowse other sessions: https://stretchyyoga.co.nz/sessions\n\nStretchy`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#F7F0E8;padding:32px;border-radius:16px;"><h1 style="font-size:26px;font-weight:900;color:#14110F;margin:0 0 8px;">This one&rsquo;s not going ahead. 😔</h1><p style="color:#555;font-size:15px;margin:0 0 20px;">Hi ${firstName} — sorry, <strong>${session.title}</strong> (${dateStr}) at ${session.location_name} has been cancelled.</p><div style="background:white;border-radius:12px;padding:18px;margin-bottom:16px;"><p style="font-size:14px;font-weight:700;color:#14110F;margin:0 0 4px;">Nothing was charged. ✓</p><p style="font-size:13px;color:#888;margin:0;">Your card authorisation has been fully released.</p></div><a href="https://stretchyyoga.co.nz/sessions" style="display:inline-block;background:#14110F;color:#F7F0E8;text-decoration:none;font-size:13px;font-weight:700;padding:12px 22px;border-radius:8px;">Browse other sessions →</a><p style="font-size:11px;color:#AAA;text-align:center;margin:24px 0 0;">Made with Love by <a href="https://studiodawn.org" style="color:#AAA;">Studio Dawn</a></p></div>`,
      }).catch((e: unknown) => console.error("Cancellation notify email error:", e));
    }
  }

  return NextResponse.json({ ok: true, releasedHolds: (holds ?? []).length });
}
