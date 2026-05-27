"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SMark from "@/components/SMark";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK = {
  sessionTitle: "Sat Sunrise",
  youNeed: 8,
  youveGot: 5,
  locksInSeconds: 3600, // 1 hour — alerted at 25hrs out, lock-in at 24hrs
  currentStartPrice: 28,
  newMinimum: 5,
  newStartPrice: 44,
};

// ─── COUNTDOWN ────────────────────────────────────────────────────────────────
function useCountdown(initialSeconds: number) {
  const [seconds, setSeconds] = useState(initialSeconds);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function FloorNotMetPage() {
  const router = useRouter();
  const countdown = useCountdown(MOCK.locksInSeconds);
  const [applied, setApplied] = useState(false);

  return (
    <main className="min-h-screen bg-cream pb-20">

      {/* ── NAV ── */}
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/home" className="text-ink"><SMark size={28} /></Link>
          <Link href="/host/dashboard" className="text-muted hover:text-ink text-lg transition-colors" aria-label="Back">←</Link>
        </div>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">25H Alert</p>
        <Link href="/host/inbox" className="flex items-center px-3 py-1.5 rounded-pill relative" style={{ backgroundColor: "#F5EDE3", border: "1px solid #D4CFC9" }} aria-label="Notifications">
          <span className="text-base">🔔</span>
          <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-hot-blue border-2 border-cream block" />
        </Link>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-4">

        {/* ── BIG ORANGE CARD ── */}
        <div
          className="rounded-card p-6 relative overflow-hidden"
          style={{ backgroundColor: "#FF6B35" }}
        >
          {/* Watermark S */}
          <div className="absolute right-[-20px] bottom-[-20px] opacity-10 text-white">
            <SMark size={140} />
          </div>

          <p
            className="font-mono text-xs font-bold uppercase tracking-[0.18em] mb-3"
            style={{ color: "rgba(255,255,255,0.65)" }}
          >
            25H Alert · Short of Floor
          </p>

          <h1
            className="font-display font-bold text-white mb-3"
            style={{ fontSize: "clamp(40px, 11vw, 54px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}
          >
            Short of<br />the floor.
          </h1>

          <p className="text-sm text-white mb-5" style={{ opacity: 0.75 }}>
            You have <strong>1 hour</strong> to make your call. At 24 hours out it locks — holds convert to charges and the session&apos;s confirmed.
          </p>

          {/* YOU NEED / YOU'VE GOT */}
          <div className="flex items-end gap-8 mb-6">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.65)" }}>
                You need
              </p>
              <p className="font-mono font-black text-white" style={{ fontSize: "72px", lineHeight: "1", letterSpacing: "-0.04em" }}>
                {MOCK.youNeed}
              </p>
            </div>
            <div className="pb-2">
              <p className="font-mono text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.65)" }}>
                You&apos;ve got
              </p>
              <p className="font-mono font-black text-white" style={{ fontSize: "72px", lineHeight: "1", letterSpacing: "-0.04em" }}>
                {MOCK.youveGot}
              </p>
            </div>
          </div>

          {/* Countdown */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.65)" }}>
                24H lock-in in
              </p>
              <p className="font-mono text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>
                Decide before this runs out
              </p>
            </div>
            <p className="font-mono font-black text-white" style={{ fontSize: "28px", letterSpacing: "0.04em" }}>
              {countdown}
            </p>
          </div>
        </div>

        {/* ── YOUR MOVES ── */}
        <h2 className="font-display font-bold text-ink" style={{ fontSize: "22px" }}>
          Your moves
        </h2>

        {/* OPTION 1 · SHARE IT (blue) */}
        <div className="rounded-card p-5" style={{ backgroundColor: "#2C8FE0" }}>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] mb-2" style={{ color: "rgba(255,255,255,0.65)" }}>
            Option 1 · Fastest
          </p>
          <h3 className="font-display font-bold text-white mb-2" style={{ fontSize: "26px", letterSpacing: "-0.03em" }}>
            Share it.
          </h3>
          <p className="text-sm text-white mb-5" style={{ opacity: 0.80 }}>
            Send the link. Tell three mates. 3 more holds = your session&apos;s on, locked at ${MOCK.currentStartPrice} or better.
          </p>
          <div className="flex gap-3">
            <button
              className="flex-1 flex items-center justify-center gap-1.5 font-semibold text-ink rounded-pill transition-all hover:brightness-95 active:scale-[0.98]"
              style={{ backgroundColor: "#F5EDE3", height: "48px", fontSize: "14px" }}
            >
              ↗ Share link
            </button>
            <button
              className="flex-1 flex items-center justify-center font-semibold rounded-pill transition-all hover:bg-white/10 active:scale-[0.98]"
              style={{ border: "1.5px solid rgba(255,255,255,0.55)", color: "#fff", height: "48px", fontSize: "14px" }}
            >
              Copy
            </button>
          </div>
        </div>

        {/* OPTION 2 · LOWER THE FLOOR (yellow) */}
        <div className="rounded-card p-5" style={{ backgroundColor: "#FFD166" }}>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] mb-2" style={{ color: "rgba(26,26,26,0.55)" }}>
            Option 2 · Adjust
          </p>
          <h3 className="font-display font-bold text-ink mb-2" style={{ fontSize: "26px", letterSpacing: "-0.03em" }}>
            Lower the floor.
          </h3>
          <p className="text-sm text-ink mb-4" style={{ opacity: 0.70 }}>
            Drop the minimum or your target. Existing holders keep their price or better.
          </p>

          {/* New minimum display (black) */}
          <div className="rounded-card p-4 mb-4" style={{ backgroundColor: "#1A1A1A" }}>
            <p className="font-mono text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.50)" }}>
              New Minimum
            </p>
            <p className="font-mono font-black text-white" style={{ fontSize: "36px", lineHeight: "1", letterSpacing: "-0.04em" }}>
              {MOCK.newMinimum} <span className="text-base font-normal" style={{ color: "rgba(255,255,255,0.55)" }}>spots · ${MOCK.newStartPrice} start price</span>
            </p>
          </div>

          <button
            className="w-full font-semibold text-white rounded-pill transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ backgroundColor: "#1A1A1A", height: "50px", fontSize: "15px" }}
            onClick={() => setApplied(true)}
          >
            {applied ? "✓ Floor lowered" : "Apply lower floor"}
          </button>
        </div>

        {/* OPTION 3 · CANCEL (white) */}
        <div className="bg-white rounded-card shadow-card p-5">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-muted mb-2">
            Option 3 · Call it
          </p>
          <h3 className="font-display font-bold text-ink mb-2" style={{ fontSize: "26px", letterSpacing: "-0.03em" }}>
            Cancel.
          </h3>
          <p className="text-sm text-muted mb-5 leading-snug">
            Holds released. Nothing charged. Slot freed up for next week.
          </p>
          <button
            className="w-full font-semibold text-ink rounded-pill transition-all hover:bg-sand-dark active:scale-[0.98]"
            style={{ border: "1.5px solid #D4CFC9", height: "50px", fontSize: "15px" }}
            onClick={() => router.push("/host/dashboard")}
          >
            Cancel session
          </button>
        </div>

        {/* ── DO NOTHING FOOTER ── */}
        <p className="text-xs text-center text-muted leading-relaxed pb-4">
          Do nothing? Auto-cancels at lock-in. Everyone notified. No one charged. Doesn&apos;t count against your slots.
        </p>

      </div>
    </main>
  );
}
