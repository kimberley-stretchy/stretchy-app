import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminAuth";
import { cardFeesFor, type FeeHold } from "@/lib/stripeFees";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: (url, options) => fetch(url, { ...options, cache: "no-store" }) } }
  );
}

// The books start at go-live. Everything before this was test sessions run on
// Stripe test cards — no real money moved, so it's left out of the totals.
const BOOKS_START = new Date("2026-10-11T00:00:00+13:00").getTime();

// GET /api/admin/money — revenue overview: total incoming, and per session what was
// collected, the card fees Stripe took, what's owed out, and whether it's been settled.
export async function GET(request: NextRequest) {
  const authed = await requireAdmin(request);
  if ("error" in authed) return authed.error;

  const admin = getAdmin();
  const [{ data: sessions }, { data: holds }] = await Promise.all([
    admin.from("sessions").select("id, title, starts_at, location_name, state, cost_lines, host_paid_at"),
    admin.from("holds").select("*").eq("state", "charged"),
  ]);

  // Only payments for sessions in the books (and so only those Stripe charged for real).
  const inBooks = new Set((sessions ?? []).filter((s) => new Date(s.starts_at).getTime() >= BOOKS_START).map((s) => s.id));
  const booksHolds = (holds ?? []).filter((h) => inBooks.has(h.session_id));
  const fees = await cardFeesFor(admin, booksHolds as FeeHold[]);
  const collectedBy = new Map<string, number>();
  const feesBy = new Map<string, number>();
  for (const h of booksHolds) {
    if (!h.session_id) continue;
    collectedBy.set(h.session_id, (collectedBy.get(h.session_id) ?? 0) + (h.amount_charged_nzd ? h.amount_charged_nzd / 100 : 0));
    feesBy.set(h.session_id, (feesBy.get(h.session_id) ?? 0) + (fees.get(h.id) ?? 0) / 100);
  }

  const now = Date.now();
  const rows = (sessions ?? []).filter((s) => new Date(s.starts_at).getTime() >= BOOKS_START).map((s) => {
    const collected = collectedBy.get(s.id) ?? 0;
    const costLines: { amount: number }[] = Array.isArray(s.cost_lines) ? s.cost_lines : [];
    const plannedCosts = costLines.reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
    // Costs are only owed once a session has actually run. A session still to
    // come, or one that was cancelled, owes nothing — unless HQ has already
    // marked it paid, in which case that money did go out.
    const ran = new Date(s.starts_at).getTime() <= now && s.state !== "cancelled";
    const paidOut = ran || s.host_paid_at ? plannedCosts : 0;
    return {
      id: s.id,
      title: s.title,
      startsAt: s.starts_at,
      locationName: s.location_name,
      state: s.state,
      collected,
      cardFees: feesBy.get(s.id) ?? 0,
      paidOut,
      settled: !!s.host_paid_at,
    };
  }).sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());

  // Only sessions that actually ran/charged count toward money moved.
  const withMoney = rows.filter((r) => r.collected > 0 || r.paidOut > 0);
  const totalCollected = rows.reduce((s, r) => s + r.collected, 0);
  const owedOutstanding = rows.filter((r) => !r.settled).reduce((s, r) => s + r.paidOut, 0);
  const paidSettled = rows.filter((r) => r.settled).reduce((s, r) => s + r.paidOut, 0);
  const cardFees = rows.reduce((s, r) => s + r.cardFees, 0);

  return NextResponse.json({
    totals: {
      totalCollected,
      owedOutstanding,
      paidSettled,
      cardFees,
      net: totalCollected - cardFees - (owedOutstanding + paidSettled),
    },
    sessions: withMoney,
  });
}
