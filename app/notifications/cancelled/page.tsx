"use client";

import Link from "next/link";
import SMark from "@/components/SMark";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK = {
  sessionTitle: "Sunday Slow Flow",
  day: "SUN",
  time: "9am",
};

const STILL_ON = [
  { id: "2", title: "Ponsonby Pilates",  day: "THU 28 · 6:30 AM", initial: "P", color: "#2A3FE0" },
  { id: "1", title: "Herne Bay Breath",  day: "WED 27 · 7:00 PM", initial: "B", color: "#7A8330" },
];

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function CancelledPage() {
  return (
    <main className="min-h-screen bg-cream pb-20">

      {/* ── NAV ── */}
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <Link href="/home" className="text-ink"><SMark size={28} /></Link>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">
          Notification · 24H Check
        </p>
        <button className="text-muted hover:text-ink text-2xl font-light transition-colors leading-none" aria-label="Dismiss">
          ×
        </button>
      </nav>

      <div className="px-4 max-w-lg mx-auto">

        {/* ── EYEBROW ── */}
        <p className="font-mono text-xs font-bold uppercase tracking-[0.20em] text-muted mb-3">
          Didn&apos;t hit the floor this time
        </p>

        {/* ── HEADLINE ── */}
        <h1
          className="font-display font-bold text-ink mb-5"
          style={{ fontSize: "clamp(52px, 14vw, 68px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}
        >
          Not<br />this time.
        </h1>

        {/* ── BODY TEXT ── */}
        <p className="text-sm text-ink leading-relaxed mb-6">
          <strong>{MOCK.sessionTitle}</strong> didn&apos;t have enough people.
          Your hold&apos;s released. Nothing charged. We hope to see you at the next one.
        </p>

        {/* ── RECEIPT CARD ── */}
        <div className="bg-white rounded-card shadow-card mb-4 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
            <span className="text-sm text-ink">{MOCK.sessionTitle} · {MOCK.day} {MOCK.time}</span>
            <span className="font-mono text-xs font-bold text-muted tracking-wide">HOLD</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-muted">Charged to card</span>
            <span className="font-mono font-bold text-base" style={{ color: "#4CAF82" }}>$0.00</span>
          </div>
        </div>

        {/* ── FLOAT IT PURPLE CARD ── */}
        <div className="rounded-card p-5 mb-6" style={{ backgroundColor: "#A535C7" }}>
          <p
            className="font-mono text-xs font-bold uppercase tracking-[0.18em] mb-2"
            style={{ color: "rgba(255,255,255,0.60)" }}
          >
            Want it to happen?
          </p>
          <h2
            className="font-display font-bold text-white leading-tight mb-2"
            style={{ fontSize: "26px" }}
          >
            Float it to the community.
          </h2>
          <p className="text-sm text-white leading-snug mb-5" style={{ opacity: 0.80 }}>
            Add it to the suggestion list. Hosts watch this — if enough mates vote, it gets picked up.
          </p>
          <button className="w-full bg-white text-ink font-semibold rounded-pill py-3.5 text-sm transition-all hover:bg-cream active:scale-[0.98]">
            + Add to suggestions
          </button>
        </div>

        {/* ── STILL ON THIS WEEK ── */}
        <h3 className="font-display font-bold text-ink mb-3" style={{ fontSize: "22px" }}>
          Still on this week
        </h3>

        <div className="space-y-2">
          {STILL_ON.map((s) => (
            <Link key={s.id} href={`/sessions/${s.id}`} className="block group">
              <div className="bg-white rounded-card shadow-card p-4 flex items-center gap-3 group-hover:shadow-card-hover transition-shadow duration-200">
                {/* Type circle */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                  style={{ backgroundColor: s.color }}
                >
                  {s.initial}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-ink text-sm">{s.title}</p>
                  <p className="font-mono text-xs text-muted mt-0.5">{s.day}</p>
                </div>
                {/* Chevron */}
                <span className="text-muted text-lg">›</span>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </main>
  );
}
