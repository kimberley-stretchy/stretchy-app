import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { serviceClient } from "@/lib/routeAuth";
import { mateCantMake } from "@/lib/shoutCancel";

// POST /api/shout/cant/{code} — the mate taps "I can't make it" on the claim
// page. Up to 36 hrs out the place is released and the giver refunded; inside
// 36 hrs the giver is told and can pass the link on. No login needed (they
// have the one-time link). SOCIAL_BOOKING_BRIEF.md section 4.
export const dynamic = "force-dynamic";

export async function POST(_request: NextRequest, { params }: { params: { code: string } }) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-04-10" });
  const r = await mateCantMake(serviceClient(), stripe, params.code);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r);
}
