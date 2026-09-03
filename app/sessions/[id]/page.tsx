"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import SMark from "@/components/SMark";
import HowToStretchy from "@/components/HowToStretchy";
import HoldModal from "@/components/HoldModal";
import { createClient } from "@/lib/supabase/client";
import { calculatePrice } from "@/lib/pricing";

const T = {
  black:  "#14110F",
  cream:  "#F7F0E8",
  yellow: "#FCBB16",
  olive:  "#716F39",
  blue:   "#0000FF",
  purple: "#902F8A",
  green:  "#716F39",
  orange: "#E96709",
  hold:   "#BFE3F0",
};

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

// Interactive price curve — drag/hover to explore prices at any attendance
function PriceCurveChart({ session: s }: { session: Session }) {
  const [hoverSpots, setHoverSpots] = useState<number | null>(null);
  const svgRef = React.useRef<SVGSVGElement>(null);

  const W = 320; const H = 80;
  const PAD = { left: 16, right: 16, top: 8, bottom: 28 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const ceiling = calculatePrice(s.cost_base, s.revenue_target, s.min_attendees);
  const floor   = calculatePrice(s.cost_base, s.revenue_target, s.max_attendees);
  const holds   = s.current_holds || 0;
  const range   = s.max_attendees - s.min_attendees;
  const priceRange = ceiling - floor;

  const toX = (n: number) => PAD.left + ((n - s.min_attendees) / range) * cW;
  const toY = (p: number) => PAD.top + (1 - Math.max(0, (p - floor) / Math.max(priceRange, 1))) * cH;

  const points = [];
  for (let n = s.min_attendees; n <= s.max_attendees; n++) {
    points.push({ x: toX(n), y: toY(calculatePrice(s.cost_base, s.revenue_target, n)), n });
  }
  const curvePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const activeSpots = hoverSpots ?? Math.min(Math.max(holds, s.min_attendees), s.max_attendees);
  const activePrice = calculatePrice(s.cost_base, s.revenue_target, activeSpots);
  const activeX = toX(activeSpots);
  const activeY = toY(activePrice);

  function handlePointer(e: React.MouseEvent<SVGElement> | React.TouchEvent<SVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0]?.clientX : e.clientX;
    if (clientX === undefined) return;
    const x = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, (x - PAD.left) / cW));
    const spots = Math.round(s.min_attendees + ratio * range);
    setHoverSpots(Math.min(Math.max(spots, s.min_attendees), s.max_attendees));
  }

  return (
    <div style={{ position: "relative", width: "100%" }}>
      {/* Hover tooltip */}
      <div style={{
        textAlign: "center", marginBottom: 8,
        fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
        color: hoverSpots ? T.yellow : "rgba(245,237,227,0.4)",
        letterSpacing: "0.08em", transition: "color .15s",
        minHeight: 18,
      }}>
        {hoverSpots
          ? `IF ${hoverSpots} JOIN → $${activePrice.toFixed(2)}`
          : "← DRAG TO EXPLORE PRICES →"}
      </div>
      <svg
        ref={svgRef}
        width="100%" viewBox={`0 0 ${W} ${H}`}
        style={{ cursor: "crosshair", touchAction: "none", display: "block" }}
        onMouseMove={handlePointer}
        onTouchMove={handlePointer}
        onMouseLeave={() => setHoverSpots(null)}
        onTouchEnd={() => setHoverSpots(null)}
      >
        {/* Curve fill */}
        <path d={curvePath + ` L ${points[points.length-1].x},${PAD.top+cH} L ${points[0].x},${PAD.top+cH} Z`} fill="rgba(255,209,102,0.10)" />
        {/* Curve line */}
        <path d={curvePath} fill="none" stroke={T.yellow} strokeWidth={1.5} strokeLinecap="round" />

        {/* Hover vertical line */}
        {hoverSpots && (
          <line x1={activeX} y1={PAD.top} x2={activeX} y2={PAD.top + cH} stroke="rgba(255,209,102,0.3)" strokeWidth={1} strokeDasharray="3,3" />
        )}

        {/* Active dot */}
        <circle cx={activeX} cy={activeY} r={hoverSpots ? 8 : 6} fill={T.yellow} style={{ transition: "r .1s" }} />
        <circle cx={activeX} cy={activeY} r={hoverSpots ? 16 : 10} fill="rgba(255,209,102,0.2)" />

        {/* Axis labels */}
        <text x={PAD.left} y={H - 8} fontSize={9} fontFamily="JetBrains Mono, monospace" fontWeight={700} fill="rgba(245,237,227,0.3)">
          {s.min_attendees} MIN · ${ceiling.toFixed(2)}
        </text>
        <text x={W - PAD.right} y={H - 8} fontSize={9} fontFamily="JetBrains Mono, monospace" fontWeight={700} fill="rgba(245,237,227,0.3)" textAnchor="end">
          {s.max_attendees} MAX · ${floor.toFixed(2)}
        </text>
      </svg>
    </div>
  );
}

export default function SessionDetailPage() {
  const params  = useParams<{ id: string }>();
  const router  = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [holding, setHolding] = useState(false);
  const [held, setHeld]       = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Detect auth state — fires immediately if session exists in storage
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/sessions/${params.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Session | null) => {
        setSession(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
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
      <main style={{ background: T.cream, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "rgba(26,26,26,0.35)" }}>LOADING…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main style={{ background: T.cream, minHeight: "100vh", padding: 24 }}>
        <Link href="/sessions" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: "rgba(26,26,26,0.45)", letterSpacing: "0.12em" }}>
          ← BACK
        </Link>
        <p style={{ marginTop: 40, textAlign: "center", color: "rgba(26,26,26,0.5)" }}>Session not found.</p>
      </main>
    );
  }

  const s = session;
  const typeColor   = TYPE_COLORS[s.movement_type] ?? "#888";
  const typeLabel   = TYPE_LABELS[s.movement_type] ?? s.movement_type.toUpperCase();
  const holds       = s.current_holds || 0;
  const confirmed   = holds >= s.min_attendees;
  const startingPrice = calculatePrice(s.cost_base, s.revenue_target, s.min_attendees);
  const currentPrice  = confirmed ? calculatePrice(s.cost_base, s.revenue_target, holds) : startingPrice;
  const floorPrice    = calculatePrice(s.cost_base, s.revenue_target, s.max_attendees);
  const spotsToMin    = Math.max(0, s.min_attendees - holds);

  const startDate = new Date(s.starts_at);
  const dayStr    = startDate.toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" });
  const timeStr   = startDate.toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
  const durationLabel = s.duration_mins >= 60
    ? `${s.duration_mins / 60}hr`
    : `${s.duration_mins} min`;

  return (
    <main style={{ background: T.cream, minHeight: "100vh", fontFamily: "'Space Grotesk', system-ui, sans-serif", paddingBottom: 120, maxWidth: 480, margin: "0 auto" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px" }}>
        <Link href="/sessions">
          <SMark size={28} className="text-ink" />
        </Link>
        {/* Vetted badge */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
          borderRadius: 999, background: "#E6F5EC", color: "#2E7A52",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
        }}>
          ✓ VETTED HOST
        </div>
        <button style={{
          width: 40, height: 40, borderRadius: "50%", border: "none",
          background: "rgba(26,26,26,0.06)", color: T.black, fontSize: 16, cursor: "pointer",
        }}>
          ♡
        </button>
      </div>

      {/* Title block */}
      <div style={{ padding: "8px 22px 18px" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <span style={{ background: "#E1D5C6", color: T.black, padding: "5px 11px", borderRadius: 999, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em" }}>
            {startDate.toLocaleDateString("en-NZ", { weekday: "short" }).toUpperCase()} · {timeStr}
          </span>
          <span style={{ background: "rgba(26,26,26,0.06)", color: T.black, padding: "5px 11px", borderRadius: 999, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em" }}>
            {durationLabel}
          </span>
          <span style={{ background: typeColor + "22", color: typeColor, padding: "5px 11px", borderRadius: 999, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em" }}>
            {typeLabel}
          </span>
        </div>
        <h1 style={{ fontSize: "clamp(28px,8vw,38px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 0.95, marginBottom: 8 }}>
          {s.title}
        </h1>
        <p style={{ fontSize: 14, color: "rgba(26,26,26,0.55)", marginBottom: 12 }}>
          {s.location_name}
        </p>
        {s.description && (
          <p style={{ fontSize: 15, lineHeight: 1.55, color: "rgba(26,26,26,0.75)" }}>
            {s.description}
          </p>
        )}
      </div>

      {/* Pricing engine */}
      <div style={{ margin: "0 16px 20px", background: T.black, borderRadius: 20, padding: "24px 20px 28px", color: T.cream }}>

        {/* Status — big and bold */}
        <div style={{
          fontFamily: "'Space Grotesk', system-ui, sans-serif", fontWeight: 800,
          fontSize: confirmed ? 22 : 26,
          letterSpacing: "-0.02em", lineHeight: 1.1,
          color: confirmed ? T.green : T.orange, marginBottom: 16,
        }}>
          {confirmed
            ? `● Session going ahead · ${holds} holding`
            : `○ ${spotsToMin} more ${spotsToMin === 1 ? "person" : "people"} to confirm session`}
        </div>

        {/* Holds pips */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {Array.from({ length: s.min_attendees }).map((_, i) => (
            <div key={i} style={{
              width: 14, height: 14, borderRadius: "50%",
              background: i < holds ? typeColor : "rgba(245,237,227,0.12)",
              transition: "background .3s",
            }} />
          ))}
          {holds > s.min_attendees && (
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: typeColor, alignSelf: "center" }}>
              +{holds - s.min_attendees}
            </span>
          )}
        </div>

        {/* Price — very large */}
        <div style={{ marginBottom: 6 }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: "rgba(245,237,227,0.4)", letterSpacing: "0.18em", marginBottom: 6 }}>
            {confirmed ? "PRICE NOW" : "MAX YOU'LL PAY"}
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 80, color: T.yellow, lineHeight: 0.9 }}>
              ${currentPrice.toFixed(2)}
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: "rgba(245,237,227,0.5)", fontWeight: 700 }}>
              incl. GST
            </span>
          </div>
        </div>

        {/* Drop copy */}
        {!confirmed && (
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 700, color: "rgba(245,237,227,0.35)", letterSpacing: "0.12em", marginBottom: 20 }}>
            PRICE DROPS AS THE SESSION FILLS — LOWEST ${floorPrice.toFixed(2)}
          </p>
        )}

        {/* Interactive price curve */}
        <PriceCurveChart session={s} />

      </div>

      {/* Where — yellow */}
      <div style={{ margin: "0 16px 20px", background: T.yellow, borderRadius: 20, padding: "20px" }}>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: "rgba(26,26,26,0.45)", letterSpacing: "0.18em", marginBottom: 10 }}>
          WHERE
        </p>
        <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{s.location_name}</p>
        {s.location_address && (
          <p style={{ fontSize: 13, color: "rgba(26,26,26,0.65)", marginBottom: 8 }}>{s.location_address}</p>
        )}
        {s.getting_there && (
          <p style={{ fontSize: 13, color: "rgba(26,26,26,0.65)", lineHeight: 1.5 }}>{s.getting_there}</p>
        )}
      </div>

      {/* Social stretch — purple */}
      {s.social_stretch_venue && (
        <div style={{ margin: "0 16px 20px", background: T.purple, borderRadius: 20, padding: "20px" }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: "rgba(245,237,227,0.55)", letterSpacing: "0.18em", marginBottom: 10 }}>
            SOCIAL STRETCH AFTER
          </p>
          <p style={{ fontSize: 15, fontWeight: 700, color: T.cream, marginBottom: 6 }}>{s.social_stretch_venue}</p>
          <p style={{ fontSize: 13, color: "rgba(245,237,227,0.8)", lineHeight: 1.5 }}>
            Pay your own way — coffee & food after. Everyone welcome.
          </p>
        </div>
      )}

      {/* What to bring */}
      {s.what_to_bring && s.what_to_bring.length > 0 && (
        <div style={{ margin: "0 16px 20px", background: "#fff", borderRadius: 20, padding: "20px" }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: "rgba(26,26,26,0.35)", letterSpacing: "0.18em", marginBottom: 10 }}>
            BRING
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {s.what_to_bring.map((item) => (
              <span key={item} style={{
                padding: "6px 12px", borderRadius: 999,
                background: "rgba(26,26,26,0.05)", color: T.black,
                fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
              }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cancellation policy — yellow */}
      <div style={{ margin: "0 16px 20px", background: T.yellow, border: "2px solid #14110F", borderRadius: 20, padding: "20px" }}>
        <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5, color: T.black, marginBottom: 10 }}>
          HOW YOU&rsquo;LL PAY — Add a card, nothing charged yet. Your Stretchy locks in 36 hours out — that&rsquo;s the most you&rsquo;ll ever pay. Two hours out, we charge the final price. Often lower, never higher.
        </p>
        <p style={{ fontSize: 13, lineHeight: 1.5, color: T.black, marginBottom: 10 }}>
          Can&rsquo;t make it? Cancel free before the 36-hour mark. After that, the price stands — that&rsquo;s our cancellation policy, and it&rsquo;s what keeps the system fair for everyone who shows up. Can&rsquo;t make it happen on our end? You&rsquo;re refunded in full. Every time. Genuinely can&rsquo;t help it? Flick us a message.
        </p>
        <p style={{ fontSize: 13, lineHeight: 1.5, color: T.black }}>
          <strong>Social Stretch after</strong> — make mates off the mat. Pay your own way.
        </p>
      </div>

      {/* How to Stretchy */}
      <div style={{ margin: "0 16px 24px" }}>
        <HowToStretchy />
      </div>

      {/* Hold CTA — sticky bottom */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "rgba(245,237,227,0.95)", backdropFilter: "blur(12px)",
        borderTop: "1px solid rgba(26,26,26,0.08)",
        padding: "16px 20px 24px",
        display: "flex", flexDirection: "column", gap: 8,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, color: T.yellow }}>${currentPrice.toFixed(2)}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "rgba(26,26,26,0.45)", marginLeft: 6 }}>incl. GST</span>
          </div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: confirmed ? "#716F39" : T.orange }}>
            {confirmed ? `${holds} HELD · GOING AHEAD` : `${spotsToMin} MORE TO CONFIRM`}
          </span>
        </div>
        {!accessToken ? (
          <Link
            href={`/login?next=/sessions/${params.id}`}
            style={{
              display: "block", width: "100%", padding: "18px 24px", borderRadius: 999,
              background: T.black, color: T.cream, textDecoration: "none",
              fontFamily: "'Space Grotesk', system-ui, sans-serif", fontSize: 16, fontWeight: 700,
              letterSpacing: "-0.01em", textAlign: "center",
            }}
          >
            Log in to hold your place
          </Link>
        ) : (
        <button
          onClick={handleHold}
          disabled={holding || held}
          style={{
            width: "100%", padding: "18px 24px", borderRadius: 999,
            background: holding ? "rgba(26,26,26,0.4)" : T.black,
            color: T.cream, border: "none", cursor: holding ? "not-allowed" : "pointer",
            fontFamily: "'Space Grotesk', system-ui, sans-serif", fontSize: 16, fontWeight: 700,
            letterSpacing: "-0.01em",
          }}
        >
          {holding ? "Saving your spot…" : held ? "✓ Held!" : "Hold my place — no charge yet"}
        </button>
        )}
        <p style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "rgba(26,26,26,0.4)", fontWeight: 700 }}>
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
