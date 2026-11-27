import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { signedInUser, serviceClient } from "@/lib/routeAuth";
import { shoutQuote, shoutsLeft, savedCard, checkShoutInput, startShout, myShouts } from "@/lib/shout";
import { calledOffShout } from "@/lib/shoutCancel";
import { phase } from "@/lib/sessionTimes";

// GET  /api/shout?sessionId=…[&rebook=…]  → today's price for one place, saved card, how many left,
//      my shouts here, whether it's still free to cancel, and (re-booking) the called-off shout's details
// POST /api/shout  { sessionId, name, deliver, email?, permission?, hidePrice?, note?, useSavedCard }
//      → { shoutId, clientSecret, status, amountCents }  (status "succeeded" = paid with the saved card)
// Shout a mate, SOCIAL_BOOKING_BRIEF.md section 4. Anyone signed in can shout.
export const dynamic = "force-dynamic";

const stripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });
const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

export async function GET(request: NextRequest) {
  const user = await signedInUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const sessionId = request.nextUrl.searchParams.get("sessionId");
  if (!isUuid(sessionId)) return NextResponse.json({ error: "Missing session" }, { status: 400 });
  const admin = serviceClient();
  const rebookId = request.nextUrl.searchParams.get("rebook");
  const [quote, left, mine, { data: attendee }, { data: session }, old] = await Promise.all([
    shoutQuote(admin, sessionId),
    shoutsLeft(admin, sessionId, user.id),
    myShouts(admin, sessionId, user.id),
    admin.from("attendees").select("stripe_customer_id").eq("auth_user_id", user.id).maybeSingle(),
    admin.from("sessions").select("starts_at, state").eq("id", sessionId).maybeSingle(),
    isUuid(rebookId) ? calledOffShout(admin, rebookId, user.id) : Promise.resolve(null),
  ]);
  const card = await savedCard(stripe(), attendee?.stripe_customer_id);
  return NextResponse.json({
    open: !("error" in quote),
    closedReason: "error" in quote ? quote.error : null,
    amountCents: "error" in quote ? null : quote.amountCents,
    savedCard: card ? { brand: card.brand, last4: card.last4 } : null,
    shoutsLeft: left,
    myShouts: mine,
    freeCancel: !!session && phase(session.starts_at, session.state) === "before36",
    rebook: old && old.state === "cancelled" && old.session_id !== sessionId
      ? { id: old.id, name: old.recipient_name, deliver: old.deliver, email: old.recipient_email, hidePrice: old.hide_price, note: old.note }
      : null,
  });
}

export async function POST(request: NextRequest) {
  const user = await signedInUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const checked = checkShoutInput(body);
  if ("error" in checked) return NextResponse.json({ error: checked.error }, { status: 400 });
  if (!isUuid(checked.ok.sessionId)) return NextResponse.json({ error: "Missing session" }, { status: 400 });

  const admin = serviceClient();
  const s = stripe();

  // The giver's attendee record and Stripe customer (made if new).
  let { data: attendee } = await admin.from("attendees").select("id, name, email, stripe_customer_id").eq("auth_user_id", user.id).maybeSingle();
  if (!attendee) {
    const { data } = await admin
      .from("attendees")
      .insert({ auth_user_id: user.id, name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Stretchy Member", email: user.email! })
      .select("id, name, email, stripe_customer_id")
      .single();
    attendee = data;
  }
  if (!attendee) return NextResponse.json({ error: "Couldn’t find your account. Please try again." }, { status: 500 });
  let customerId = attendee.stripe_customer_id as string | null;
  const customerOk = customerId ? await s.customers.retrieve(customerId).then((c) => !("deleted" in c && c.deleted)).catch(() => false) : false;
  if (!customerOk) {
    const customer = await s.customers.create({ email: user.email!, name: attendee.name ?? undefined, metadata: { supabase_user_id: user.id, attendee_id: attendee.id } });
    customerId = customer.id;
    await admin.from("attendees").update({ stripe_customer_id: customerId }).eq("id", attendee.id);
  }

  const r = await startShout(admin, s, { userId: user.id, attendeeId: attendee.id, customerId: customerId!, name: attendee.name ?? "" }, checked.ok, body.useSavedCard === true);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status ?? 400 });
  return NextResponse.json(r);
}
