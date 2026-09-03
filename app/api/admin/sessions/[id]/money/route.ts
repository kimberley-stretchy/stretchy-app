import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET /api/admin/sessions/[id]/money — settlement breakdown for one session.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  const { id } = await params;
  const admin = getAdmin();

  const { data: session, error } = await admin
    .from("sessions")
    .select("id, title, starts_at, location_name, cost_lines, revenue_target, host_id, gem_host_id, host_paid_at, state")
    .eq("id", id)
    .single();

  if (error || !session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const [{ data: holds }, { data: hostRows }] = await Promise.all([
    admin.from("holds").select("id, state, amount_charged_nzd").eq("session_id", id).in("state", ["charged", "confirmed", "active"]),
    (() => {
      const ids = [session.host_id, session.gem_host_id].filter(Boolean) as string[];
      return ids.length
        ? admin.from("hosts").select("id, name").in("id", ids)
        : Promise.resolve({ data: [] as { id: string; name: string }[] });
    })(),
  ]);

  const hostNameById = new Map((hostRows ?? []).map((h) => [h.id, h.name]));
  const mats = holds?.length ?? 0;
  const collected = (holds ?? []).reduce((sum, h) => sum + (h.amount_charged_nzd ? h.amount_charged_nzd / 100 : 0), 0);

  const costLines: { role: string; name: string; amount: number }[] = Array.isArray(session.cost_lines) ? session.cost_lines : [];
  const lineItems = costLines.map((l) => ({
    role: l.role,
    who:
      l.role === "Teacher" && session.host_id ? hostNameById.get(session.host_id) ?? l.name :
      l.role === "GEM" && session.gem_host_id ? hostNameById.get(session.gem_host_id) ?? l.name :
      l.name,
    amount: l.amount,
  }));
  const paidOut = lineItems.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);

  return NextResponse.json({
    session: {
      id: session.id,
      title: session.title,
      startsAt: session.starts_at,
      locationName: session.location_name,
      state: session.state,
      hostPaidAt: session.host_paid_at,
    },
    collected,
    paidOut,
    mats,
    lineItems,
  });
}

// POST /api/admin/sessions/[id]/money — mark payouts released for this session.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  const { id } = await params;
  const admin = getAdmin();

  const { error } = await admin
    .from("sessions")
    .update({ host_paid_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
