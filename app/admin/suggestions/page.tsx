"use client";

import Link from "next/link";
import SMark from "@/components/SMark";

type MatchStatus = "NOTIFY" | "NO MATCH" | "NOTIFIED";

interface Suggestion {
  id: string; emoji: string; emojiBg: string; title: string;
  type: string; votes: number; matchHost: string | null; matchStatus: MatchStatus;
}

const SUGGESTIONS: Suggestion[] = [
  { id: "s1", emoji: "⚡", emojiBg: "#902F8A",  title: "Sunset HIIT at the viaduct",  type: "HIIT",    votes: 47, matchHost: "Alex K.",  matchStatus: "NOTIFY" },
  { id: "s2", emoji: "Y",  emojiBg: "#902F8A",  title: "Te Atatū Sunday yoga",         type: "YOGA",    votes: 32, matchHost: null,        matchStatus: "NO MATCH" },
  { id: "s3", emoji: "R",  emojiBg: "#C6362E",  title: "Run-then-stretch, Ponsonby",   type: "RUN",     votes: 28, matchHost: "Pip C.",    matchStatus: "NOTIFIED" },
  { id: "s4", emoji: "P",  emojiBg: "#0000FF",  title: "Lunch pilates in the CBD",     type: "PILATES", votes: 19, matchHost: "Jess M.",   matchStatus: "NOTIFIED" },
  { id: "s5", emoji: "🎵", emojiBg: "#29ABE2",  title: "Cold plunge + sound bath",     type: "SOUND",   votes: 14, matchHost: null,        matchStatus: "NO MATCH" },
];

const MATCH_STYLE: Record<MatchStatus, { bg: string; text: string }> = {
  "NOTIFY":   { bg: "#0000FF", text: "#fff" },
  "NO MATCH": { bg: "#F7F0E8", text: "#9A9590" },
  "NOTIFIED": { bg: "#E8F5F0", text: "#2D6A4A" },
};

export default function SuggestionsPage() {
  return (
    <main className="min-h-screen bg-cream pb-20">
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/home" className="text-ink"><SMark size={28} /></Link>
          <Link href="/admin" className="text-muted hover:text-ink text-lg">←</Link>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill" style={{ backgroundColor: "#14110F" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-hot-blue flex-shrink-0" />
          <p className="font-mono text-xs font-bold text-white uppercase tracking-widest">Stretchy HQ · Suggestions</p>
        </div>
        <Link href="/notifications" className="flex items-center px-3 py-1.5 rounded-pill relative" style={{ backgroundColor: "#F7F0E8", border: "1px solid #D4CFC9" }} aria-label="Notifications">
          <span className="text-base">🔔</span>
        </Link>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-4">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.20em] text-muted mb-2">5 live · 2 hot · 140 total votes</p>
          <h1 className="font-display font-bold text-ink" style={{ fontSize: "clamp(36px,10vw,50px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}>
            What people<br />want next.
          </h1>
        </div>

        <div className="space-y-3">
          {SUGGESTIONS.map((s) => {
            const ms = MATCH_STYLE[s.matchStatus];
            return (
              <div key={s.id} className="bg-white rounded-card border-2 border-ink p-4 flex items-center gap-3">
                {/* Icon */}
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-base flex-shrink-0"
                  style={{ backgroundColor: s.emojiBg }}>
                  {s.emoji}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-ink text-sm leading-tight">{s.title}</p>
                  <p className="font-mono text-xs text-muted mt-0.5">{s.type} · {s.votes} VOTES</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <p className="text-xs text-muted">{s.matchHost ? `Best match: ${s.matchHost}` : "No matching host yet"}</p>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-pill flex-shrink-0"
                      style={{ backgroundColor: ms.bg, color: ms.text }}>
                      {s.matchStatus}
                    </span>
                  </div>
                </div>
                {/* Vote count */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-mono font-black text-white flex-shrink-0"
                  style={{ backgroundColor: "#0000FF", fontSize: "15px" }}>
                  {s.votes}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
