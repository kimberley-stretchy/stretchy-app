import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getUser(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  let { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      user = data.user;
    }
  }
  return user;
}

// PATCH /api/attendees/onboarding — save onboarding preferences, creating the attendee row if needed
export async function PATCH(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const body = await request.json();
  const {
    neighbourhoods,
    whenSuits,
    movingWithCareNote,
    movingWithCareDuration,
    movingWithCareEndsAt,
    showFirstNameToRoom,
    notifyGoingAhead,
    notifyPriceLocked,
    notifyNewNearby,
    stripePaymentMethodId,
  } = body;

  const admin = getAdmin();

  const { data: existing } = await admin
    .from("attendees")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  const updates: Record<string, unknown> = {
    neighbourhoods: neighbourhoods ?? [],
    when_suits: whenSuits ?? [],
    moving_with_care_note: movingWithCareNote || null,
    moving_with_care_duration: movingWithCareDuration || null,
    moving_with_care_ends_at: movingWithCareEndsAt || null,
    show_first_name_to_room: showFirstNameToRoom ?? true,
    notify_going_ahead: notifyGoingAhead ?? true,
    notify_price_locked: notifyPriceLocked ?? true,
    notify_new_nearby: notifyNewNearby ?? false,
  };
  if (stripePaymentMethodId) updates.stripe_pm_id = stripePaymentMethodId;

  if (existing) {
    const { error } = await admin.from("attendees").update(updates).eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, attendeeId: existing.id });
  }

  const { data: created, error } = await admin
    .from("attendees")
    .insert({
      auth_user_id: user.id,
      name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Stretchy Member",
      email: user.email!,
      avatar_url: user.user_metadata?.avatar_url ?? null,
      ...updates,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, attendeeId: created.id });
}
