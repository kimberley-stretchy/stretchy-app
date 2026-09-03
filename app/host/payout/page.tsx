"use client";

import Link from "next/link";
import SMark from "@/components/SMark";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK = {
  month: "May '26",
  bankName: "ANZ",
  bankLast4: "2847",
  netToYou: 800,
  sessions: 4,
  spotsTotal: 40,
  vsLast: 23,
  totalFees: 92,
};

const BREAKDOWN = [
  { title: "Sunday Slow Flow",  spots: 11, pricePerSpot: 21, earned: 200, fee: 23 },
  { title: "Pt Chev Sunrise",   spots: 9,  pricePerSpot: 25, earned: 200, fee: 23 },
  { title: "Sunday Slow Flow",  spots: 8,  pricePerSpot: 28, earned: 200, fee: 23 },
  { title: "Pt Chev Sunrise",   spots: 12, pricePerSpot: 19, earned: 200, fee: 23 },
];

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function MonthlyPayoutPage() {
  return (
    <main className="min-h-screen bg-cream pb-20">

      {/* ── NAV ── */}
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/home" className="text-ink"><SMark size={28} /></Link>
          <Link href="/host/dashboard" className="text-muted hover:text-ink text-lg transition-colors">←</Link>
        </div>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">
          Payout · {MOCK.month}
        </p>
        <button className="text-muted hover:text-ink transition-colors text-lg" aria-label="Info">
          ⓘ
        </button>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-5">

        {/* ── BANK LABEL ── */}
        <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-muted">
          Pays Monday · {MOCK.bankName} · {MOCK.bankLast4}
        </p>

        {/* ── HEADLINE ── */}
        <h1
          className="font-display font-bold text-ink"
          style={{ fontSize: "clamp(38px, 10vw, 52px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}
        >
          This month,<br />you earned.
        </h1>

        {/* ── BIG YELLOW EARNED CARD ── */}
        <div className="rounded-card p-5" style={{ backgroundColor: "#FCBB16", border: "2px solid #14110F" }}>
          <p className="font-mono text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(26,26,26,0.55)" }}>
            Net to you
          </p>

          {/* Giant number */}
          <div className="flex items-start mb-3">
            <span
              className="font-mono font-black text-ink"
              style={{ fontSize: "28px", lineHeight: "1", marginTop: "14px", marginRight: "3px" }}
            >
              $
            </span>
            <span
              className="font-mono font-black text-ink"
              style={{ fontSize: "96px", lineHeight: "0.9", letterSpacing: "-0.05em" }}
            >
              {MOCK.netToYou}
            </span>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm text-ink" style={{ opacity: 0.65 }}>
              {MOCK.sessions} sessions
            </span>
            <span className="font-mono text-sm text-ink" style={{ opacity: 0.40 }}>·</span>
            <span className="font-mono text-sm text-ink" style={{ opacity: 0.65 }}>
              {MOCK.spotsTotal} spots filled
            </span>
            <span className="font-mono text-sm text-ink" style={{ opacity: 0.40 }}>·</span>
            <span className="font-mono text-sm font-bold" style={{ color: "#2D6A4A" }}>
              +{MOCK.vsLast}% vs last
            </span>
          </div>
        </div>

        {/* ── BREAKDOWN ── */}
        <div>
          <h2 className="font-display font-bold text-ink mb-3" style={{ fontSize: "22px" }}>
            Breakdown
          </h2>

          <div className="bg-white rounded-card border-2 border-ink divide-y divide-border">
            {BREAKDOWN.map((s, i) => (
              <div key={i} className="px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-ink text-sm">{s.title}</p>
                    <p className="font-mono text-xs text-muted mt-0.5">
                      {s.spots} SPOTS · ${s.pricePerSpot}/SPOT
                    </p>
                    <p className="font-mono text-xs mt-0.5" style={{ color: "#9A9590" }}>
                      Fee ${s.fee}
                    </p>
                  </div>
                  <p className="font-mono font-bold text-ink text-base flex-shrink-0">
                    ${s.earned}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Fee note */}
          <div className="flex items-start gap-3 mt-4 px-1">
            <span className="text-base flex-shrink-0">💰</span>
            <p className="text-xs text-muted leading-snug">
              $20 + GST per session, never a percentage. Total fees this month: <strong className="text-ink">${MOCK.totalFees}</strong>.
            </p>
          </div>
        </div>

        {/* ── CTA BUTTONS ── */}
        <div className="flex gap-3 pb-4">
          <button
            className="flex-1 font-mono text-xs font-bold text-ink rounded-pill border border-border py-3.5 transition-all hover:bg-sand-dark active:scale-[0.98]"
          >
            Edit bank
          </button>
          <button
            className="flex-1 font-mono text-xs font-bold text-white rounded-pill py-3.5 transition-all hover:brightness-110 active:scale-[0.98] flex items-center justify-center gap-1.5"
            style={{ backgroundColor: "#14110F" }}
          >
            ↓ Download statement
          </button>
        </div>

      </div>
    </main>
  );
}
