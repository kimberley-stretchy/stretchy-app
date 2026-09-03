"use client";

import { useState } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";

export default function ModerationPage() {
  const [decision, setDecision] = useState<"none" | "approved" | "rejected">("none");

  return (
    <main className="min-h-screen bg-cream pb-20">
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/home" className="text-ink"><SMark size={28} /></Link>
          <Link href="/admin" className="text-muted hover:text-ink text-lg">←</Link>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill" style={{ backgroundColor: "#14110F" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-hot-blue flex-shrink-0" />
          <p className="font-mono text-xs font-bold text-white uppercase tracking-widest">Stretchy HQ · Moderation</p>
        </div>
        <p className="font-mono text-xs font-bold text-muted">12 LEFT</p>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-4">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.20em] text-muted mb-2">Never auto-publish · All human-reviewed</p>
          <h1 className="font-display font-bold text-ink" style={{ fontSize: "clamp(44px,12vw,58px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}>
            The queue.
          </h1>
        </div>

        {/* Video card (purple) */}
        <div className="rounded-card overflow-hidden relative" style={{ backgroundColor: "#902F8A", minHeight: "200px", border: "2px solid #14110F" }}>
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <span className="font-mono text-xs font-bold text-white uppercase tracking-widest" style={{ opacity: 0.75 }}>VIDEO · 0:23</span>
            <span className="font-mono text-xs font-bold text-white" style={{ opacity: 0.75 }}>2 / 12</span>
          </div>

          {/* Play area */}
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: "rgba(255,255,255,0.20)" }}>
              <span className="text-white text-2xl">▶</span>
            </div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-center" style={{ color: "rgba(255,255,255,0.75)" }}>
              Sunday Slow Flow · Grey Lynn
            </p>
          </div>
        </div>

        {/* Meta card */}
        <div className="bg-white rounded-card border-2 border-ink p-4">
          <p className="font-bold text-ink text-sm mb-0.5">From Marlee F. · Sunday Slow Flow</p>
          <p className="text-xs text-muted mb-3">Consent given · 14 mates in frame · uploaded 3h ago</p>

          {/* Consent flags */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: "#716F39" }}>✓</span>
              <p className="text-sm text-ink">No flagged content</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: "#716F39" }}>✓</span>
              <p className="text-sm text-ink">Faces opt-in</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: "#E96709" }}>⚠</span>
              <p className="text-sm text-ink" style={{ color: "#E96709" }}>Audio not consented</p>
            </div>
          </div>

          {/* Decision state */}
          {decision !== "none" && (
            <div className="rounded-card px-4 py-3 mb-4 text-center font-mono text-sm font-bold"
              style={{ backgroundColor: decision === "approved" ? "#E8F5F0" : "#FFEDED", color: decision === "approved" ? "#2D6A4A" : "#C6362E", border: "2px solid #14110F" }}>
              {decision === "approved" ? "✓ Approved — added to social pipeline" : "✕ Rejected — host notified"}
            </div>
          )}

          {/* Action buttons */}
          {decision === "none" && (
            <div className="flex gap-2">
              <button className="flex-1 font-mono text-xs font-bold rounded-pill border border-border text-ink hover:bg-sand-dark transition-all" style={{ height: "44px" }}>
                ↺ Re-upload
              </button>
              <button onClick={() => setDecision("rejected")}
                className="flex-1 font-mono text-xs font-bold text-white rounded-pill transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ backgroundColor: "#C6362E", height: "44px" }}>
                ✕ Reject
              </button>
              <button onClick={() => setDecision("approved")}
                className="flex-1 font-mono text-xs font-bold text-white rounded-pill transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ backgroundColor: "#716F39", height: "44px" }}>
                ✓ Approve
              </button>
            </div>
          )}

          <p className="text-xs text-muted text-center mt-3 leading-snug">
            Approved content goes to the social pipeline. Mute audio before push if needed.
          </p>
        </div>
      </div>
    </main>
  );
}
