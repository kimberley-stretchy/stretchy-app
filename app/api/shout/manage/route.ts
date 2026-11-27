import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { signedInUser, serviceClient } from "@/lib/routeAuth";
import { giverCancelShout, resendShout, refundCalledOff } from "@/lib/shoutCancel";

// POST /api/shout/manage { shoutId, action }  — the giver's "Manage my shout".
//   cancel  up to 36 hrs out: full refund, the link stops working
//   resend  email it to their mate again (once)
//   refund  after we called the session off: refund instead of re-booking
// SOCIAL_BOOKING_BRIEF.md section 4, "Cancelling".
export const dynamic = "force-dynamic";

const stripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });
const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

export async function POST(request: NextRequest) {
  const user = await signedInUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (!isUuid(body.shoutId)) return NextResponse.json({ error: "Missing shout" }, { status: 400 });
  const admin = serviceClient();

  const r =
    body.action === "cancel" ? await giverCancelShout(admin, stripe(), body.shoutId, user.id) :
    body.action === "resend" ? await resendShout(admin, body.shoutId, user.id) :
    body.action === "refund" ? await refundCalledOff(admin, stripe(), body.shoutId, user.id, "choice") :
    ({ error: "Unknown action", status: 400 } as const);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json({ ok: true });
}
