"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SMark from "@/components/SMark";
import { getPricingState, getPriceCurve, formatPrice } from "@/lib/pricing";
import HowToStretchy from "@/components/HowToStretchy";
import { useFavourites } from "@/hooks/useFavourites";

// ─── MOCK SESSION ─────────────────────────────────────────────────────────────
const MOCK_SESSION = {
  id: "1",
  title: "Sunday Slow Flow",
  description:
    "A grounding vinyasa flow for all levels. We'll move through sun salutations, standing sequences and end with a long savasana. Come as you are.",
  host: {
    name: "Tāne Ratima",
    bio: "Yoga teacher and community builder. Based in Grey Lynn. 14 sessions hosted.",
    sessionsHosted: 14,
    ratingAverage: 5,
    ratingCount: 89,
    instagram: "taneratima",
    vetted: true,
  },
  neighbourhood: "Grey Lynn",
  day: "SUN",
  time: "9:00 AM",
  duration: "60 MIN",
  sessionType: "yoga",
  typeColor: "#A535C7",
  typeLabel: "YOGA",
  venueName: "Grey Lynn Community Centre",
  venueAddress: "510 Richmond Road, Grey Lynn, Auckland",
  venueNotes: "Enter via the side gate on Surrey Crescent. Mats provided. BYO water.",
  hostTarget: 200,
  minimumSpots: 8,
  maxCapacity: 20,
  currentHolds: 5,
  phase: "HOLD_BELOW_MIN" as const,
  hasSocialStretch: true,
  socialStretchVenue: "Tāne is heading to Little Bird next door after. ☕",
  isLive: true,
  isCharity: false,
  charity: null as null | { name: string; website?: string; instagram?: string; note?: string },
};

// ─── PRICE CURVE SVG ─────────────────────────────────────────────────────────
// Layout:
//   Solid black  : left edge → NOW dot (at startingPrice level — flat hold line)
//   Dashed grey  : NOW → MIN  (still flat — price is held until minimum met)
//   Dashed grey  : MIN → FULL (drops as room fills)
//   Vertical dash: at MIN (the "hold line")
function PriceCurveChart({
  hostTarget,
  minimumSpots,
  maxCapacity,
  currentSpots,
}: {
  hostTarget: number;
  minimumSpots: number;
  maxCapacity: number;
  currentSpots: number;
}) {
  const W = 320; const H = 120;
  const PAD = { left: 16, right: 16, top: 36, bottom: 40 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // Prices
  const startingPrice = Math.round((hostTarget + 23) / minimumSpots); // held price ($28)
  const floorPrice    = Math.round((hostTarget + 23) / maxCapacity);  // floor ($14)
  const nowPrice      = startingPrice; // while below min, price is held at startingPrice

  // X: 1 → maxCapacity (so NOW dot sits in the left-middle area, not at edge)
  const toX = (s: number) => PAD.left + ((s - 1) / (maxCapacity - 1)) * chartW;
  // Y: startingPrice (top) → floorPrice (bottom)
  const toY = (p: number) =>
    PAD.top + ((startingPrice - p) / (startingPrice - floorPrice)) * chartH;

  const flatY  = toY(startingPrice); // y-level for the flat hold line
  const cx     = toX(Math.min(currentSpots, minimumSpots)); // NOW dot x (capped at min)
  const minX   = toX(minimumSpots);
  const midX   = toX(Math.round((minimumSpots + maxCapacity) / 2));
  const maxX   = toX(maxCapacity);

  // Dashed drop curve: MIN → FULL
  const dropPoints: { x: number; y: number }[] = [];
  for (let n = minimumSpots; n <= maxCapacity; n++) {
    dropPoints.push({ x: toX(n), y: toY((hostTarget + 23) / n) });
  }
  const dropPath = dropPoints
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>

      {/* "$28 MAX" label — top left, just above flat line */}
      <text x={PAD.left} y={flatY - 8} fontSize="9" fill="#6B6B6B" fontFamily="monospace" fontWeight="bold">
        ${startingPrice} MAX
      </text>

      {/* Solid black line: left edge → NOW dot */}
      <line
        x1={PAD.left} y1={flatY}
        x2={cx}       y2={flatY}
        stroke="#1A1A1A" strokeWidth="2.5" strokeLinecap="round"
      />

      {/* Dashed grey line: NOW → MIN (flat hold — price not dropping yet) */}
      <line
        x1={cx}   y1={flatY}
        x2={minX} y2={flatY}
        stroke="#C8B8A4" strokeWidth="2.5" strokeDasharray="5 3" strokeLinecap="round"
      />

      {/* Vertical hold line at MIN — dashed */}
      <line
        x1={minX} y1={PAD.top - 6}
        x2={minX} y2={H - PAD.bottom + 2}
        stroke="#C8B8A4" strokeWidth="1.5" strokeDasharray="4 3"
      />

      {/* Dashed drop curve: MIN → FULL */}
      <path
        d={dropPath}
        fill="none"
        stroke="#C8B8A4"
        strokeWidth="2.5"
        strokeDasharray="5 3"
        strokeLinecap="round"
      />

      {/* Horizontal baseline */}
      <line
        x1={PAD.left} y1={H - PAD.bottom}
        x2={maxX}     y2={H - PAD.bottom}
        stroke="#E8D9C8" strokeWidth="1"
      />

      {/* "$14 FLOOR" — bottom right, above baseline */}
      <text x={maxX - 4} y={H - PAD.bottom - 6} fontSize="9" fill="#6B6B6B" fontFamily="monospace" textAnchor="end" fontWeight="bold">
        ${floorPrice} FLOOR
      </text>

      {/* X-axis: MIN / 12 / FULL */}
      <text x={minX} y={H - PAD.bottom + 12} fontSize="9"   fill="#6B6B6B" fontFamily="monospace" textAnchor="middle">{minimumSpots}</text>
      <text x={minX} y={H - PAD.bottom + 22} fontSize="7.5" fill="#AAAAAA" fontFamily="monospace" textAnchor="middle">MIN</text>
      <text x={midX} y={H - PAD.bottom + 12} fontSize="9"   fill="#6B6B6B" fontFamily="monospace" textAnchor="middle">
        {Math.round((minimumSpots + maxCapacity) / 2)}
      </text>
      <text x={maxX} y={H - PAD.bottom + 12} fontSize="9"   fill="#6B6B6B" fontFamily="monospace" textAnchor="middle">FULL</text>

      {/* NOW dot */}
      <circle cx={cx} cy={flatY} r="7"  fill="#FF6B35" />
      <circle cx={cx} cy={flatY} r="12" fill="#FF6B35" fillOpacity="0.18" />

      {/* "NOW · $28" label — orange, above/right of dot */}
      <text x={cx + 16} y={flatY - 6} fontSize="9" fill="#FF6B35" fontFamily="monospace" fontWeight="bold">
        NOW · ${nowPrice}
      </text>

    </svg>
  );
}

// ─── IF X JOIN CHIPS ─────────────────────────────────────────────────────────
function JoinChips({
  hostTarget,
  minimumSpots,
  maxCapacity,
}: {
  hostTarget: number;
  minimumSpots: number;
  maxCapacity: number;
}) {
  const mid    = Math.round((minimumSpots + maxCapacity) / 2);
  const spots  = [minimumSpots, mid, maxCapacity];
  const prices = spots.map((n) => Math.round((hostTarget + 23) / n));
  const floor  = Math.min(...prices);

  return (
    <div className="flex gap-2 pt-4 border-t border-border">
      {spots.map((n, i) => {
        const price   = prices[i];
        const isFloor = price === floor;
        return (
          <div key={n} className="flex-1 text-center">
            <p className="font-mono text-xs font-bold uppercase tracking-wide text-muted mb-2.5">
              If {n} join
            </p>
            <span
              className="font-mono font-bold inline-flex items-baseline gap-0.5 px-4 py-2 rounded-pill"
              style={{
                backgroundColor: isFloor ? "#FFD166" : "#1A1A1A",
                color: isFloor ? "#1A1A1A" : "#F5EDE3",
                fontSize: "18px",
              }}
            >
              <span style={{ fontSize: "12px" }}>$</span>
              <span>{price}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function SessionDetailPage({ params }: { params: { id: string } }) {
  const router  = useRouter();
  const session = MOCK_SESSION;
  const [held, setHeld] = useState(false);
  const { toggle, isFaved } = useFavourites();
  const saved = isFaved(session.id);
  const favData = {
    id: session.id, title: session.title,
    day: session.day, time: session.time,
    sessionType: session.sessionType, typeColor: session.typeColor,
    typeLabel: session.typeLabel, initial: session.typeLabel[0],
    neighbourhood: session.neighbourhood,
    hostName: session.host.name,
    priceLabel: String(Math.round((session.hostTarget + 23) / session.minimumSpots)),
  };

  const pricing = getPricingState(
    session.hostTarget,
    session.minimumSpots,
    session.maxCapacity,
    session.currentHolds,
    session.phase
  );

  const spotsToConfirm = session.minimumSpots - session.currentHolds;
  const belowMin       = session.currentHolds < session.minimumSpots;

  return (
    <main className="min-h-screen bg-cream pb-32">

      {/* ── NAV ── */}
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/home" className="text-ink"><SMark size={28} /></Link>
          <Link href="/sessions" className="text-muted hover:text-ink text-lg transition-colors" aria-label="Back">←</Link>
        </div>
        {session.isCharity ? (
          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-pill flex items-center gap-1" style={{ backgroundColor: "#FFF4E6", color: "#FF6B35", border: "1px solid #F8DFC5" }}>
            🎗️ FUNDRAISER
          </span>
        ) : session.host.vetted ? (
          <span className="font-mono text-xs font-bold tracking-wide" style={{ color: "#4FB8E0" }}>
            ✓ VETTED HOST
          </span>
        ) : null}
        <button
          onClick={() => toggle(favData)}
          className="text-2xl transition-transform active:scale-90"
          style={{ color: saved ? "#E63946" : "#C4BEB7" }}
        >
          {saved ? "♥" : "♡"}
        </button>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-4">

        {/* ── DATE / DURATION / TYPE PILLS ── */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-bold px-3 py-1.5 rounded-pill" style={{ backgroundColor: "#1A1A1A", color: "#F5EDE3" }}>
            {session.day} · {session.time}
          </span>
          <span className="font-mono text-xs font-semibold px-3 py-1.5 rounded-pill" style={{ backgroundColor: "#E8D9C8", color: "#6B6B6B" }}>
            {session.duration}
          </span>
          <span className="font-mono text-xs font-bold px-3 py-1.5 rounded-pill text-white" style={{ backgroundColor: session.typeColor }}>
            {session.typeLabel}
          </span>
        </div>

        {/* ── HEADLINE + HOST AVATAR ── */}
        <div>
          <div className="flex items-start justify-between gap-3">
            <h1
              className="font-display font-bold text-ink flex-1"
              style={{ fontSize: "clamp(32px,9vw,44px)", letterSpacing: "-0.03em", lineHeight: "1.05" }}
            >
              {session.title}
            </h1>
            <div
              className="w-14 h-14 rounded-card flex items-center justify-center font-bold text-2xl text-white flex-shrink-0 mt-1"
              style={{ backgroundColor: session.typeColor }}
            >
              {session.host.name[0]}
            </div>
          </div>
          <p className="text-sm text-muted mt-1">
            with {session.host.name} · {session.neighbourhood}
          </p>
          {/* Simple dot pips for rating — no S-mark here, S-marks are in the confirm card */}
          <div className="flex items-center gap-1 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: i < session.host.ratingAverage ? "#7A8330" : "#DDD0C0" }}
              />
            ))}
          </div>
        </div>

        {/* ── CONFIRM CARD — contains S-mark pips + yellow price sub-card ── */}
        <div className="card space-y-4">

          {/* S-mark pips (minimumSpots total) + LIVE badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: session.minimumSpots }).map((_, i) => (
                <span
                  key={i}
                  style={{ opacity: i < session.currentHolds ? 1 : 0.20 }}
                  className="text-olive"
                >
                  <SMark size={18} />
                </span>
              ))}
            </div>
            {session.isLive && (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className="w-2 h-2 rounded-full bg-red animate-pulse" />
                <span className="font-mono text-xs font-bold text-red uppercase tracking-wide">LIVE</span>
              </div>
            )}
          </div>

          {/* Confirm message */}
          {belowMin && (
            <p className="font-bold text-base text-ink uppercase tracking-wide leading-tight">
              {spotsToConfirm} more attendee{spotsToConfirm !== 1 ? "s" : ""} to confirm session
            </p>
          )}

          {/* ── Yellow price sub-card (nested inside white card) ── */}
          <div className="rounded-card p-5" style={{ backgroundColor: "#FFD166" }}>
            <div className="flex items-start justify-between">
              {/* Big price */}
              <div className="flex items-start">
                <span
                  className="font-mono font-black text-ink"
                  style={{ fontSize: "28px", lineHeight: "1", marginTop: "12px", marginRight: "1px" }}
                >
                  $
                </span>
                <span
                  className="font-mono font-black text-ink"
                  style={{ fontSize: "clamp(80px,22vw,108px)", lineHeight: "1", letterSpacing: "-0.04em" }}
                >
                  {Math.round(pricing.currentPrice)}
                </span>
              </div>
              {/* Label */}
              <div className="text-right flex-shrink-0 pt-3">
                <p
                  className="font-mono font-bold uppercase text-ink"
                  style={{ fontSize: "10px", opacity: 0.55, letterSpacing: "0.12em", lineHeight: "1.5" }}
                >
                  Starting<br />price
                </p>
              </div>
            </div>
          </div>

          {/* Price subtext (inside card, below yellow sub-card) */}
          <p className="text-sm text-ink leading-snug">
            The most you'll pay is <strong>{formatPrice(pricing.startingPrice)}</strong>.
            The more who join, the less <em>everyone</em> pays.
          </p>
        </div>

        {/* ── LIVE PRICE CURVE CARD ── */}
        <div className="card">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-muted mb-1">
            Live price — drops as the room fills
          </p>
          <PriceCurveChart
            hostTarget={session.hostTarget}
            minimumSpots={session.minimumSpots}
            maxCapacity={session.maxCapacity}
            currentSpots={session.currentHolds}
          />
          <JoinChips
            hostTarget={session.hostTarget}
            minimumSpots={session.minimumSpots}
            maxCapacity={session.maxCapacity}
          />
        </div>

        {/* ── WHAT TO EXPECT ── */}
        <div className="card">
          <h2 className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-muted mb-3">What to expect</h2>
          <p className="text-sm text-ink leading-relaxed">{session.description}</p>
        </div>

        {/* ── HOST CARD ── */}
        <div className="card">
          <div className="flex items-start gap-3">
            <div
              className="w-12 h-12 rounded-card flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
              style={{ backgroundColor: session.typeColor }}
            >
              {session.host.name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-bold text-ink">{session.host.name}</p>
                {session.host.vetted && (
                  <span className="font-mono text-xs font-bold" style={{ color: "#4FB8E0" }}>✓</span>
                )}
              </div>
              <p className="text-xs text-muted mt-0.5">
                {session.host.ratingAverage}★ · {session.host.ratingCount} ratings · {session.host.sessionsHosted} sessions
              </p>
              <p className="text-sm text-muted mt-1 leading-snug">{session.host.bio}</p>
              {session.host.instagram && (
                <a
                  href={`https://instagram.com/${session.host.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-olive hover:text-olive-dark mt-1 inline-block"
                >
                  @{session.host.instagram}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── WHERE ── */}
        <div className="card">
          <h2 className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-muted mb-3">Where</h2>
          <p className="font-semibold text-ink">{session.venueName}</p>
          <p className="text-sm text-muted mb-3">{session.venueAddress}</p>
          {session.venueNotes && (
            <p className="text-sm text-muted bg-sand-dark rounded-card px-3 py-2 mb-3">{session.venueNotes}</p>
          )}
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(session.venueAddress)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost text-sm px-4 py-2 inline-flex"
          >
            Directions →
          </a>
        </div>

        {/* ── SOCIAL STRETCH ── */}
        {session.hasSocialStretch && (
          <div className="rounded-card p-4" style={{ backgroundColor: "#FFD166" }}>
            <p className="font-bold text-ink text-sm mb-1">🤙 Social Stretch</p>
            <p className="text-sm text-ink" style={{ opacity: 0.80 }}>{session.socialStretchVenue}</p>
            <p className="text-xs text-ink mt-1" style={{ opacity: 0.55 }}>Details confirmed on session day.</p>
          </div>
        )}

        {/* ── CHARITY / FUNDRAISER ── */}
        {session.isCharity && session.charity && (
          <div className="rounded-card overflow-hidden" style={{ border: "1.5px solid #F8DFC5" }}>
            {/* Header */}
            <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: "#FF6B35" }}>
              <span className="text-base">🎗️</span>
              <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-white">
                Fundraiser Event
              </p>
            </div>
            {/* Body */}
            <div className="px-4 py-4 space-y-3" style={{ backgroundColor: "#FFF4E6" }}>
              <p className="font-bold text-ink">{session.charity.name}</p>

              {session.charity.note && (
                <p className="text-sm leading-relaxed" style={{ color: "#7A4020" }}>
                  {session.charity.note}
                </p>
              )}

              <div className="flex gap-2 flex-wrap">
                {session.charity.website && (
                  <a
                    href={session.charity.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs font-bold px-3 py-1.5 rounded-pill transition-all hover:brightness-110"
                    style={{ backgroundColor: "#FF6B35", color: "#fff" }}
                  >
                    Website ↗
                  </a>
                )}
                {session.charity.instagram && (
                  <a
                    href={`https://instagram.com/${session.charity.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs font-bold px-3 py-1.5 rounded-pill"
                    style={{ backgroundColor: "#F5EDE3", color: "#1A1A1A", border: "1px solid #E0D9D0" }}
                  >
                    @{session.charity.instagram}
                  </a>
                )}
              </div>

              <p className="font-mono text-xs text-muted leading-snug">
                Stretchy has reduced the platform fee for this event to support the cause.
              </p>
            </div>
          </div>
        )}

        {/* ── HOW TO STRETCHY ── */}
        <HowToStretchy />

      </div>

      {/* ── STICKY HOLD BAR ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-cream/95 backdrop-blur border-t border-border px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <div className="flex-shrink-0">
            <p className="text-xs text-muted">From</p>
            <div className="flex items-baseline gap-0.5">
              <span className="font-mono text-sm font-bold text-ink">$</span>
              <span className="font-mono text-2xl font-bold text-ink">{Math.round(pricing.currentPrice)}</span>
            </div>
          </div>
          <button
            onClick={() => {
              setHeld(true);
              setTimeout(() => router.push(`/hold/${session.id}`), 300);
            }}
            className="flex-1 flex items-center justify-center font-semibold rounded-pill transition-all active:scale-[0.98]"
            style={{
              backgroundColor: held ? "#4CAF82" : "#2C8FE0",
              color: "#fff",
              height: "56px",
              fontSize: "16px",
            }}
          >
            {held ? "✓ Place held" : "Hold my place →"}
          </button>
        </div>
        {!held && (
          <p className="text-center text-xs text-muted mt-2 max-w-lg mx-auto">
            No charge yet. Price locks 2 hrs before — that's when you pay.
          </p>
        )}
      </div>

    </main>
  );
}
