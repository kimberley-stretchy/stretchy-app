import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { cookies } from "next/headers";
import { notifyBookingCardFailed } from "@/lib/cardFailed";

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
}

// POST /api/holds/failed — the booking pop-up calls this when the card step
// fails, so the person and HQ can be told. Body: { paymentIntentId }.
//
// The browser is not trusted for any detail: we read the payment from Stripe
// ourselves and only act if it really failed and really belongs to the person
// who is signed in. So nobody can use this to send emails about someone else.
export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  let { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (token) { const { data } = await supabase.auth.getUser(token); user = data.user; }
  }
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const paymentIntentId = typeof body.paymentIntentId === "string" ? body.paymentIntentId : "";
  if (!paymentIntentId.startsWith("pi_")) return NextResponse.json({ error: "Missing payment" }, { status: 400 });

  const admin = getAdmin();
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });

  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    // Must be this person's own booking attempt.
    const { data: attendee } = await admin.from("attendees").select("id").eq("auth_user_id", user.id).maybeSingle();
    if (!attendee || pi.metadata?.attendee_id !== attendee.id) {
      return NextResponse.json({ error: "Not your payment" }, { status: 403 });
    }
    const result = await notifyBookingCardFailed(admin, pi);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("Card-failed notify error:", e);
    // Never surface an error to the booking screen for this — it's a side note.
    return NextResponse.json({ ok: false });
  }
}
