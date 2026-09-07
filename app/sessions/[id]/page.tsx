"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import SMark from "@/components/SMark";
import HowToStretchy from "@/components/HowToStretchy";
import HoldModal from "@/components/HoldModal";
import { createClient } from "@/lib/supabase/client";
import { calculatePrice, formatPrice } from "@/lib/pricing";

const TYPE_COLORS: Record<string, string> = {
  yoga: "#902F8A", pilates: "#0000FF", breath: "#29ABE2",
  sound: "#716F39", flow: "#FCBB16", run: "#E96709", hiit: "#902F8A",
};
const TYPE_LABELS: Record<string, string> = {
  yoga: "YOGA", pilates: "PILATES", breath: "BREATH",
  sound: "SOUND", flow: "FLOW", run: "RUN", hiit: "HIIT",
};

type Session = {
  id: string;
  title: string;
  description: string | null;
  movement_type: string;
  starts_at: string;
  ends_at: string;
  duration_mins: number;
  location_name: string;
  location_address: string;
  getting_there: string | null;
  cost_base: number;
  revenue_target: number;
  min_attendees: number;
  max_attendees: number;
  current_holds: number;
  state: string;
  social_stretch_venue: string | null;
  social_stretch_note: string | null;
  what_to_bring: string[] | null;
};

// Price ladder — a short list of evenly-stepped rows, not a continuous curve,
// per the design system's pricing component (10-pricing-component.png).
function ladderRows(min: number, max: number, costBase: number, revenueTarget: number) {
  const range = Math.max(1, max - min);
  const step = Math.max(1, Math.round(range / 8));
  const rows: { n: number; price: number }[] = [];
  for (let n = min; n < max; n += step) {
    rows.push({ n, price: calculatePrice(costBase, revenueTarget, n) });
  }
  rows.push({ n: max, price: calculatePrice(costBase, revenueTarget, max) });
  return rows.filter((r, i, arr) => arr.findIndex((x) => x.n === r.n) === i);
}

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [holding, setHolding] = useState(false);
  const [held, setHeld] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!params.id) return;

    let cancelled = false;
    function loadSession(showLoading: boolean) {
      if (showLoading) setLoading(true);
      fetch(`/api/sessions/${params.id}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: Session | null) => {
          if (cancelled) return;
          setSession(data);
          setLoading(false);
        })
        .catch(() => { if (!cancelled) setLoading(false); });
    }

    loadSession(true);
    // Price and spots-to-go depend on live hold counts — keep this in sync
    // while someone's actually looking at the page, not just on next visit.
    const interval = setInterval(() => loadSession(false), 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [params.id]);

  function handleHold() {
    if (!accessToken) {
      router.push(`/login?next=/sessions/${params.id}`);
      return;
    }
    setShowHoldModal(true);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center">
        <p className="font-mono text-xs text-muted">LOADING…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-cream px-6 pt-6">
        <Link href="/sessions" className="font-mono text-xs font-bold uppercase tracking-widest text-muted">← Back</Link>
        <p className="mt-10 text-center text-muted text-sm">Session not found.</p>
      </main>
    );
  }

  const s = session;
  const typeColor = TYPE_COLORS[s.movement_type] ?? "#888";
  const typeLabel = TYPE_LABELS[s.movement_type] ?? s.movement_type.toUpperCase();
  const holds = s.current_holds || 0;
  const confirmed = holds >= s.min_attendees;
  const currentN = Math.min(Math.max(holds, s.min_attendees), s.max_attendees);
  const currentPrice = calculatePrice(s.cost_base, s.revenue_target, currentN);
  const floorPrice = calculatePrice(s.cost_base, s.revenue_target, s.max_attendees);
  const spotsToMin = Math.max(0, s.min_attendees - holds);
  const rows = ladderRows(s.min_attendees, s.max_attendees, s.cost_base, s.revenue_target);

  const startDate = new Date(s.starts_at);
  const weekdayStr = startDate.toLocaleDateString("en-NZ", { weekday: "short" }).toUpperCase();
  const timeStr = startDate.toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
  const durationLabel = s.duration_mins >= 60 ? `${s.duration_mins / 60}HR` : `${s.duration_mins} MIN`;

  return (
    <main className="min-h-screen bg-cream pb-36 max-w-lg mx-auto">
      <nav className="flex items-center justify-between px-4 py-4">
        <Link href="/sessions" className="text-ink"><SMark size={28} /></Link>
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-pill" style={{ background: "#E6F5EC", color: "#2E7A52" }}>
          ✓ Vetted host
        </span>
        <button className="w-10 h-10 rounded-full border-2 border-ink flex items-center justify-center text-ink text-base">
          ♡
        </button>
      </nav>

      <div className="px-4">
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-pill border-2 border-ink text-ink">
            {weekdayStr} · {timeStr}
          </span>
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-pill border-2 border-ink text-ink">
            {durationLabel}
          </span>
          <span className="font-mono text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-pill border-2" style={{ color: typeColor, borderColor: typeColor }}>
            {typeLabel}
          </span>
        </div>
        <h1 className="font-display font-bold text-ink mb-2" style={{ fontSize: "clamp(32px, 9vw, 44px)", letterSpacing: "-0.03em", lineHeight: 0.95 }}>
          {s.title}
        </h1>
        <p className="text-sm text-muted mb-3">{s.location_name}</p>
        {s.description && <p className="text-sm text-ink/75 leading-relaxed">{s.description}</p>}
      </div>

      {/* Pricing card — cream + purple accent, price ladder not a curve */}
      <div className="mx-4 my-5 bg-white rounded-card border-2 border-ink p-5">
        <p className="font-mono text-xs font-bold mb-3" style={{ color: confirmed ? "#716F39" : "#E96709" }}>
          {confirmed ? `● Going ahead · ${holds} holding` : `○ ${spotsToMin} more ${spotsToMin === 1 ? "person" : "people"} to confirm`}
        </p>

        <div className="flex gap-1.5 flex-wrap mb-4">
          {Array.from({ length: s.min_attendees }).map((_, i) => (
            <div key={i} className="w-3.5 h-3.5 rounded-full" style={{ background: i < holds ? "#902F8A" : "#E1D5C6" }} />
          ))}
          {holds > s.min_attendees && (
            <span className="font-mono text-xs font-bold self-center" style={{ color: "#902F8A" }}>+{holds - s.min_attendees}</span>
          )}
        </div>

        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted mb-1">
          {confirmed ? "Price now" : "Max you'll pay"}
        </p>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-mono font-extrabold text-ink" style={{ fontSize: 54, lineHeight: 1 }}>{formatPrice(currentPrice)}</span>
          <span className="font-mono text-xs font-bold text-muted">incl. GST</span>
        </div>
        {!confirmed && (
          <p className="font-mono text-[11px] font-bold text-muted mb-4">
            Price drops as the session fills — lowest {formatPrice(floorPrice)}
          </p>
        )}

        <div className="border-t-2 pt-4 mt-3" style={{ borderColor: "#E1D5C6" }}>
          <div className="flex justify-between font-mono text-[10px] font-bold uppercase tracking-widest text-muted mb-2.5">
            <span>People</span>
            <span>Price each</span>
          </div>
          <div className="flex flex-col gap-2">
            {rows.map((r) => {
              const isCurrent = r.n === currentN;
              const barWidth = 8 + ((r.n - s.min_attendees) / Math.max(1, s.max_attendees - s.min_attendees)) * 92;
              return (
                <div key={r.n} className="flex items-center gap-2.5">
                  <span className="font-mono text-[11px] text-ink/55 w-12 flex-shrink-0">
                    {r.n === s.min_attendees ? `${r.n} min` : r.n === s.max_attendees ? `${r.n} max` : r.n}
                  </span>
                  <div className="flex-1 h-2 rounded-pill overflow-hidden" style={{ background: "#F0E9E0" }}>
                    <div
                      className="h-full rounded-pill"
                      style={{ width: `${barWidth}%`, background: isCurrent ? "#902F8A" : "#E1D5C6" }}
                    />
                  </div>
                  <span className={`font-mono text-sm ${isCurrent ? "font-extrabold" : "font-bold text-ink/55"}`} style={isCurrent ? { color: "#902F8A" } : undefined}>
                    {formatPrice(r.price)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Where */}
      <div className="mx-4 mb-5 rounded-card border-2 border-ink p-5" style={{ background: "#FCBB16" }}>
        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink/50 mb-2.5">Where</p>
        <p className="font-bold text-sm text-ink mb-1">{s.location_name}</p>
        {s.location_address && <p className="text-xs text-ink/65 mb-2">{s.location_address}</p>}
        {s.getting_there && <p className="text-xs text-ink/65 leading-relaxed">{s.getting_there}</p>}
      </div>

      {/* Social Stretch */}
      {s.social_stretch_venue && (
        <div className="mx-4 mb-5 rounded-card border-2 border-ink p-5" style={{ background: "#902F8A" }}>
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "rgba(247,240,232,.55)" }}>
            Social Stretch after
          </p>
          <p className="text-sm font-bold text-cream mb-1.5">{s.social_stretch_venue}</p>
          <p className="text-xs leading-relaxed" style={{ color: "rgba(247,240,232,.8)" }}>
            Pay your own way — coffee &amp; food after. Everyone welcome.
          </p>
        </div>
      )}

      {/* What to bring */}
      {s.what_to_bring && s.what_to_bring.length > 0 && (
        <div className="mx-4 mb-5 bg-white rounded-card border-2 border-ink p-5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted mb-2.5">Bring</p>
          <div className="flex flex-wrap gap-2">
            {s.what_to_bring.map((item) => (
              <span key={item} className="px-3 py-1.5 rounded-pill font-mono text-[11px] font-bold text-ink" style={{ background: "rgba(20,17,15,.06)" }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mx-4 mb-6">
        <HowToStretchy />
      </div>

      {/* Sticky hold CTA */}
      <div className="fixed bottom-0 left-0 right-0 border-t-2 border-ink px-5 pt-4 pb-6 flex flex-col gap-2" style={{ background: "rgba(247,240,232,.97)", backdropFilter: "blur(12px)" }}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <span className="font-mono font-extrabold text-ink" style={{ fontSize: 26 }}>{formatPrice(currentPrice)}</span>
            <span className="font-mono text-[10px] text-muted ml-1.5">incl. GST</span>
          </div>
          <span className="font-mono text-[10px] font-bold" style={{ color: confirmed ? "#716F39" : "#E96709" }}>
            {confirmed ? `${holds} HELD · GOING AHEAD` : `${spotsToMin} MORE TO CONFIRM`}
          </span>
        </div>
        {!accessToken ? (
          <Link
            href={`/login?next=/sessions/${params.id}`}
            className="w-full text-center rounded-pill py-4 font-semibold"
            style={{ background: "#14110F", color: "#F7F0E8", fontSize: 16 }}
          >
            Log in to hold your place
          </Link>
        ) : (
          <button
            onClick={handleHold}
            disabled={holding || held}
            className="w-full rounded-pill py-4 font-semibold disabled:opacity-60"
            style={{ background: holding ? "rgba(20,17,15,.4)" : "#14110F", color: "#F7F0E8", fontSize: 16 }}
          >
            {holding ? "Saving your spot…" : held ? "✓ Held!" : "Hold my place — no charge yet"}
          </button>
        )}
        <p className="text-center font-mono text-[10px] font-bold text-muted">
          NO CHARGE YET · CANCEL ANY TIME UP TO 36H OUT
        </p>
      </div>

      {showHoldModal && session && accessToken && (
        <HoldModal
          sessionId={session.id}
          sessionTitle={session.title}
          accessToken={accessToken}
          onClose={() => setShowHoldModal(false)}
        />
      )}
    </main>
  );
}
