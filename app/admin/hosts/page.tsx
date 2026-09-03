"use client";

import { useState } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";

type HostStatus = "STAR" | "STEADY" | "AT RISK";

const HOSTS = [
  { id: "h1", initial: "T", color: "#0000FF", name: "Tāne Ratima",  type: "Vinyasa", sessions: 47, earned: 5840, health: 96, status: "STAR" as HostStatus },
  { id: "h2", initial: "M", color: "#902F8A", name: "Marlee Fisher", type: "Sunrise", sessions: 21, earned: 3920, health: 88, status: "STAR" as HostStatus },
  { id: "h3", initial: "A", color: "#E96709", name: "Alex Kim",      type: "Breath",  sessions: 24, earned: 2960, health: 78, status: "STEADY" as HostStatus },
  { id: "h4", initial: "R", color: "#716F39", name: "Rua Ohia",      type: "Sound",   sessions: 18, earned: 2200, health: 72, status: "STEADY" as HostStatus },
  { id: "h5", initial: "P", color: "#902F8A", name: "Pip Carter",    type: "Run + Stretch", sessions: 6, earned: 720, health: 42, status: "AT RISK" as HostStatus },
];

const STATUS_STYLE: Record<HostStatus, { bg: string; text: string }> = {
  "STAR":    { bg: "#FCBB16", text: "#14110F" },
  "STEADY":  { bg: "#E8F3FF", text: "#0000FF" },
  "AT RISK": { bg: "#C6362E", text: "#fff" },
};

const healthColor = (h: number) => {
  if (h >= 80) return "#716F39";
  if (h >= 60) return "#FCBB16";
  return "#C6362E";
};

type Filter = "ALL" | "STARS" | "STEADY" | "AT RISK";
const FILTERS: Filter[] = ["ALL", "STARS", "STEADY", "AT RISK"];

export default function HostCRMPage() {
  const [filter, setFilter] = useState<Filter>("ALL");

  const filtered = HOSTS.filter((h) => {
    if (filter === "ALL") return true;
    if (filter === "STARS") return h.status === "STAR";
    if (filter === "STEADY") return h.status === "STEADY";
    if (filter === "AT RISK") return h.status === "AT RISK";
    return true;
  });

  return (
    <main className="min-h-screen bg-cream pb-20">
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/home" className="text-ink"><SMark size={28} /></Link>
          <Link href="/admin" className="text-muted hover:text-ink text-lg">←</Link>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill" style={{ backgroundColor: "#14110F" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-hot-blue flex-shrink-0" />
          <p className="font-mono text-xs font-bold text-white uppercase tracking-widest">Stretchy HQ · Hosts</p>
        </div>
        <button className="text-muted hover:text-ink text-xl">🔍</button>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-4">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.20em] text-muted mb-2">42 active · 2 at risk · 1 vetting renewal due</p>
          <h1 className="font-display font-bold text-ink" style={{ fontSize: "clamp(44px,12vw,58px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}>
            The bench.
          </h1>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className="font-mono text-xs font-bold px-4 py-2 rounded-pill whitespace-nowrap flex-shrink-0 transition-all"
              style={{ backgroundColor: filter === f ? "#14110F" : "#F7F0E8", color: filter === f ? "#fff" : "#14110F", border: filter === f ? "none" : "1px solid #E0D9D0" }}>
              {f === "ALL" ? "ALL · 42" : f === "STARS" ? "STARS · 11" : f === "STEADY" ? "STEADY · 22" : "AT RISK"}
            </button>
          ))}
        </div>

        {/* Host cards */}
        <div className="space-y-3">
          {filtered.map((h) => {
            const ss = STATUS_STYLE[h.status];
            const isAtRisk = h.status === "AT RISK";
            return (
              <div key={h.id} className="bg-white rounded-card border-2 border-ink p-4"
                style={isAtRisk ? { border: "1.5px solid #C6362E" } : undefined}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0" style={{ backgroundColor: h.color }}>
                    {h.initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-ink text-sm">{h.name}</p>
                    <p className="font-mono text-xs text-muted">{h.type} · {h.sessions} sessions · ${h.earned.toLocaleString()}</p>
                  </div>
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-pill flex-shrink-0"
                    style={{ backgroundColor: ss.bg, color: ss.text }}>
                    {h.status}
                  </span>
                </div>
                {/* Health bar */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">Health</p>
                    <p className="font-mono text-xs font-bold" style={{ color: healthColor(h.health) }}>{h.health}</p>
                  </div>
                  <div className="w-full h-2 rounded-full" style={{ backgroundColor: "#F7F0E8" }}>
                    <div className="h-2 rounded-full transition-all" style={{ width: `${h.health}%`, backgroundColor: healthColor(h.health) }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
