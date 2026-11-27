import { NextRequest, NextResponse } from "next/server";
import { signedInUser, serviceClient } from "@/lib/routeAuth";
import { calledOffShout } from "@/lib/shoutCancel";
import { phase } from "@/lib/sessionTimes";

// GET /api/shout/again?id={shoutId} — after we called a session off, the giver
// picks re-book or refund. Returns the shout and the sessions they can re-book
// their mate into. SOCIAL_BOOKING_BRIEF.md section 4, "Cancelling".
export const dynamic = "force-dynamic";

const isUuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

export async function GET(request: NextRequest) {
  const user = await signedInUser(request);
  if (!user) return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id");
  if (!isUuid(id)) return NextResponse.json({ error: "Missing shout" }, { status: 400 });
  const admin = serviceClient();
  const shout = await calledOffShout(admin, id, user.id);
  if (!shout) return NextResponse.json({ error: "Shout not found" }, { status: 404 });

  const [{ data: old }, { data: upcoming }] = await Promise.all([
    admin.from("sessions").select("title, starts_at").eq("id", shout.session_id).maybeSingle(),
    admin
      .from("sessions")
      .select("id, title, starts_at, location_name, location_address, state")
      .in("state", ["open", "confirmed"])
      .eq("is_draft", false)
      .gt("starts_at", new Date(Date.now() + 60 * 60 * 1000).toISOString())
      .neq("id", shout.session_id)
      .order("starts_at", { ascending: true })
      .limit(12),
  ]);
  return NextResponse.json({
    shout: { id: shout.id, name: shout.recipient_name, state: shout.state, amountCents: shout.amount_cents, refundCents: shout.refund_cents, sessionTitle: old?.title ?? "", startsAt: old?.starts_at ?? null },
    sessions: (upcoming ?? [])
      .filter((s) => phase(s.starts_at, s.state) !== "after2")
      .map(({ id, title, starts_at, location_name, location_address }) => ({ id, title, starts_at, location_name, location_address })),
  });
}
