"use client";

import { useState } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";

type WaitlistStatus = "NEW" | "CONTACTED" | "APPROVED" | "NOT NOW";

const STATUS_STYLE: Record<WaitlistStatus, { bg: string; text: string }> = {
  "NEW":       { bg: "#FFD166", text: "#1A1A1A" },
  "CONTACTED": { bg: "#E8F3FF", text: "#2C8FE0" },
  "APPROVED":  { bg: "#E8F5F0", text: "#2D6A4A" },
  "NOT NOW":   { bg: "#F5EDE3", text: "#9A9590" },
};

const WAITLIST = [
  { id: "w1", name: "Sofia Marino",   teaches: "Pilates",    experience: "6–10 yrs", where: ["Ponsonby", "Herne Bay"], frequency: "Weekly",        status: "NEW" as WaitlistStatus,       submitted: "2 hrs ago"  },
  { id: "w2", name: "James Tūhoe",    teaches: "Breathwork", experience: "10+ yrs",  where: ["Grey Lynn", "Pt Chev"], frequency: "Fortnightly",   status: "NEW" as WaitlistStatus,       submitted: "5 hrs ago"  },
  { id: "w3", name: "Priya Nair",     teaches: "Dance",      experience: "3–5 yrs",  where: ["CBD", "Newmarket"],     frequency: "Multiple/week", status: "CONTACTED" as WaitlistStatus, submitted: "1 day ago"  },
  { id: "w4", name: "Liam Crawford",  teaches: "HIIT",       experience: "3–5 yrs",  where: ["Mt Eden"],              frequency: "Weekly",        status: "CONTACTED" as WaitlistStatus, submitted: "2 days ago" },
  { id: "w5", name: "Anika Sharma",   teaches: "Yoga",       experience: "10+ yrs",  where: ["Parnell"],              frequency: "Weekly",        status: "APPROVED" as WaitlistStatus,  submitted: "4 days ago" },
  { id: "w6", name: "Marcus Bell",    teaches: "Sound Bath", experience: "1–2 yrs",  where: ["Grey Lynn"],            frequency: "Monthly",       status: "NOT NOW" as WaitlistStatus,   submitted: "1 wk ago"  },
];

type Filter = "ALL" | "NEW" | "CONTACTED" | "APPROVED" | "NOT NOW";
const FILTERS: Filter[] = ["ALL", "NEW", "CONTACTED", "APPROVED", "NOT NOW"];

export default function AdminWaitlistPage() {
  const [filter, setFilter] = useState<Filter>("ALL");

  const filtered = WAITLIST.filter((w) => filter === "ALL" || w.status === filter);
  const newCount = WAITLIST.filter((w) => w.status === "NEW").length;

  return (
    <main className="min-h-screen bg-cream pb-20">
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/home" className="text-ink"><SMark size={28} /></Link>
          <Link href="/admin" className="text-muted hover:text-ink text-lg">←</Link>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill" style={{ backgroundColor: "#1A1A1A" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-hot-blue flex-shrink-0" />
          <p className="font-mono text-xs font-bold text-white uppercase tracking-widest">Stretchy HQ · Waitlist</p>
        </div>
        <p className="font-mono text-xs font-bold text-muted">{newCount} NEW</p>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-4">

        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.20em] text-muted mb-2">
            Hosts waiting to run
          </p>
          <h1 className="font-display font-bold text-ink" style={{ fontSize: "clamp(44px,12vw,58px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}>
            The queue.
          </h1>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="font-mono text-xs font-bold px-4 py-2 rounded-pill whitespace-nowrap flex-shrink-0 transition-all"
              style={{
                backgroundColor: filter === f ? "#1A1A1A" : "#F5EDE3",
                color: filter === f ? "#fff" : "#1A1A1A",
                border: filter === f ? "none" : "1px solid #E0D9D0",
              }}
            >
              {f === "ALL" ? `ALL · ${WAITLIST.length}` : f === "NEW" ? `NEW · ${newCount}` : f}
            </button>
          ))}
        </div>

        {/* Cards */}
        <div className="space-y-3">
          {filtered.map((w) => {
            const ss = STATUS_STYLE[w.status];
            return (
              <div key={w.id} className="bg-white rounded-card shadow-card p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-bold text-ink text-sm">{w.name}</p>
                    <p className="font-mono text-xs text-muted">{w.teaches} · {w.experience}</p>
                  </div>
                  <span
                    className="font-mono text-xs font-bold px-2.5 py-1 rounded-pill flex-shrink-0"
                    style={{ backgroundColor: ss.bg, color: ss.text }}
                  >
                    {w.status}
                  </span>
                </div>

                {/* Where + frequency */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {w.where.map((n) => (
                    <span key={n} className="font-mono text-xs px-2.5 py-1 rounded-pill" style={{ backgroundColor: "#F5EDE3", color: "#1A1A1A" }}>
                      {n}
                    </span>
                  ))}
                  <span className="font-mono text-xs px-2.5 py-1 rounded-pill" style={{ backgroundColor: "#EFF6FF", color: "#2C8FE0" }}>
                    {w.frequency}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <p className="font-mono text-xs text-muted">{w.submitted}</p>
                  <div className="flex gap-2">
                    <button
                      className="font-mono text-xs font-bold px-3 py-1.5 rounded-pill border border-border text-muted hover:text-ink transition-colors"
                    >
                      Not now
                    </button>
                    <button
                      className="font-mono text-xs font-bold px-3 py-1.5 rounded-pill text-white transition-all hover:brightness-110"
                      style={{ backgroundColor: "#A535C7" }}
                    >
                      Contact →
                    </button>
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
