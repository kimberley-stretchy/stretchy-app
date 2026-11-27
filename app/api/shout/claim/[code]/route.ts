import { NextRequest, NextResponse } from "next/server";
import { serviceClient } from "@/lib/routeAuth";
import { claimShout } from "@/lib/shout";

// POST /api/shout/claim/{code} { name, email, careNote?, agreed } — the mate
// claims the place they were shouted. No card, no login needed first.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { code: string } }) {
  const body = await request.json().catch(() => ({}));
  const r = await claimShout(serviceClient(), params.code, body);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
  return NextResponse.json(r);
}
