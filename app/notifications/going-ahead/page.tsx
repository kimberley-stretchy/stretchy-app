"use client";

import Link from "next/link";
import SMark from "@/components/SMark";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK = {
  sessionTitle: "Sunday Slow Flow",
  host: "Tāne Ratima",
  hostFirst: "Tāne",
  neighbourhood: "Grey Lynn",
  day: "SUN",
  time: "9:00 AM",
  wasPrice: 28,
  currentPrice: 23,
  socialVenue: "Little Bird Café next door",
};

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function GoingAheadPage() {
  const saving = MOCK.wasPrice - MOCK.currentPrice;

  return (
    <main className="min-h-screen pb-20" style={{ backgroundColor: "#2C8FE0" }}>

      {/* ── NAV ── */}
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <Link href="/home" className="text-white opacity-90">
          <SMark size={28} />
        </Link>
        <p className="font-mono text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.65)" }}>
          Notification · 24H Before
        </p>
        <button
          className="w-8 h-8 rounded-full flex items-center justify-center text-xl font-light transition-all hover:bg-white/20"
          style={{ color: "rgba(255,255,255,0.75)", backgroundColor: "rgba(255,255,255,0.15)" }}
          aria-label="Dismiss"
        >
          ×
        </button>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-4">

        {/* ── BIG HEADLINE ── */}
        <h1
          className="font-display font-bold text-white"
          style={{ fontSize: "clamp(62px, 18vw, 84px)", letterSpacing: "-0.04em", lineHeight: "0.90" }}
        >
          Going<br />ahead.
        </h1>

        <p className="text-white leading-snug" style={{ fontSize: "18px", opacity: 0.85 }}>
          Minimum hit. Your session's happening.
        </p>

        {/* ── SESSION CARD ── */}
        <div className="bg-white rounded-card p-4 space-y-4">

          {/* Confirmed row */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#4CAF82" }} />
            <span className="font-mono text-xs font-bold text-muted uppercase tracking-wide">
              Confirmed · {MOCK.day} {MOCK.time}
            </span>
          </div>

          {/* Session title + S-mark */}
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display font-bold text-ink leading-tight" style={{ fontSize: "26px" }}>
                {MOCK.sessionTitle}
              </h2>
              <p className="text-sm text-muted mt-0.5">{MOCK.host} · {MOCK.neighbourhood}</p>
            </div>
            <div className="text-olive flex-shrink-0"><SMark size={44} /></div>
          </div>

          {/* Yellow price sub-card */}
          <div className="rounded-card p-4" style={{ backgroundColor: "#FFD166" }}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(26,26,26,0.55)" }}>
                Current Price
              </span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#2D6A4A" }} />
                <span className="font-mono text-xs font-bold uppercase tracking-wider" style={{ color: "#2D6A4A" }}>
                  May still fall
                </span>
              </div>
            </div>
            <div className="flex items-start">
              <span className="font-mono font-black text-ink" style={{ fontSize: "26px", lineHeight: "1", marginTop: "10px", marginRight: "2px" }}>$</span>
              <span className="font-mono font-black text-ink" style={{ fontSize: "76px", lineHeight: "1", letterSpacing: "-0.04em" }}>
                {MOCK.currentPrice}
              </span>
            </div>
            <p className="text-sm text-ink mt-1" style={{ opacity: 0.60 }}>
              Was ${MOCK.wasPrice} · You&apos;re saving ${saving} so far.
            </p>
          </div>

          {/* Body copy */}
          <p className="text-sm text-muted leading-relaxed">
            People can still join up to <strong className="text-ink">2 hours before</strong>, so your price may keep dropping. Price locks 2 hours before — that&apos;s when you&apos;re charged.
          </p>
        </div>

        {/* ── BRING A MATE BUTTON ── */}
        <button
          className="w-full font-semibold rounded-pill transition-all active:scale-[0.98] hover:bg-white/10"
          style={{
            border: "1.5px solid rgba(255,255,255,0.55)",
            color: "#fff",
            height: "52px",
            fontSize: "15px",
            backgroundColor: "transparent",
          }}
        >
          + Bring a mate — drop the price again
        </button>

        {/* ── SOCIAL STRETCH TEASER ── */}
        <div className="bg-white rounded-card p-4 flex items-center gap-3">
          <span className="text-2xl flex-shrink-0">🤙</span>
          <p className="text-sm text-ink leading-snug">
            <strong>{MOCK.hostFirst}</strong> is heading to {MOCK.socialVenue} after. Come along.
          </p>
        </div>

      </div>
    </main>
  );
}
