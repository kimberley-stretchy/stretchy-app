import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireHost } from "@/lib/hostAuth";
import { liveTeamNotices } from "@/lib/teamNotices";

// GET /api/host/notices — team notices from Stretchy HQ, for approved teachers and GEMs.
export async function GET(request: NextRequest) {
  const gate = await requireHost(request);
  if ("error" in gate) return gate.error;
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
  return NextResponse.json({ notices: await liveTeamNotices(admin) });
}
