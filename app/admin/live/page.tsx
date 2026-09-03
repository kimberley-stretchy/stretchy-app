"use client";

import { useState } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";

type SessionStatus = "CONFIRMED" | "ALMOST FULL" | "FILLING" | "HOLDING" | "LOCKED" | "SHORT";
type Filter = "ALL" | "AUCKLAND" | "NEEDS HELP" | "CONFIRMED";

interface LiveSession {
  id: string; title: string; host: string; day: string; time: string;
  status: SessionStatus; held: number; max: number; price: number;
}

const SESSIONS: LiveSession[] = [
  { id: "s1", title: "Sunday Slow Flow",  host: "Tāne",   day: "Sun", time: "9:00",  status: "CONFIRMED",   held: 9, max: 8,  price: 19 },
  { id: "s2", title: "Pt Chev Sunrise",   host: "Marlee", day: "Sat", time: "7:00",  status: "ALMOST FULL", held: 9, max: 10, price: 23 },
  { id: "s3", title: "K Rd Sound Bath",   host: "Rua",    day: "Fri", time: "8:00",  status: "FILLING",     held: 5, max: 8,  price: 42 },
  { id: "s4", title: "Mt Eden Pilates",   host: "Jess",   day: "Thu", time: "6:30",  status: "HOLDING",     held: 3, max: 10, price: 30 },
  { id: "s5", title: "Wed Breath",        host: "Alex",   day: "Wed", time: "7:00",  status: "LOCKED",      held: 6, max: 6,  price: 19 },
  { id: "s6", title: "Tue Long Slow",     host: "Pip",    day: "Tue", time: "6:00",  status: "SHORT",       held: 2, max: 8,  price: 33 },
];

const STATS = [
  { label: "HOLDING",   count: 14, border: "#D4CFC9", text: "#14110F" },
  { label: "FILLING",   count: 12, border: "#E96709", text: "#E96709" },
  { label: "CONFIRMED", count: 8,  border: "#716F39", text: "#716F39" },
  { label: "SHORT",     count: 2,  border: "#C6362E", text: "#C6362E" },
];

const STATUS_STYLE: Record<SessionStatus, { bg: string; text: string; border?: string }> = {
  "CONFIRMED":   { bg: "#716F39", text: "#fff" },
  "ALMOST FULL": { bg: "transparent", text: "#0000FF", border: "#0000FF" },
  "FILLING":     { bg: "#E96709", text: "#fff" },
  "HOLDING":     { bg: "#D4CFC9", text: "#6A6560" },
  "LOCKED":      { bg: "#14110F", text: "#fff" },
  "SHORT":       { bg: "#C6362E", text: "#fff" },
};

const FILTERS: Filter[] = ["ALL", "AUCKLAND", "NEEDS HELP", "CONFIRMED"];

export default function LivePlatformPage() {
  const [filter, setFilter] = useState<Filter>("ALL");

  const filtered = SESSIONS.filter((s) => {
    if (filter === "ALL") return true;
    if (filter === "NEEDS HELP") return s.status === "SHORT";
    if (filter === "CONFIRMED") return s.status === "CONFIRMED";
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
          <p className="font-mono text-xs font-bold text-white uppercase tracking-widest">Stretchy HQ · Oversight</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill" style={{ backgroundColor: "#C6362E" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-white flex-shrink-0" />
          <p className="font-mono text-xs font-bold text-white uppercase tracking-widest">Live</p>
        </div>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-4">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.20em] text-muted mb-2">47 live this week · 2 need attention</p>
          <h1 className="font-display font-bold text-ink" style={{ fontSize: "clamp(40px,11vw,54px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}>
            Everything,<br />everywhere.
          </h1>
        </div>

        {/* Stat chips */}
        <div className="flex gap-2">
          {STATS.map((s) => (
            <div key={s.label} className="flex-1 flex flex-col items-center py-3 rounded-card bg-white"
              style={{ border: `1.5px solid ${s.border}` }}>
              <p className="font-mono font-black text-ink" style={{ fontSize: "22px", lineHeight: "1", color: s.text }}>{s.count}</p>
              <p className="font-mono text-[9px] font-bold uppercase tracking-wide mt-1" style={{ color: s.text }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className="font-mono text-xs font-bold px-4 py-2 rounded-pill whitespace-nowrap flex-shrink-0 transition-all"
              style={{ backgroundColor: filter === f ? "#14110F" : "#F7F0E8", color: filter === f ? "#fff" : "#14110F", border: filter === f ? "none" : "1px solid #E0D9D0" }}>
              {f === "ALL" ? `ALL · 47` : f}
            </button>
          ))}
        </div>

        {/* Session rows */}
        <div className="space-y-2">
          {filtered.map((s) => {
            const st = STATUS_STYLE[s.status];
            const isAlmostFull = s.status === "ALMOST FULL";
            return (
              <div key={s.id} className="bg-white rounded-card border-2 border-ink p-4 flex items-center gap-3"
                style={isAlmostFull ? { border: "1.5px solid #0000FF" } : undefined}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-pill"
                      style={{ backgroundColor: st.bg, color: st.text, border: st.border ? `1.5px solid ${st.border}` : "none" }}>
                      {s.status}
                    </span>
                    <span className="font-mono text-xs text-muted">{s.day} {s.time}</span>
                  </div>
                  <p className="font-bold text-ink text-sm">{s.title}</p>
                  <p className="font-mono text-xs text-muted">{s.host} · {s.held}/{s.max} held</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-mono font-black text-ink" style={{ fontSize: "20px" }}>${s.price}</p>
                  <p className="font-mono text-xs text-muted">/SPOT</p>
                </div>
                <span className="text-muted text-lg flex-shrink-0">›</span>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
