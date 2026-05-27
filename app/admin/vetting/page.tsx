"use client";

import { useState } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";

type Status = "PENDING" | "IN REVIEW" | "MORE INFO" | "APPROVED" | "DECLINED";
type Filter = "ALL" | "NEEDS YOU" | "PENDING" | "IN REVIEW";

interface Applicant {
  id: string;
  initial: string;
  color: string;
  name: string;
  type: string;
  neighbourhood: string;
  years: number;
  status: Status;
}

const APPLICANTS: Applicant[] = [
  { id: "a1", initial: "T", color: "#2C8FE0", name: "Tāne Ratima",   type: "Vinyasa · Slow Flow", neighbourhood: "Grey Lynn", years: 4, status: "IN REVIEW" },
  { id: "a2", initial: "R", color: "#2C8FE0", name: "Rua Ohia",      type: "Sound Bath",           neighbourhood: "Karangahape", years: 7, status: "PENDING" },
  { id: "a3", initial: "M", color: "#A535C7", name: "Marlee Fisher",  type: "Sunrise Yoga",         neighbourhood: "Pt Chev", years: 9, status: "MORE INFO" },
  { id: "a4", initial: "A", color: "#FF6B35", name: "Alex Kim",       type: "Breath · HIIT",        neighbourhood: "Herne Bay", years: 3, status: "APPROVED" },
  { id: "a5", initial: "J", color: "#2A3FE0", name: "Jess Mendez",   type: "Pilates",              neighbourhood: "Ponsonby", years: 6, status: "DECLINED" },
  { id: "a6", initial: "P", color: "#FF4D9E", name: "Pip Carter",    type: "Run + Stretch",        neighbourhood: "Mt Eden", years: 5, status: "PENDING" },
];

const STATUS_STYLE: Record<Status, { bg: string; text: string; label: string }> = {
  "PENDING":   { bg: "#E8F3FF", text: "#2C8FE0",  label: "PENDING" },
  "IN REVIEW": { bg: "#FFD166", text: "#1A1A1A",  label: "IN REVIEW" },
  "MORE INFO": { bg: "#FF6B35", text: "#fff",      label: "MORE INFO" },
  "APPROVED":  { bg: "#4CAF82", text: "#fff",      label: "APPROVED" },
  "DECLINED":  { bg: "#D4CFC9", text: "#6A6560",   label: "DECLINED" },
};

const STATUS_COUNTS: { status: Status; count: number }[] = [
  { status: "PENDING",   count: 2 },
  { status: "IN REVIEW", count: 1 },
  { status: "MORE INFO", count: 1 },
  { status: "APPROVED",  count: 1 },
  { status: "DECLINED",  count: 1 },
];

const FILTERS: Filter[] = ["ALL", "NEEDS YOU", "PENDING", "IN REVIEW"];

const filterMatch = (a: Applicant, f: Filter) => {
  if (f === "ALL") return true;
  if (f === "NEEDS YOU") return a.status === "IN REVIEW" || a.status === "MORE INFO";
  if (f === "PENDING") return a.status === "PENDING";
  if (f === "IN REVIEW") return a.status === "IN REVIEW";
  return true;
};

export default function VettingPage() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [statuses, setStatuses] = useState<Record<string, Status>>(
    Object.fromEntries(APPLICANTS.map((a) => [a.id, a.status]))
  );

  const approve = (id: string) => setStatuses((s) => ({ ...s, [id]: "APPROVED" }));

  const filtered = APPLICANTS.filter((a) => filterMatch({ ...a, status: statuses[a.id] }, filter));

  return (
    <main className="min-h-screen bg-cream pb-20">
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/home" className="text-ink"><SMark size={28} /></Link>
          <Link href="/admin" className="text-muted hover:text-ink text-lg">←</Link>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill" style={{ backgroundColor: "#1A1A1A" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-hot-blue flex-shrink-0" />
          <p className="font-mono text-xs font-bold text-white uppercase tracking-widest">Stretchy HQ · Vetting</p>
        </div>
        <button className="text-muted hover:text-ink text-xl">🔍</button>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-4">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.20em] text-muted mb-2">6 in queue · oldest 4 days</p>
          <h1 className="font-display font-bold text-ink" style={{ fontSize: "clamp(44px,12vw,58px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}>
            Vetting<br />queue.
          </h1>
        </div>

        {/* Status chips */}
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
          {STATUS_COUNTS.map(({ status, count }) => {
            const s = STATUS_STYLE[status];
            return (
              <div key={status} className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-mono font-black text-base" style={{ backgroundColor: s.bg, color: s.text }}>
                  {count}
                </div>
                <p className="font-mono text-[9px] font-bold uppercase tracking-wide text-center" style={{ color: s.text, maxWidth: "48px" }}>{status.replace(" ", "\n")}</p>
              </div>
            );
          })}
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className="font-mono text-xs font-bold px-4 py-2 rounded-pill whitespace-nowrap flex-shrink-0 transition-all"
              style={{ backgroundColor: filter === f ? "#1A1A1A" : "#F5EDE3", color: filter === f ? "#fff" : "#1A1A1A", border: filter === f ? "none" : "1px solid #E0D9D0" }}>
              {f}
            </button>
          ))}
        </div>

        {/* Applicant cards */}
        <div className="space-y-3">
          {filtered.map((a) => {
            const st = statuses[a.id];
            const sStyle = STATUS_STYLE[st];
            const showActions = st === "PENDING" || st === "IN REVIEW";
            const isActive = st === "IN REVIEW";

            return (
              <div key={a.id} className="bg-white rounded-card shadow-card p-4"
                style={isActive ? { border: "1.5px solid #FFD166" } : undefined}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0" style={{ backgroundColor: a.color }}>
                    {a.initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-ink text-sm">{a.name}</p>
                    <p className="font-mono text-xs text-muted">{a.type} · {a.neighbourhood} · {a.years}y</p>
                  </div>
                  <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-pill flex-shrink-0"
                    style={{ backgroundColor: sStyle.bg, color: sStyle.text }}>
                    {sStyle.label}
                  </span>
                </div>
                {showActions && (
                  <div className="flex gap-2">
                    <button onClick={() => approve(a.id)}
                      className="flex-1 font-semibold text-white rounded-pill transition-all active:scale-[0.98] hover:brightness-110"
                      style={{ backgroundColor: "#2C8FE0", height: "40px", fontSize: "14px" }}>
                      ✓ Approve
                    </button>
                    <button className="font-mono text-xs font-bold px-4 rounded-pill border border-border text-ink hover:bg-sand-dark transition-all" style={{ height: "40px" }}>
                      📞 Call
                    </button>
                    <button className="font-mono text-xs font-bold px-4 rounded-pill border border-border text-ink hover:bg-sand-dark transition-all" style={{ height: "40px" }}>
                      👁
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
