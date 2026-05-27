"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SMark from "@/components/SMark";

// ─── PRICING FORMULA ─────────────────────────────────────────────────────────
// Price per spot = (hostTarget + 23) / spots   (23 = $20 + 15% GST)
const STRETCHY_FEE = 23;
const calcPrice = (target: number, spots: number) =>
  Math.round((target + STRETCHY_FEE) / spots);

// ─── PRICE CURVE SVG ─────────────────────────────────────────────────────────
function PriceCurve({
  target,
  minSpots,
  floorSpots,
  startingPrice,
  floorPrice,
}: {
  target: number;
  minSpots: number;
  floorSpots: number;
  startingPrice: number;
  floorPrice: number;
}) {
  const W = 320;
  const H = 160;
  const PAD = { top: 20, right: 20, bottom: 36, left: 44 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // Generate curve points
  const spotsRange = floorSpots - minSpots;
  const priceRange = startingPrice - floorPrice;
  const STEPS = 40;

  const points: { x: number; y: number }[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const spots = minSpots + (spotsRange * i) / STEPS;
    const price = calcPrice(target, Math.max(spots, 1));
    const px = PAD.left + (chartW * i) / STEPS;
    const py = PAD.top + chartH * (1 - Math.max(0, (price - floorPrice) / Math.max(priceRange, 1)));
    points.push({ x: px, y: py });
  }

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  // Fill path (closed below the curve)
  const fillD =
    pathD +
    ` L ${points[points.length - 1].x.toFixed(1)},${(PAD.top + chartH).toFixed(1)}` +
    ` L ${PAD.left.toFixed(1)},${(PAD.top + chartH).toFixed(1)} Z`;

  // Key label points
  const midSpots = Math.round(minSpots + spotsRange / 2);
  const midPrice = calcPrice(target, midSpots);
  const midX = PAD.left + chartW * 0.5;
  const midY = PAD.top + chartH * (1 - Math.max(0, (midPrice - floorPrice) / Math.max(priceRange, 1)));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ display: "block" }}
      aria-label="Price drop curve"
    >
      {/* Grid lines */}
      {[0, 0.33, 0.66, 1].map((t, i) => (
        <line
          key={i}
          x1={PAD.left}
          y1={PAD.top + chartH * t}
          x2={PAD.left + chartW}
          y2={PAD.top + chartH * t}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
        />
      ))}

      {/* Fill under curve */}
      <path d={fillD} fill="rgba(44,143,224,0.18)" />

      {/* Curve line */}
      <path d={pathD} fill="none" stroke="#2C8FE0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Start dot + label */}
      <circle cx={points[0].x} cy={points[0].y} r="4" fill="#2C8FE0" />
      <text x={points[0].x} y={points[0].y - 9} textAnchor="middle" fill="#fff" fontSize="11" fontFamily="monospace" fontWeight="bold">
        ${startingPrice}
      </text>

      {/* Mid dot */}
      <circle cx={midX} cy={midY} r="3.5" fill="rgba(44,143,224,0.7)" />
      <text x={midX} y={midY - 9} textAnchor="middle" fill="rgba(255,255,255,0.7)" fontSize="10" fontFamily="monospace">
        ${midPrice}
      </text>

      {/* Floor dot + label */}
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4" fill="#FFD166" />
      <text x={points[points.length - 1].x} y={points[points.length - 1].y - 9} textAnchor="middle" fill="#FFD166" fontSize="11" fontFamily="monospace" fontWeight="bold">
        ${floorPrice}
      </text>

      {/* X axis labels */}
      <text x={PAD.left} y={H - 6} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="9" fontFamily="monospace">
        {minSpots}
      </text>
      <text x={midX} y={H - 6} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="9" fontFamily="monospace">
        {midSpots}
      </text>
      <text x={PAD.left + chartW} y={H - 6} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="9" fontFamily="monospace">
        {floorSpots}
      </text>

      {/* X axis label */}
      <text x={PAD.left + chartW / 2} y={H - 0} textAnchor="middle" fill="rgba(255,255,255,0.30)" fontSize="8" fontFamily="monospace">
        SPOTS FILLED
      </text>

      {/* Y axis labels */}
      <text x={PAD.left - 6} y={PAD.top + 4} textAnchor="end" fill="rgba(255,255,255,0.45)" fontSize="9" fontFamily="monospace">
        ${startingPrice}
      </text>
      <text x={PAD.left - 6} y={PAD.top + chartH + 4} textAnchor="end" fill="rgba(255,255,255,0.45)" fontSize="9" fontFamily="monospace">
        ${floorPrice}
      </text>
    </svg>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function NewSessionPage() {
  const router = useRouter();

  const [target, setTarget] = useState(200);
  const [minSpots, setMinSpots] = useState(8);

  // Derived price preview points
  const startingPrice = calcPrice(target, minSpots);
  const midSpots = Math.round(minSpots + (minSpots * 0.5)); // 50% more than min
  const midPrice = calcPrice(target, midSpots);
  const floorSpots = Math.round(minSpots * 2); // double the min = floor
  const floorPrice = calcPrice(target, floorSpots);

  // Hint: rough Auckland market rate context
  const marketLow = Math.round(startingPrice * 0.9);
  const marketHigh = Math.round(startingPrice * 1.15);

  return (
    <main className="min-h-screen bg-cream pb-32">

      {/* ── NAV ── */}
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/home" className="text-ink"><SMark size={28} /></Link>
          <Link href="/host/dashboard" className="text-muted hover:text-ink text-lg transition-colors" aria-label="Back">←</Link>
        </div>
        {/* Step indicator */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className="rounded-full transition-all"
              style={{
                width: s === 4 ? "20px" : "6px",
                height: "6px",
                backgroundColor: s === 4 ? "#1A1A1A" : "#D4CFC9",
              }}
            />
          ))}
        </div>
        <button
          className="font-mono text-xs font-bold uppercase tracking-widest text-muted hover:text-ink transition-colors"
          onClick={() => router.push("/host/dashboard")}
        >
          SAVE
        </button>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-5">

        {/* ── STEP LABEL + HEADLINE ── */}
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.20em] text-muted mb-2">
            Step 4 of 4 · The Numbers
          </p>
          <h1
            className="font-display font-bold text-ink"
            style={{ fontSize: "clamp(44px, 12vw, 58px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}
          >
            Set your<br />target.
          </h1>
        </div>

        {/* ── MARKET HINT (blue) ── */}
        <div className="rounded-card p-4" style={{ backgroundColor: "#E8F3FF" }}>
          <div className="flex items-start gap-2">
            <span className="text-base flex-shrink-0 mt-0.5">💡</span>
            <p className="text-sm leading-snug" style={{ color: "#1A4A80" }}>
              For a 60-min casual vinyasa in Auckland, fair market is <strong>${marketLow}–${marketHigh}</strong>. With your target &amp; min, you&apos;d start at <strong>${startingPrice}</strong>.
            </p>
          </div>
        </div>

        {/* ── TARGET SLIDER ── */}
        <div className="bg-white rounded-card shadow-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">
              Your Target
            </p>
            <p className="font-mono text-xs text-muted">$50 – $10,000</p>
          </div>

          {/* Yellow target display */}
          <div className="rounded-card p-4 mb-4" style={{ backgroundColor: "#FFD166" }}>
            <div className="flex items-end gap-1">
              <span className="font-mono font-black text-ink" style={{ fontSize: "22px", lineHeight: "1", marginBottom: "4px" }}>$</span>
              <span className="font-mono font-black text-ink" style={{ fontSize: "64px", lineHeight: "1", letterSpacing: "-0.04em" }}>
                {target}
              </span>
              <span className="text-ink mb-2 ml-1" style={{ opacity: 0.55, fontSize: "15px" }}>per session</span>
            </div>
          </div>

          <input
            type="range"
            min={50}
            max={1000}
            step={5}
            value={target}
            onChange={(e) => setTarget(Number(e.target.value))}
            className="w-full accent-ink"
            style={{ accentColor: "#1A1A1A" }}
          />
          <p className="text-xs text-muted mt-2 leading-snug">
            Cover your venue, your time, your costs. The $20 + GST Stretchy fee is added on top.
          </p>
        </div>

        {/* ── MIN SPOTS SLIDER ── */}
        <div className="bg-white rounded-card shadow-card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">
              Minimum Spots to Run
            </p>
            <p className="font-mono font-black text-ink" style={{ fontSize: "28px", lineHeight: "1" }}>
              {minSpots}
            </p>
          </div>

          <input
            type="range"
            min={4}
            max={30}
            step={1}
            value={minSpots}
            onChange={(e) => setMinSpots(Number(e.target.value))}
            className="w-full mb-3"
            style={{ accentColor: "#1A1A1A" }}
          />

          <p className="text-xs text-muted leading-snug">
            The smallest group that makes it worth running. Below this — no one&apos;s charged.
          </p>
        </div>

        {/* ── LIVE PRICE PREVIEW (black) ── */}
        <div className="rounded-card p-5" style={{ backgroundColor: "#1A1A1A" }}>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] mb-4" style={{ color: "rgba(255,255,255,0.50)" }}>
            Live Price Preview
          </p>

          {/* Starting price */}
          <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.10)" }}>
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-white">
                {minSpots} Spots
              </p>
              <p className="font-mono text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                Starting price
              </p>
            </div>
            <p className="font-mono font-black text-white" style={{ fontSize: "28px", letterSpacing: "-0.04em" }}>
              <span style={{ fontSize: "14px" }}>$</span>{startingPrice}
            </p>
          </div>

          {/* Mid price */}
          <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.10)" }}>
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-white">
                {midSpots} Spots
              </p>
            </div>
            <p className="font-mono font-black text-white" style={{ fontSize: "28px", letterSpacing: "-0.04em" }}>
              <span style={{ fontSize: "14px" }}>$</span>{midPrice}
            </p>
          </div>

          {/* Floor price */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-white">
                {floorSpots} Spots
              </p>
              <p className="font-mono text-xs mt-0.5" style={{ color: "#4CAF82" }}>
                Floor price
              </p>
            </div>
            <p className="font-mono font-black" style={{ fontSize: "28px", letterSpacing: "-0.04em", color: "#FFD166" }}>
              <span style={{ fontSize: "14px" }}>$</span>{floorPrice}
            </p>
          </div>

          <p className="text-xs mt-3 leading-snug" style={{ color: "rgba(255,255,255,0.45)" }}>
            At minimum, you hit your <strong className="text-white">${target}</strong> target. Every extra person is a better deal for the room — you still take home ${target}.
          </p>
        </div>

        {/* ── PRICE DROP CURVE ── */}
        <div className="rounded-card p-5" style={{ backgroundColor: "#1A1A1A" }}>
          <div className="flex items-center justify-between mb-1">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.50)" }}>
              What Attendees See
            </p>
            <span
              className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-pill"
              style={{ backgroundColor: "rgba(44,143,224,0.20)", color: "#2C8FE0" }}
            >
              LIVE CURVE
            </span>
          </div>
          <p className="text-xs mb-4 leading-snug" style={{ color: "rgba(255,255,255,0.40)" }}>
            Price drops automatically as more people join. Everyone gets a better deal together.
          </p>

          <PriceCurve
            target={target}
            minSpots={minSpots}
            floorSpots={floorSpots}
            startingPrice={startingPrice}
            floorPrice={floorPrice}
          />

          <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#2C8FE0" }} />
              <p className="font-mono text-xs" style={{ color: "rgba(255,255,255,0.50)" }}>Starting</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#FFD166" }} />
              <p className="font-mono text-xs" style={{ color: "rgba(255,255,255,0.50)" }}>Floor (best deal)</p>
            </div>
          </div>
        </div>

      </div>

      {/* ── STICKY CTAs ── */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-4 space-y-3" style={{ backgroundColor: "#F5EDE3" }}>
        <div className="max-w-lg mx-auto space-y-3">
          <button
            className="w-full font-semibold text-white rounded-pill transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ backgroundColor: "#2C8FE0", height: "56px", fontSize: "16px" }}
            onClick={() => router.push("/host/dashboard")}
          >
            Post session · go to dashboard
          </button>
          <button
            className="w-full font-semibold text-ink rounded-pill transition-all hover:bg-sand-dark active:scale-[0.98]"
            style={{ border: "1.5px solid #D4CFC9", height: "50px", fontSize: "15px" }}
          >
            Not right? Set your own price
          </button>
        </div>
      </div>

    </main>
  );
}
