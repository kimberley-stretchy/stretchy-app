import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// GET /api/australia/seen — is this visitor in Australia? (Vercel adds the
// country and state to every request.) The Australia pop-up asks this once.
// POST — count one Australian visitor (state only, no personal data), sent
// the first time the pop-up shows on a device. Local runs can pretend with ?geo=AU.
function where(request: NextRequest) {
  const test = process.env.NODE_ENV !== "production" ? request.nextUrl.searchParams.get("geo") : null;
  const country = test ?? request.headers.get("x-vercel-ip-country");
  const state = test ? "NSW" : request.headers.get("x-vercel-ip-country-region");
  return { australia: country === "AU", state: country === "AU" ? state : null };
}

export async function GET(request: NextRequest) {
  return NextResponse.json(where(request), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const w = where(request);
  if (!w.australia) return NextResponse.json({ ok: true });
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  await admin.from("au_visits").insert({ state: w.state }).then(() => {}, () => {});
  return NextResponse.json({ ok: true });
}
