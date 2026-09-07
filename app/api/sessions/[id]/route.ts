import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// The whole pricing mechanic depends on holds counts being live — without this,
// Next.js can statically cache this route's response per session id indefinitely
// (it has no cookies()/headers()/searchParams call to otherwise mark it dynamic).
export const dynamic = "force-dynamic";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/sessions/[id] — public session detail. Deliberately hand-picked, public-safe
// fields only: no cost_lines (what the teacher/venue/GEM are paid), no is_draft, no
// host_paid_at. The admin session list (/api/admin/sessions) carries all of that and is
// login-gated — this route exists so the public session page never has to touch it.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = getAdmin();

  const { data: session, error } = await admin
    .from("sessions")
    .select(`
      id, title, description, movement_type, starts_at, ends_at, duration_mins,
      location_name, location_address, getting_there,
      cost_base, revenue_target, min_attendees, max_attendees, state,
      social_stretch_venue, social_stretch_note, what_to_bring
    `)
    .eq("id", id)
    .eq("is_draft", false)
    .single();

  if (error || !session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  // Sum quantity, not row count — one hold row can represent more than one spot.
  const { data: activeHolds } = await admin
    .from("holds")
    .select("quantity")
    .eq("session_id", id)
    .eq("state", "active");

  const currentHolds = (activeHolds ?? []).reduce((sum, h) => sum + (h.quantity ?? 1), 0);

  // If the caller is logged in, tell the client whether they already hold a
  // spot here — the hold page otherwise always shows "Hold my place" even
  // for someone who's already in.
  let myHoldQuantity = 0;
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (token) {
    const { data: { user } } = await admin.auth.getUser(token);
    if (user) {
      const { data: myHold } = await admin
        .from("holds")
        .select("quantity")
        .eq("session_id", id)
        .eq("user_id", user.id)
        .eq("state", "active")
        .maybeSingle();
      myHoldQuantity = myHold?.quantity ?? 0;
    }
  }

  return NextResponse.json({ ...session, current_holds: currentHolds, my_hold_quantity: myHoldQuantity });
}
