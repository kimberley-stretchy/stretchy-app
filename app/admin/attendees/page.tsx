"use client";

import { useState } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";

const ATTENDEES = [
  { id: "a1", initial: "M", color: "#A535C7", name: "Marlee Fisher", neighbourhood: "Grey Lynn", sessions: 27, mates: 41, lifetime: 612, vip: true },
  { id: "a2", initial: "K", color: "#2C8FE0", name: "Kit Petersen",  neighbourhood: "Pt Chev",   sessions: 22, mates: 38, lifetime: 482, vip: false },
  { id: "a3", initial: "A", color: "#FF6B35", name: "Ari Tipene",    neighbourhood: "Ponsonby",  sessions: 18, mates: 22, lifetime: 410, vip: false },
  { id: "a4", initial: "S", color: "#7A8330", name: "Sam Wallace",   neighbourhood: "Herne Bay", sessions: 14, mates: 19, lifetime: 322, vip: false },
  { id: "a5", initial: "J", color: "#2A3FE0", name: "Jess Mendez",   neighbourhood: "Ponsonby",  sessions: 12, mates: 16, lifetime: 288, vip: false },
  { id: "a6", initial: "O", color: "#4FB8E0", name: "Olive Karena",  neighbourhood: "Mt Eden",   sessions: 9,  mates: 11, lifetime: 198, vip: false },
];

type Filter = "ALL" | "VIPs" | "NEW (30d)" | "AT RISK";
const FILTERS: Filter[] = ["ALL", "VIPs", "NEW (30d)", "AT RISK"];

export default function AttendeeCRMPage() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");

  const filtered = ATTENDEES.filter((a) => {
    const matchSearch = a.name.toLowerCase().includes(search.toLowerCase()) || a.neighbourhood.toLowerCase().includes(search.toLowerCase());
    if (filter === "VIPs") return a.vip && matchSearch;
    return matchSearch;
  });

  return (
    <main className="min-h-screen bg-cream pb-20">
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/home" className="text-ink"><SMark size={28} /></Link>
          <Link href="/admin" className="text-muted hover:text-ink text-lg">←</Link>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill" style={{ backgroundColor: "#1A1A1A" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-hot-blue flex-shrink-0" />
          <p className="font-mono text-xs font-bold text-white uppercase tracking-widest">Stretchy HQ · Attendees</p>
        </div>
        <button className="text-muted hover:text-ink text-xl">🔍</button>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-4">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.20em] text-muted mb-2">1,847 active · 64% return · grey lynn hottest</p>
          <h1 className="font-display font-bold text-ink" style={{ fontSize: "clamp(44px,12vw,58px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}>
            The mates.
          </h1>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, suburb, host..."
            className="flex-1 bg-white rounded-card px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-hot-blue/30 shadow-card" />
          <button className="font-mono text-xs font-bold px-4 py-3 rounded-card border border-border text-ink hover:bg-sand-dark transition-all">
            Sort ↓
          </button>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className="font-mono text-xs font-bold px-4 py-2 rounded-pill whitespace-nowrap flex-shrink-0 transition-all"
              style={{ backgroundColor: filter === f ? "#1A1A1A" : "#F5EDE3", color: filter === f ? "#fff" : "#1A1A1A", border: filter === f ? "none" : "1px solid #E0D9D0" }}>
              {f === "ALL" ? "ALL · 1,847" : f}
            </button>
          ))}
        </div>

        {/* Attendee rows */}
        <div className="bg-white rounded-card shadow-card divide-y divide-border">
          {filtered.map((a) => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0" style={{ backgroundColor: a.color }}>
                {a.initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-ink text-sm">{a.name}</p>
                  {a.vip && (
                    <span className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: "#FFD166", color: "#1A1A1A" }}>VIP</span>
                  )}
                </div>
                <p className="font-mono text-xs text-muted mt-0.5">{a.neighbourhood} · {a.sessions} sessions · {a.mates} mates</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-mono font-bold text-ink text-sm">${a.lifetime}</p>
                <p className="font-mono text-xs text-muted">LIFETIME</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
