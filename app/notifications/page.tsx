"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SMark from "@/components/SMark";
import { createClient } from "@/lib/supabase/client";
import { calculatePrice } from "@/lib/pricing";

const TYPE_COLORS: Record<string, string> = {
  yoga: "#902F8A", pilates: "#0000FF", breath: "#29ABE2",
  sound: "#716F39", flow: "#FCBB16", run: "#E96709", hiit: "#902F8A",
};

type HoldWithSession = {
  id: string;
  state: string;
  created_at: string;
  sessions: {
    id: string;
    title: string;
    starts_at: string;
    movement_type: string;
    state: string;
    cost_base: number;
    revenue_target: number;
    min_attendees: number;
    max_attendees: number;
    current_holds: number;
    location_name: string;
  } | null;
};

function statusInfo(sessionState: string, holdState: string) {
  if (holdState === "charged") return { label: "CHARGED · LOCKED IN", color: "#716F39", bg: "rgba(76,175,130,0.10)" };
  if (holdState === "released") return { label: "RELEASED · $0 CHARGED", color: "#888", bg: "rgba(26,26,26,0.06)" };
  if (sessionState === "cancelled") return { label: "SESSION CANCELLED", color: "#888", bg: "rgba(26,26,26,0.06)" };
  if (sessionState === "confirmed" || sessionState === "locked") return { label: "GOING AHEAD ✓", color: "#716F39", bg: "rgba(76,175,130,0.10)" };
  return { label: "HOLDING", color: "#FCBB16", bg: "rgba(255,209,102,0.15)" };
}

export default function NotificationsPage() {
  const router = useRouter();
  const [holds, setHolds] = useState<HoldWithSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session) { router.push("/login"); return; }

      const { data } = await supabase
        .from("holds")
        .select(`
          id, state, created_at,
          sessions(id, title, starts_at, movement_type, state, cost_base, revenue_target, min_attendees, max_attendees, location_name)
        `)
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) setHolds(data as unknown as HoldWithSession[]);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [router]);

  // Fetch live hold counts for sessions
  const [holdCounts, setHoldCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!holds.length) return;
    const sessionIds = holds.map(h => h.sessions?.id).filter(Boolean) as string[];
    if (!sessionIds.length) return;
    Promise.all(
      sessionIds.map((id) =>
        fetch(`/api/sessions/${id}`).then((r) => (r.ok ? r.json() : null)).catch(() => null)
      )
    ).then((sessions) => {
      const counts: Record<string, number> = {};
      sessions.forEach((s) => { if (s) counts[s.id] = s.current_holds; });
      setHoldCounts(counts);
    });
  }, [holds]);

  const upcoming = holds.filter(h => h.sessions && new Date(h.sessions.starts_at) > new Date() && h.state === "active");
  const past     = holds.filter(h => !upcoming.includes(h));

  return (
    <main className="min-h-screen bg-cream pb-20">
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <Link href="/sessions" className="text-ink"><SMark size={28} /></Link>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">My Holds</p>
        <Link href="/sessions" className="text-muted hover:text-ink text-lg transition-colors">×</Link>
      </nav>

      <div className="px-4 max-w-lg mx-auto">
        <h1 className="font-display font-bold text-ink mb-5" style={{ fontSize: "clamp(36px,10vw,48px)", letterSpacing: "-0.03em", lineHeight: 1 }}>
          Your sessions.
        </h1>

        {loading && (
          <p className="font-mono text-xs text-muted text-center py-10">Loading…</p>
        )}

        {!loading && holds.length === 0 && (
          <div className="bg-white rounded-card border-2 border-ink p-8 text-center">
            <p className="text-3xl mb-3">🧘</p>
            <p className="font-bold text-ink mb-2">No holds yet</p>
            <p className="text-sm text-muted mb-5">Browse sessions and hold your first spot — it's free until the session is confirmed.</p>
            <Link href="/sessions" className="font-semibold px-6 py-3 rounded-pill" style={{ backgroundColor: "#14110F", color: "#F7F0E8" }}>
              Browse sessions →
            </Link>
          </div>
        )}

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div className="mb-6">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-muted mb-3">Coming up</p>
            <div className="space-y-3">
              {upcoming.map(h => <HoldCard key={h.id} hold={h} currentHolds={holdCounts[h.sessions?.id ?? ""] ?? h.sessions?.current_holds ?? 0} />)}
            </div>
          </div>
        )}

        {/* Past */}
        {past.length > 0 && (
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-muted mb-3">Past & completed</p>
            <div className="space-y-3">
              {past.map(h => <HoldCard key={h.id} hold={h} currentHolds={holdCounts[h.sessions?.id ?? ""] ?? h.sessions?.current_holds ?? 0} />)}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function HoldCard({ hold: h, currentHolds }: { hold: HoldWithSession; currentHolds: number }) {
  const s = h.sessions;
  if (!s) return null;

  const typeColor = TYPE_COLORS[s.movement_type] ?? "#888";
  const startDate = new Date(s.starts_at);
  const dayStr = startDate.toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "short", day: "numeric", month: "short" }).toUpperCase();
  const timeStr = startDate.toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
  const isFuture = startDate > new Date();
  const status = statusInfo(s.state, h.state);

  const effectiveHolds = Math.max(currentHolds, s.min_attendees);
  const currentPrice = calculatePrice(s.cost_base, s.revenue_target, effectiveHolds);

  return (
    <Link href={isFuture && h.state === "active" ? `/hold/${s.id}` : `/sessions/${s.id}`} className="block bg-white rounded-card border-2 border-ink p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5" style={{ backgroundColor: typeColor }}>
          {s.movement_type.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-ink leading-tight">{s.title}</p>
          <p className="font-mono text-xs text-muted mt-0.5">{dayStr} · {timeStr}</p>
          <p className="text-xs text-muted mt-0.5">{s.location_name}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="font-mono text-xs font-bold px-2 py-1 rounded-pill"
              style={{ background: status.bg, color: status.color }}>
              {status.label}
            </span>
            {h.state === "active" && isFuture && (
              <span className="font-mono text-xs font-bold" style={{ color: "#FCBB16" }}>
                ${currentPrice.toFixed(2)}
              </span>
            )}
          </div>
        </div>
        <span className="text-muted text-lg flex-shrink-0">›</span>
      </div>
    </Link>
  );
}
