"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import SMark from "@/components/SMark";
import HowToStretchy from "@/components/HowToStretchy";

const T = {
  black:  "#1A1A1A",
  cream:  "#F5EDE3",
  yellow: "#FFD166",
  olive:  "#7A8330",
  blue:   "#2C8FE0",
  purple: "#A535C7",
  green:  "#4CAF82",
  orange: "#FF6B35",
  hold:   "#A8D5E2",
};

const TYPE_COLORS: Record<string, string> = {
  yoga: "#A535C7", pilates: "#2A3FE0", breath: "#7A8330",
  sound: "#4FB8E0", flow: "#FF6B35", run: "#E63946", hiit: "#2C8FE0",
};
const TYPE_LABELS: Record<string, string> = {
  yoga: "YOGA", pilates: "PILATES", breath: "BREATH",
  sound: "SOUND", flow: "FLOW", run: "RUN", hiit: "HIIT",
};

const STRETCHY_FEE = 23;
function calcPrice(target: number, spots: number) {
  return Math.round((target + STRETCHY_FEE) / Math.max(spots, 1));
}

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
  host_target: number;
  min_attendees: number;
  max_attendees: number;
  current_holds: number;
  state: string;
  social_stretch_venue: string | null;
  social_stretch_note: string | null;
  what_to_bring: string[] | null;
};

// Price curve SVG — drops from ceiling to floor as spots fill
function PriceCurveChart({ session: s }: { session: Session }) {
  const W = 320; const H = 110;
  const PAD = { left: 12, right: 12, top: 32, bottom: 32 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const ceiling = calcPrice(s.host_target, s.min_attendees);
  const floor   = calcPrice(s.host_target, s.max_attendees);
  const holds   = s.current_holds || 0;
  const priceRange = ceiling - floor;

  const toX = (n: number) => PAD.left + ((n - s.min_attendees) / (s.max_attendees - s.min_attendees)) * cW;
  const toY = (p: number) => PAD.top + (1 - Math.max(0, (p - floor) / Math.max(priceRange, 1))) * cH;

  // Generate curve points
  const points = [];
  for (let n = s.min_attendees; n <= s.max_attendees; n++) {
    points.push({ x: toX(n), y: toY(calcPrice(s.host_target, n)) });
  }
  const curvePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  // Current dot position
  const dotSpots = Math.min(Math.max(holds, s.min_attendees), s.max_attendees);
  const dotX = toX(dotSpots);
  const dotY = toY(calcPrice(s.host_target, dotSpots));

  // Labels
  const ifFull = calcPrice(s.host_target, s.max_attendees);

  return (
    <div style={{ position: "relative", width: W }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        {/* Grid line at ceiling */}
        <line x1={PAD.left} y1={toY(ceiling)} x2={W - PAD.right} y2={toY(ceiling)} stroke="rgba(26,26,26,0.08)" strokeWidth={1} strokeDasharray="3,3" />
        {/* Grid line at floor */}
        <line x1={PAD.left} y1={toY(floor)} x2={W - PAD.right} y2={toY(floor)} stroke="rgba(26,26,26,0.08)" strokeWidth={1} strokeDasharray="3,3" />

        {/* Curve fill */}
        <path
          d={curvePath + ` L ${points[points.length-1].x},${PAD.top+cH} L ${points[0].x},${PAD.top+cH} Z`}
          fill="rgba(255,209,102,0.10)"
        />
        {/* Curve line */}
        <path d={curvePath} fill="none" stroke={T.yellow} strokeWidth={2} />

        {/* Live dot */}
        <circle cx={dotX} cy={dotY} r={6} fill={T.yellow} />
        <circle cx={dotX} cy={dotY} r={10} fill="rgba(255,209,102,0.25)" />

        {/* Price labels */}
        <text x={PAD.left} y={toY(ceiling) - 6} fontSize={10} fontFamily="JetBrains Mono, monospace" fontWeight={700} fill={T.black} opacity={0.4}>
          ${ceiling}
        </text>
        <text x={W - PAD.right} y={toY(floor) + 14} fontSize={10} fontFamily="JetBrains Mono, monospace" fontWeight={700} fill={T.black} opacity={0.4} textAnchor="end">
          ${ifFull} if full
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

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/admin/sessions?id=${params.id}`)
      .then((r) => r.json())
      .then((data: Session[]) => {
        const found = Array.isArray(data) ? data.find((s) => s.id === params.id) : null;
        setSession(found || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  async function handleHold() {
    setHolding(true);
    // For now, show confirmation — real Stripe hold coming next
    await new Promise((r) => setTimeout(r, 800));
    setHeld(true);
    setHolding(false);
    router.push(`/hold/${params.id}`);
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
  const startingPrice = calcPrice(s.host_target, s.min_attendees);
  const currentPrice  = confirmed ? calcPrice(s.host_target, holds) : startingPrice;
  const floorPrice    = calcPrice(s.host_target, s.max_attendees);
  const spotsToMin    = Math.max(0, s.min_attendees - holds);

  const startDate = new Date(s.starts_at);
  const dayStr    = startDate.toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" });
  const timeStr   = startDate.toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
  const durationLabel = s.duration_mins >= 60
    ? `${s.duration_mins / 60}hr`
    : `${s.duration_mins} min`;

  return (
    <main style={{ background: T.cream, minHeight: "100vh", fontFamily: "'Space Grotesk', system-ui, sans-serif", paddingBottom: 120 }}>
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
          <span style={{ background: "#E8D9C8", color: T.black, padding: "5px 11px", borderRadius: 999, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em" }}>
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
      <div style={{ margin: "0 16px 20px", background: T.black, borderRadius: 20, padding: "20px 20px 24px", color: T.cream }}>
        {/* Status */}
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: confirmed ? T.green : T.orange, marginBottom: 12 }}>
          {confirmed
            ? `● GOING AHEAD · ${holds} HELD`
            : `○ ${spotsToMin} MORE TO CONFIRM`}
        </div>

        {/* Holds pips */}
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 16 }}>
          {Array.from({ length: s.min_attendees }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 10, height: 10, borderRadius: "50%",
                background: i < holds ? typeColor : "rgba(245,237,227,0.15)",
              }}
            />
          ))}
          {holds > s.min_attendees && (
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: typeColor }}>
              +{holds - s.min_attendees}
            </span>
          )}
        </div>

        {/* Big price */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: "rgba(245,237,227,0.4)", letterSpacing: "0.16em", marginBottom: 4 }}>
            {confirmed ? "PRICE NOW" : "MAX YOU'LL PAY"}
          </p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontFamily: "'Bagel Fat One', cursive", fontSize: 52, color: T.yellow, lineHeight: 1 }}>
              ${currentPrice}
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "rgba(245,237,227,0.5)", fontWeight: 700 }}>
              + GST
            </span>
          </div>
          {!confirmed && (
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "rgba(245,237,227,0.4)", marginTop: 4 }}>
              DROPS AS THE ROOM FILLS · FLOOR ${floorPrice} + GST
            </p>
          )}
        </div>

        {/* Price curve */}
        <PriceCurveChart session={s} />

        {/* Formula */}
        <div style={{
          marginTop: 12, padding: "10px 14px", borderRadius: 10,
          background: "rgba(245,237,227,0.06)", border: "1px solid rgba(245,237,227,0.08)",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
          color: "rgba(245,237,227,0.4)", letterSpacing: "0.06em",
        }}>
          ${s.host_target} TARGET + $23 STRETCHY FEE ÷ {holds || s.min_attendees} PEOPLE = ${currentPrice} + GST
        </div>
      </div>

      {/* Where */}
      <div style={{ margin: "0 16px 20px", background: "#fff", borderRadius: 20, padding: "20px" }}>
        <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: "rgba(26,26,26,0.35)", letterSpacing: "0.18em", marginBottom: 10 }}>
          WHERE
        </p>
        <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{s.location_name}</p>
        {s.location_address && (
          <p style={{ fontSize: 13, color: "rgba(26,26,26,0.55)", marginBottom: 8 }}>{s.location_address}</p>
        )}
        {s.getting_there && (
          <p style={{ fontSize: 13, color: "rgba(26,26,26,0.65)", lineHeight: 1.5 }}>{s.getting_there}</p>
        )}
      </div>

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

      {/* Social stretch */}
      {s.social_stretch_venue && (
        <div style={{ margin: "0 16px 20px", background: T.purple, borderRadius: 20, padding: "20px" }}>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: "rgba(245,237,227,0.5)", letterSpacing: "0.18em", marginBottom: 8 }}>
            SOCIAL STRETCH AFTER
          </p>
          <p style={{ fontSize: 15, fontWeight: 700, color: T.cream, marginBottom: 4 }}>{s.social_stretch_venue}</p>
          {s.social_stretch_note && (
            <p style={{ fontSize: 13, color: "rgba(245,237,227,0.75)" }}>{s.social_stretch_note}</p>
          )}
        </div>
      )}

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
            <span style={{ fontFamily: "'Bagel Fat One', cursive", fontSize: 28, color: T.yellow }}>${currentPrice}</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "rgba(26,26,26,0.45)", marginLeft: 6 }}>+ GST</span>
          </div>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: confirmed ? "#4CAF82" : T.orange }}>
            {confirmed ? `${holds} HELD · GOING AHEAD` : `${spotsToMin} MORE TO CONFIRM`}
          </span>
        </div>
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
        <p style={{ textAlign: "center", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: "rgba(26,26,26,0.4)", fontWeight: 700 }}>
          FREE TO HOLD · ONLY CHARGED IF SESSION GOES AHEAD
        </p>
      </div>
    </main>
  );
}
