"use client";

import Link from "next/link";
import SMark from "@/components/SMark";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK = {
  id: "1",
  sessionTitle: "Sunday Slow Flow",
  host: { name: "Tāne", fullName: "Tāne Ratima", initial: "T" },
  venue: "Little Bird Café",
  venueAddress: "3 Westmoreland St West, Grey Lynn",
  mates: [
    { initial: "S", color: "#A535C7" },
    { initial: "J", color: "#2A3FE0" },
    { initial: "R", color: "#7A8330" },
    { initial: "K", color: "#E63946" },
    { initial: "M", color: "#2C8FE0" },
  ],
  extraMates: 5,
};

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function SocialStretchPage({ params }: { params: { id: string } }) {
  return (
    <main className="min-h-screen bg-cream pb-24">

      {/* ── NAV ── */}
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <Link href="/home" className="text-ink"><SMark size={28} /></Link>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">
          05 · Social Stretch
        </p>
        <Link href={`/sessions/${params.id}`} className="text-muted hover:text-ink text-lg transition-colors" aria-label="Back">
          ×
        </Link>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-4">

        {/* ── EYEBROW ── */}
        <p className="font-mono text-xs font-bold uppercase tracking-[0.20em] text-muted">
          Session done ✌️
        </p>

        {/* ── HEADLINE ── */}
        <h1
          className="font-display font-bold text-ink"
          style={{ fontSize: "clamp(52px, 14vw, 68px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}
        >
          Social<br />stretch?
        </h1>

        {/* ── VENUE CARD (blue) ── */}
        <div
          className="rounded-card p-5 relative overflow-hidden"
          style={{ backgroundColor: "#2C8FE0" }}
        >
          {/* S-mark watermark */}
          <div className="absolute right-[-16px] top-[-12px] opacity-10" style={{ color: "#fff" }}>
            <SMark size={100} />
          </div>

          <p
            className="font-mono text-xs font-bold uppercase tracking-[0.18em] mb-2"
            style={{ color: "rgba(255,255,255,0.65)" }}
          >
            Social Stretch 🤙
          </p>
          <h2
            className="font-display font-bold text-white leading-tight mb-1"
            style={{ fontSize: "26px" }}
          >
            {MOCK.venue}
          </h2>
          <p className="text-sm text-white mb-5" style={{ opacity: 0.75 }}>
            {MOCK.venueAddress}
          </p>

          {/* Avatar row */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex -space-x-2">
              {MOCK.mates.map((m, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs border-2"
                  style={{ backgroundColor: m.color, borderColor: "#2C8FE0", zIndex: MOCK.mates.length - i }}
                >
                  {m.initial}
                </div>
              ))}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs border-2"
                style={{ backgroundColor: "rgba(255,255,255,0.25)", borderColor: "#2C8FE0" }}
              >
                +{MOCK.extraMates}
              </div>
            </div>
            <p className="text-sm text-white" style={{ opacity: 0.80 }}>
              from your session are heading there
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <Link
              href={`/rate/${params.id}`}
              className="flex-1 flex items-center justify-center font-semibold text-ink rounded-pill transition-all hover:brightness-95 active:scale-[0.98]"
              style={{ backgroundColor: "#F5EDE3", height: "50px", fontSize: "15px" }}
            >
              Follow along →
            </Link>
            <Link
              href={`/rate/${params.id}`}
              className="flex-1 flex items-center justify-center font-semibold rounded-pill transition-all hover:bg-white/10 active:scale-[0.98]"
              style={{
                border: "1.5px solid rgba(255,255,255,0.55)",
                color: "#fff",
                height: "50px",
                fontSize: "15px",
              }}
            >
              Maybe next time
            </Link>
          </div>
        </div>

        {/* ── SAY HI MATE CARD ── */}
        <div className="bg-white rounded-card shadow-card p-4">
          <p
            className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-muted mb-3"
          >
            SAY HI ✦ From your session
          </p>

          <div className="flex items-center gap-3">
            {/* Host avatar */}
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-lg flex-shrink-0"
              style={{ backgroundColor: "#2C8FE0" }}
            >
              {MOCK.host.initial}
            </div>

            <div className="flex-1">
              <p className="font-bold text-ink">{MOCK.host.fullName}</p>
              <p className="text-sm text-muted">Your host today</p>
            </div>

            <button
              className="font-mono text-xs font-bold px-4 py-2 rounded-pill text-white transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ backgroundColor: "#2C8FE0" }}
            >
              Wave 👋
            </button>
          </div>

          {/* Mate rows */}
          {MOCK.mates.slice(0, 3).map((m, i) => (
            <div key={i} className="flex items-center gap-3 mt-3 pt-3 border-t border-border">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                style={{ backgroundColor: m.color }}
              >
                {m.initial}
              </div>
              <div className="flex-1">
                <p className="font-bold text-ink text-sm">Mate {m.initial}</p>
                <p className="text-xs text-muted">Also at session</p>
              </div>
              <button
                className="font-mono text-xs font-bold px-3 py-1.5 rounded-pill border border-border text-ink transition-all hover:bg-sand-dark active:scale-[0.98]"
              >
                Wave 👋
              </button>
            </div>
          ))}
        </div>

        {/* ── PAY IT FORWARD CARD (yellow) ── */}
        <div className="rounded-card p-5" style={{ backgroundColor: "#FFD166" }}>
          <p
            className="font-mono text-xs font-bold uppercase tracking-[0.18em] mb-2"
            style={{ color: "rgba(26,26,26,0.55)" }}
          >
            Pay it Forward
          </p>
          <h2
            className="font-display font-bold text-ink leading-tight mb-1"
            style={{ fontSize: "22px" }}
          >
            Loved the session?
          </h2>
          <p className="text-sm text-ink mb-4" style={{ opacity: 0.70 }}>
            Tip {MOCK.host.name} directly — 100% goes to them.
          </p>

          {/* Tip buttons */}
          <div className="flex gap-2 mb-3">
            <button
              className="flex-1 font-mono text-sm font-bold rounded-pill text-white transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ backgroundColor: "#1A1A1A", height: "44px" }}
            >
              Tip {MOCK.host.name} $5
            </button>
            <button
              className="flex-1 font-mono text-sm font-bold rounded-pill text-ink transition-all hover:bg-black/10 active:scale-[0.98]"
              style={{ border: "1.5px solid rgba(26,26,26,0.35)", height: "44px" }}
            >
              $10
            </button>
            <button
              className="flex-1 font-mono text-sm font-bold rounded-pill text-ink transition-all hover:bg-black/10 active:scale-[0.98]"
              style={{ border: "1.5px solid rgba(26,26,26,0.35)", height: "44px" }}
            >
              $20
            </button>
          </div>
          <button
            className="w-full font-mono text-sm font-bold rounded-pill text-ink transition-all hover:bg-black/10 active:scale-[0.98]"
            style={{ border: "1.5px solid rgba(26,26,26,0.35)", height: "44px" }}
          >
            Custom amount
          </button>
        </div>

        {/* ── RATE SESSION NUDGE ── */}
        <Link href={`/rate/${params.id}`} className="block">
          <div className="bg-white rounded-card shadow-card p-4 flex items-center gap-3 group hover:shadow-card-hover transition-shadow duration-200">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0"
              style={{ backgroundColor: "#F5EDE3" }}
            >
              ⭐
            </div>
            <div className="flex-1">
              <p className="font-bold text-ink text-sm">Rate your session</p>
              <p className="text-xs text-muted">Helps {MOCK.host.name} and the community</p>
            </div>
            <span className="text-muted text-lg">›</span>
          </div>
        </Link>

      </div>
    </main>
  );
}
