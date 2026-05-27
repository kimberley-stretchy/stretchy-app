"use client";

import Link from "next/link";
import SMark from "@/components/SMark";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK = {
  host: { name: "Tāne", fullName: "Tāne Ratima", initial: "T" },
  type: "Yoga",
  neighbourhoods: "Grey Lynn · Pt Chev",
  sessionsThisMonth: 4,
  thisMonth: 847,
  vsLast: 245,
  aveRoom: 9.2,
  matesHosted: 147,
  repeatPct: 68,
  paysMonday: 431,
};

const LIVE_SESSION = {
  id: "1",
  status: "CONFIRMED",
  day: "SUN",
  time: "9:00",
  title: "Sunday Slow Flow",
  held: 9,
  minimum: 8,
  roomForMore: 3,
  target: 200,
  spots: 9,
  nowPrice: 19,
  startPrice: 28,
  floorPrice: 14,
};

// ─── PRICE CURVE SVG ──────────────────────────────────────────────────────────
function HostPriceCurve() {
  const W = 280;
  const H = 80;
  const padL = 8; const padR = 8; const padT = 10; const padB = 18;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const startPrice = LIVE_SESSION.startPrice;
  const nowPrice = LIVE_SESSION.nowPrice;
  const floorPrice = LIVE_SESSION.floorPrice;
  const nowSpots = LIVE_SESSION.spots;
  const minSpots = LIVE_SESSION.minimum;
  const maxSpots = 16;

  const xOf = (s: number) => padL + ((s - minSpots) / (maxSpots - minSpots)) * chartW;
  const yOf = (p: number) => padT + ((startPrice - p) / (startPrice - floorPrice)) * chartH;

  const nowX = xOf(nowSpots);
  const nowY = yOf(nowPrice);
  const startX = padL;
  const startY = yOf(startPrice);
  const endX = padL + chartW;
  const endY = yOf(floorPrice);
  const midX = (nowX + endX) / 2;
  const dashPath = `M ${nowX} ${nowY} C ${midX} ${nowY} ${midX} ${endY} ${endX} ${endY}`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full">
      <path d={`M ${startX} ${startY} L ${nowX} ${nowY}`} stroke="#1A1A1A" strokeWidth="2" fill="none" />
      <path d={dashPath} stroke="#1A1A1A" strokeWidth="1.5" fill="none" strokeDasharray="4 3" />
      <circle cx={nowX} cy={nowY} r="5" fill="#E63946" />
      <text x={nowX + 8} y={nowY - 4} fontSize="9" fontFamily="monospace" fill="#1A1A1A" fontWeight="bold">NOW ${nowPrice}</text>
      <text x={startX} y={H - 2} fontSize="8" fontFamily="monospace" fill="#9A9590">FROM ${startPrice}</text>
      <text x={endX - 24} y={H - 2} fontSize="8" fontFamily="monospace" fill="#9A9590">FLOOR ${floorPrice}</text>
    </svg>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function HostDashboardPage() {
  return (
    <main className="min-h-screen bg-cream pb-20">

      {/* ── NAV ── */}
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <Link href="/home" className="text-ink"><SMark size={28} /></Link>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">
          Host Dashboard
        </p>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
          style={{ backgroundColor: "#FFD166", color: "#1A1A1A" }}
        >
          {MOCK.host.initial}
        </div>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-4">

        {/* ── KIA ORA CARD (blue) ── */}
        <div className="rounded-card p-5" style={{ backgroundColor: "#2C8FE0" }}>
          <h1
            className="font-display font-bold text-white leading-tight mb-2"
            style={{ fontSize: "clamp(32px, 9vw, 44px)", letterSpacing: "-0.03em", lineHeight: "0.95" }}
          >
            Kia ora,<br />{MOCK.host.name}.
          </h1>
          <p className="font-mono text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.65)" }}>
            {MOCK.type} · {MOCK.neighbourhoods} · <strong className="text-white">{MOCK.sessionsThisMonth} sessions this month</strong>
          </p>
        </div>

        {/* ── STATS ROW 1 ── */}
        <div className="flex gap-3">
          <div className="flex-1 rounded-card p-4" style={{ backgroundColor: "#FFD166" }}>
            <p className="font-mono text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(26,26,26,0.55)" }}>
              This month
            </p>
            <p className="font-mono font-black text-ink" style={{ fontSize: "38px", lineHeight: "1", letterSpacing: "-0.04em" }}>
              <span style={{ fontSize: "18px" }}>$</span>{MOCK.thisMonth}
            </p>
            <p className="font-mono text-xs mt-1" style={{ color: "#2D6A4A" }}>+ ${MOCK.vsLast} vs last</p>
          </div>
          <div className="flex-1 bg-white rounded-card shadow-card p-4">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-1">Ave room</p>
            <p className="font-mono font-black text-ink" style={{ fontSize: "34px", lineHeight: "1", letterSpacing: "-0.04em" }}>
              {MOCK.aveRoom}
            </p>
            <p className="font-mono text-xs text-muted mt-1">mates / session</p>
          </div>
        </div>

        {/* ── STATS ROW 2 ── */}
        <div className="flex gap-3">
          <div className="flex-1 bg-white rounded-card shadow-card p-4">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-1">Mates hosted</p>
            <p className="font-mono font-black text-ink" style={{ fontSize: "28px", lineHeight: "1", letterSpacing: "-0.04em" }}>{MOCK.matesHosted}</p>
          </div>
          <div className="flex-1 bg-white rounded-card shadow-card p-4">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-1">Repeat %</p>
            <p className="font-mono font-black text-ink" style={{ fontSize: "28px", lineHeight: "1", letterSpacing: "-0.04em" }}>{MOCK.repeatPct}%</p>
          </div>
        </div>

        {/* ── ADD SESSION BUTTON ── */}
        <Link
          href="/host/new-session"
          className="flex items-center justify-center w-full font-semibold text-white rounded-pill transition-all hover:brightness-110 active:scale-[0.98]"
          style={{ backgroundColor: "#2C8FE0", height: "54px", fontSize: "16px" }}
        >
          + Add a Stretchy session
        </Link>

        {/* ── LIVE SESSIONS HEADING ── */}
        <h2 className="font-display font-bold text-ink" style={{ fontSize: "22px" }}>
          Live sessions
        </h2>

        {/* ── SESSION CARD ── */}
        <div className="bg-white rounded-card shadow-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#4CAF82" }} />
                <span className="font-mono text-xs font-bold text-muted uppercase tracking-widest">
                  {LIVE_SESSION.status} · {LIVE_SESSION.day} {LIVE_SESSION.time}
                </span>
              </div>
              <div className="text-olive flex-shrink-0"><SMark size={28} /></div>
            </div>
            <h3 className="font-display font-bold text-ink leading-tight" style={{ fontSize: "22px" }}>
              {LIVE_SESSION.title}
            </h3>
            <p className="text-sm text-muted mt-0.5">
              {LIVE_SESSION.held} of {LIVE_SESSION.minimum} held · still room for {LIVE_SESSION.roomForMore} more
            </p>
          </div>

          <div className="p-4">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-3">
              How your price works
            </p>

            {/* Formula */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="font-mono text-sm font-bold px-3 py-1.5 rounded-pill text-ink" style={{ backgroundColor: "#FFD166" }}>
                TARGET ${LIVE_SESSION.target}
              </span>
              <span className="font-mono text-xs text-muted">+</span>
              <span className="font-mono text-sm font-bold px-3 py-1.5 rounded-pill text-ink" style={{ backgroundColor: "#F5EDE3" }}>
                FEE $20 + GST
              </span>
              <span className="font-mono text-xs text-muted">÷</span>
              <span className="font-mono text-sm font-bold px-3 py-1.5 rounded-pill text-ink" style={{ backgroundColor: "#F5EDE3" }}>
                {LIVE_SESSION.spots} SPOTS
              </span>
              <span className="font-mono text-xs text-muted">=</span>
              <span className="font-mono text-sm font-bold px-3 py-1.5 rounded-pill text-ink" style={{ backgroundColor: "#FFD166" }}>
                ${LIVE_SESSION.nowPrice} / SPOT
              </span>
            </div>

            <p className="text-xs text-muted leading-snug mb-3">
              The $20 + GST Stretchy fee never changes. Only the per-spot price moves with the room.
            </p>

            <HostPriceCurve />

            {/* Target hit row */}
            <div className="mt-3 rounded-card px-4 py-3 flex items-center justify-between" style={{ backgroundColor: "#E8F3FF" }}>
              <p className="text-sm font-bold" style={{ color: "#1A4A80" }}>YOU&apos;LL HIT YOUR TARGET</p>
              <p className="font-mono text-sm font-bold" style={{ color: "#1A4A80" }}>
                {LIVE_SESSION.spots} × ${LIVE_SESSION.nowPrice} + 1 = ${LIVE_SESSION.target}
              </p>
            </div>
          </div>
        </div>

        {/* ── PAYS MONDAY ── */}
        <div className="rounded-card p-5 flex items-center justify-between" style={{ backgroundColor: "#FFD166" }}>
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(26,26,26,0.55)" }}>
              Pays Monday
            </p>
            <p className="font-mono font-black text-ink" style={{ fontSize: "44px", lineHeight: "1", letterSpacing: "-0.04em" }}>
              <span style={{ fontSize: "22px" }}>$</span>{MOCK.paysMonday}
            </p>
            <p className="text-xs text-ink mt-1" style={{ opacity: 0.60 }}>2 sessions · statement →</p>
          </div>
          <div className="text-ink opacity-20 flex-shrink-0">
            <SMark size={72} />
          </div>
        </div>

      </div>
    </main>
  );
}
