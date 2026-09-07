import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Stripe from "stripe";

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });
}

// POST /api/stripe/setup-intent — creates (or reuses) a Stripe customer and a SetupIntent
// for saving a card now, to be charged later at lock-in. No charge happens here.
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
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      user = data.user;
    }
  }
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });

  const admin = getAdmin();
  const stripe = getStripe();

  const { data: attendee } = await admin
    .from("attendees")
    .select("id, stripe_customer_id, name, email")
    .eq("auth_user_id", user.id)
    .single();

  async function createFreshCustomer() {
    const customer = await stripe.customers.create({
      email: user!.email!,
      name: attendee?.name ?? user!.user_metadata?.full_name ?? undefined,
      metadata: { supabase_user_id: user!.id },
    });
    if (attendee) {
      await admin.from("attendees").update({ stripe_customer_id: customer.id }).eq("id", attendee.id);
    }
    return customer.id;
  }

  let stripeCustomerId = attendee?.stripe_customer_id;
  if (!stripeCustomerId) {
    try {
      stripeCustomerId = await createFreshCustomer();
    } catch (err) {
      console.error("Stripe customer creation error:", err);
      return NextResponse.json({ error: "Could not set up payment — please try again." }, { status: 500 });
    }
  }

  let setupIntent;
  try {
    setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
    });
  } catch (err) {
    // A saved customer ID from a different Stripe mode (e.g. switching
    // live<->test keys) won't exist here — recreate the customer once and
    // retry, instead of failing outright with an opaque error.
    const isMissingCustomer = err instanceof Stripe.errors.StripeError && err.code === "resource_missing";
    if (!isMissingCustomer) {
      console.error("SetupIntent creation error:", err);
      const message = err instanceof Error ? err.message : "Could not set up payment — please try again.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
    try {
      stripeCustomerId = await createFreshCustomer();
      setupIntent = await stripe.setupIntents.create({
        customer: stripeCustomerId,
        payment_method_types: ["card"],
      });
    } catch (retryErr) {
      console.error("SetupIntent retry error:", retryErr);
      const message = retryErr instanceof Error ? retryErr.message : "Could not set up payment — please try again.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json({ clientSecret: setupIntent.client_secret });
}
