"use client";

import Link from "next/link";
import SMark from "@/components/SMark";

const BAR_DATA = [
  { day: "MON", value: 22 },
  { day: "TUE", value: 18 },
  { day: "WED", value: 28 },
  { day: "THU", value: 24 },
  { day: "FRI", value: 30 },
  { day: "SAT", value: 26 },
  { day: "SUN", value: 39 },
];

const CONVERSIONS = [
  { label: "HOLD → CONFIRM",     value: "83%", delta: "+4",  deltaColor: "#716F39" },
  { label: "FLOOR-NOT-MET",      value: "11%", delta: "-2",  deltaColor: "#C6362E" },
  { label: "REPEAT MATES",       value: "64%", delta: "+7",  deltaColor: "#716F39" },
  { label: "SUGGEST → SESSION",  value: "22%", delta: "+1",  deltaColor: "#716F39" },
  { label: "NEW HOST APPS",      value: "14",  delta: "this wk", deltaColor: "#9A9590" },
  { label: "CANCELLED",          value: "6",   delta: "this wk", deltaColor: "#C6362E" },
];

const NEIGHBOURHOODS = [
  { name: "Grey Lynn",  score: 92, color: "#902F8A" },
  { name: "Ponsonby",   score: 78, color: "#0000FF" },
  { name: "Pt Chev",    score: 71, color: "#E96709" },
  { name: "Herne Bay",  score: 58, color: "#29ABE2" },
  { name: "Karangahape",score: 44, color: "#716F39" },
  { name: "Mt Eden",    score: 31, color: "#716F39" },
];

const maxBar = Math.max(...BAR_DATA.map((b) => b.value));

export default function AnalyticsPage() {
  return (
    <main className="min-h-screen bg-cream pb-20">
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/home" className="text-ink"><SMark size={28} /></Link>
          <Link href="/admin" className="text-muted hover:text-ink text-lg">←</Link>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill" style={{ backgroundColor: "#14110F" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-hot-blue flex-shrink-0" />
          <p className="font-mono text-xs font-bold text-white uppercase tracking-widest">Stretchy HQ · Analytics</p>
        </div>
        <p className="font-mono text-xs font-bold text-muted">30D</p>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-4">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.20em] text-muted mb-2">Platform health · last 30 days</p>
          <h1 className="font-display font-bold text-ink" style={{ fontSize: "clamp(40px,11vw,54px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}>
            How it&apos;s<br />moving.
          </h1>
        </div>

        {/* Sessions run (black card) */}
        <div className="rounded-card p-5" style={{ backgroundColor: "#14110F", border: "2px solid #14110F" }}>
          <p className="font-mono text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.50)" }}>
            Sessions run
          </p>
          <div className="flex items-end gap-3 mb-4">
            <p className="font-mono font-black text-white" style={{ fontSize: "72px", lineHeight: "1", letterSpacing: "-0.05em" }}>187</p>
            <p className="font-mono text-sm font-bold mb-3" style={{ color: "#716F39" }}>+31% MoM</p>
          </div>

          {/* Bar chart */}
          <div className="flex items-end gap-1.5" style={{ height: "56px" }}>
            {BAR_DATA.map((b) => {
              const isToday = b.day === "SUN";
              const height = Math.round((b.value / maxBar) * 100);
              return (
                <div key={b.day} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full rounded-sm transition-all"
                    style={{ height: `${height}%`, backgroundColor: isToday ? "#FCBB16" : "rgba(255,255,255,0.20)" }} />
                  <p className="font-mono text-[9px] font-bold uppercase" style={{ color: "rgba(255,255,255,0.45)" }}>{b.day}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Conversions grid */}
        <div>
          <h2 className="font-display font-bold text-ink mb-3" style={{ fontSize: "20px" }}>Conversions</h2>
          <div className="grid grid-cols-2 gap-2">
            {CONVERSIONS.map((c) => (
              <div key={c.label} className="bg-white rounded-card border-2 border-ink p-4">
                <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted mb-1">{c.label}</p>
                <div className="flex items-baseline gap-1.5">
                  <p className="font-mono font-black text-ink" style={{ fontSize: "26px", lineHeight: "1", letterSpacing: "-0.03em" }}>{c.value}</p>
                  <p className="font-mono text-xs font-bold" style={{ color: c.deltaColor }}>{c.delta}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Neighbourhood heat */}
        <div>
          <h2 className="font-display font-bold text-ink mb-3" style={{ fontSize: "20px" }}>Neighbourhood heat</h2>
          <div className="bg-white rounded-card border-2 border-ink p-4 space-y-3">
            {NEIGHBOURHOODS.map((n) => (
              <div key={n.name} className="flex items-center gap-3">
                <p className="text-sm text-ink font-semibold w-24 flex-shrink-0">{n.name}</p>
                <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: "#F7F0E8" }}>
                  <div className="h-2 rounded-full" style={{ width: `${n.score}%`, backgroundColor: n.color }} />
                </div>
                <p className="font-mono text-xs font-bold text-muted w-6 text-right flex-shrink-0">{n.score}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
