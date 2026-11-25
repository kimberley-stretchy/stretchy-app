import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { compPlace, VALID_EMAIL } from "@/lib/compPlace";
import { giftStatus } from "@/lib/giftLinks";

export const dynamic = "force-dynamic";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
}

// POST /api/gift/{code} — a friend claims their free place.
// Body: { sessionId, name, email, agreed }
export async function POST(request: NextRequest, { params }: { params: { code: string } }) {
  const admin = getAdmin();
  const body = await request.json().catch(() => ({}));
  const sessionId = String(body.sessionId ?? "");
  const name = String(body.name ?? "").trim().slice(0, 60);
  const email = String(body.email ?? "").trim().toLowerCase();

  if (!name) return NextResponse.json({ error: "Add your first name." }, { status: 400 });
  if (!VALID_EMAIL.test(email)) return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  if (body.agreed !== true) return NextResponse.json({ error: "Please tick to agree to the terms." }, { status: 400 });

  const status = await giftStatus(admin, params.code);
  if (status.kind === "missing") return NextResponse.json({ error: "This gift link doesn’t work. Check it with the person who sent it." }, { status: 404 });
  if (status.kind === "ended") return NextResponse.json({ error: "This gift link has ended." }, { status: 410 });
  if (status.kind === "used") return NextResponse.json({ error: `All of ${status.gift.from_name}’s gifted places have been claimed.` }, { status: 410 });
  if (!status.sessions.some((s) => s.id === sessionId)) {
    return NextResponse.json({ error: "That session isn’t available any more. Pick another one." }, { status: 400 });
  }

  // Save the claim first: one per email, and it stops a 5th friend sneaking in.
  const { data: use, error: useErr } = await admin
    .from("gift_link_uses")
    .insert({ code: status.gift.code, email, session_id: sessionId })
    .select("id")
    .single();
  if (useErr || !use) {
    const dup = useErr?.code === "23505";
    return NextResponse.json({ error: dup ? "You’ve already claimed a place with this link." : "Something went wrong. Please try again." }, { status: dup ? 409 : 500 });
  }
  const { count } = await admin.from("gift_link_uses").select("id", { count: "exact", head: true }).eq("code", status.gift.code);
  if ((count ?? 0) > status.gift.max_uses) {
    await admin.from("gift_link_uses").delete().eq("id", use.id);
    return NextResponse.json({ error: `All of ${status.gift.from_name}’s gifted places have been claimed.` }, { status: 410 });
  }

  const result = await compPlace(admin, { sessionId, email, name, quantity: 1, giftFrom: status.gift.from_name });
  if ("error" in result) {
    await admin.from("gift_link_uses").delete().eq("id", use.id);
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  await admin.from("gift_link_uses").update({ user_id: result.userId }).eq("id", use.id);

  return NextResponse.json({ ok: true, newAccount: result.newAccount });
}
