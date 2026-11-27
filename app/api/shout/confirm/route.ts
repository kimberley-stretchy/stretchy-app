import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { signedInUser, serviceClient } from "@/lib/routeAuth";
import { finaliseShout } from "@/lib/shout";

// POST /api/shout/confirm { shoutId } — after the card step: if Stripe says it's
// paid, hold the place and send the emails. Only for the person who shouted.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const user = await signedInUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const shoutId = typeof body.shoutId === "string" ? body.shoutId : "";
  const admin = serviceClient();
  const { data: mine } = await admin.from("shouts").select("giver_user_id").eq("id", shoutId).maybeSingle();
  if (!mine || mine.giver_user_id !== user.id) return NextResponse.json({ error: "Shout not found" }, { status: 404 });

  const r = await finaliseShout(admin, new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" }), shoutId);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
  const { code, deliver, recipient_name, recipient_email, state } = r.shout;
  return NextResponse.json({ code, deliver, name: recipient_name, email: recipient_email, state });
}
