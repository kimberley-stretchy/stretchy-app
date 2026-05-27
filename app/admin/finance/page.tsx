"use client";

import { useState } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type TxType = "SESSION FEE" | "PAYOUT" | "REFUND" | "TIP" | "CHARGEBACK";
type TxFilter = "ALL" | TxType;

interface Transaction {
  id: string;
  ref: string;
  datetime: string;
  date: string;
  time: string;
  type: TxType;
  session: string;
  location: string;
  suburb: string;
  host: string;
  attendees?: number;
  gross: number;
  net: number;
  positive: boolean;
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const TRANSACTIONS: Transaction[] = [
  {
    id: "tx1",
    ref: "STR-260527-A14B",
    datetime: "27 May · 16:42",
    date: "27 May 2026",
    time: "16:42",
    type: "SESSION FEE",
    session: "Tue Long Slow Flow",
    location: "Little Bird Café",
    suburb: "Grey Lynn",
    host: "Tāne Silvermoon",
    attendees: 14,
    gross: 322,
    net: 23,
    positive: true,
  },
  {
    id: "tx2",
    ref: "STR-260527-B29C",
    datetime: "27 May · 15:18",
    date: "27 May 2026",
    time: "15:18",
    type: "PAYOUT",
    session: "Weekly batch · 14 hosts",
    location: "Stripe ACH",
    suburb: "Platform",
    host: "14 hosts",
    gross: 3848,
    net: -3848,
    positive: false,
  },
  {
    id: "tx3",
    ref: "STR-260527-C08F",
    datetime: "27 May · 14:30",
    date: "27 May 2026",
    time: "14:30",
    type: "TIP",
    session: "Sat Sunrise",
    location: "Tāmaki Makaurau Studio",
    suburb: "Ponsonby",
    host: "Tāne Silvermoon",
    gross: 15,
    net: 15,
    positive: true,
  },
  {
    id: "tx4",
    ref: "STR-260526-D91E",
    datetime: "26 May · 13:55",
    date: "26 May 2026",
    time: "13:55",
    type: "SESSION FEE",
    session: "Mon Morning Breathwork",
    location: "The Bread & Butter Letter",
    suburb: "Mt Eden",
    host: "James Tūhoe",
    attendees: 9,
    gross: 207,
    net: 23,
    positive: true,
  },
  {
    id: "tx5",
    ref: "STR-260526-E44A",
    datetime: "26 May · 12:10",
    date: "26 May 2026",
    time: "12:10",
    type: "REFUND",
    session: "Tue Long Slow Flow",
    location: "Little Bird Café",
    suburb: "Grey Lynn",
    host: "Tāne Silvermoon",
    gross: -184,
    net: -184,
    positive: false,
  },
  {
    id: "tx6",
    ref: "STR-260525-F73B",
    datetime: "25 May · 09:00",
    date: "25 May 2026",
    time: "09:00",
    type: "SESSION FEE",
    session: "Sun Slow Burn",
    location: "Canvas Café",
    suburb: "Herne Bay",
    host: "Priya Nair",
    attendees: 12,
    gross: 276,
    net: 23,
    positive: true,
  },
  {
    id: "tx7",
    ref: "STR-260524-G12D",
    datetime: "24 May · 18:00",
    date: "24 May 2026",
    time: "18:00",
    type: "PAYOUT",
    session: "Weekly batch · 3 hosts",
    location: "Stripe ACH",
    suburb: "Platform",
    host: "3 hosts",
    gross: 612,
    net: -612,
    positive: false,
  },
  {
    id: "tx8",
    ref: "STR-260524-H55C",
    datetime: "24 May · 10:20",
    date: "24 May 2026",
    time: "10:20",
    type: "SESSION FEE",
    session: "Sat Sound Bath",
    location: "The Chaffers",
    suburb: "Parnell",
    host: "Marcus Bell",
    attendees: 16,
    gross: 368,
    net: 23,
    positive: true,
  },
  {
    id: "tx9",
    ref: "STR-260523-I88F",
    datetime: "23 May · 16:05",
    date: "23 May 2026",
    time: "16:05",
    type: "TIP",
    session: "Thu Pilates Express",
    location: "Little Bird Café",
    suburb: "Grey Lynn",
    host: "Sofia Marino",
    gross: 10,
    net: 10,
    positive: true,
  },
  {
    id: "tx10",
    ref: "STR-260522-J21A",
    datetime: "22 May · 09:45",
    date: "22 May 2026",
    time: "09:45",
    type: "SESSION FEE",
    session: "Wed HIIT",
    location: "Pt Chev Beach Reserve",
    suburb: "Pt Chev",
    host: "Liam Crawford",
    attendees: 11,
    gross: 253,
    net: 23,
    positive: true,
  },
];

const TX_STYLE: Record<TxType, { bg: string; text: string }> = {
  "SESSION FEE": { bg: "#E8F3FF", text: "#2C8FE0" },
  "PAYOUT":      { bg: "#E8F5F0", text: "#2D6A4A" },
  "REFUND":      { bg: "#FEE8E8", text: "#E63946" },
  "TIP":         { bg: "#FFF8E1", text: "#B8860B" },
  "CHARGEBACK":  { bg: "#F5E8FF", text: "#A535C7" },
};

const FILTERS: TxFilter[] = ["ALL", "SESSION FEE", "PAYOUT", "REFUND", "TIP"];

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function FinancePage() {
  const [filter, setFilter] = useState<TxFilter>("ALL");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const filtered = TRANSACTIONS.filter(
    (tx) => filter === "ALL" || tx.type === filter
  );

  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => setDownloading(false), 1800);
  };

  return (
    <main className="min-h-screen bg-cream pb-20">

      {/* ── NAV ── */}
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/home" className="text-ink"><SMark size={28} /></Link>
          <Link href="/admin" className="text-muted hover:text-ink text-lg">←</Link>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-pill" style={{ backgroundColor: "#1A1A1A" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-hot-blue flex-shrink-0" />
          <p className="font-mono text-xs font-bold text-white uppercase tracking-widest">Stretchy HQ · Finance</p>
        </div>
        <p className="font-mono text-xs font-bold text-muted">MAY &apos;26</p>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-4">

        {/* ── HEADLINE ── */}
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.20em] text-muted mb-2">Month to date · NZD</p>
          <h1 className="font-display font-bold text-ink" style={{ fontSize: "clamp(40px,11vw,54px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}>
            The money<br />map.
          </h1>
        </div>

        {/* ── FEES COLLECTED (yellow) ── */}
        <div className="rounded-card p-5" style={{ backgroundColor: "#FFD166" }}>
          <p className="font-mono text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(26,26,26,0.55)" }}>
            Stretchy Fees Collected
          </p>
          <div className="flex items-start mb-2">
            <span className="font-mono font-black text-ink" style={{ fontSize: "22px", marginTop: "10px", marginRight: "2px" }}>$</span>
            <span className="font-mono font-black text-ink" style={{ fontSize: "72px", lineHeight: "1", letterSpacing: "-0.05em" }}>4,310</span>
          </div>
          <p className="text-sm text-ink" style={{ opacity: 0.65 }}>187 sessions · $23 avg fee · <strong style={{ color: "#2D6A4A" }}>+31% MoM</strong></p>
        </div>

        {/* ── STATS GRID ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-card shadow-card p-4 col-span-2">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-1">Host Payouts</p>
            <p className="font-mono font-black text-ink" style={{ fontSize: "32px", lineHeight: "1", letterSpacing: "-0.04em" }}>$38,420</p>
            <p className="font-mono text-xs text-muted mt-1">processed Mon · Stripe ACH</p>
          </div>
          <div className="bg-white rounded-card shadow-card p-4">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-1">Avg / Spot</p>
            <p className="font-mono font-black text-ink" style={{ fontSize: "24px", lineHeight: "1", letterSpacing: "-0.03em" }}>$22.40</p>
            <p className="font-mono text-xs text-muted mt-1">9.4 avg room</p>
          </div>
          <div className="bg-white rounded-card shadow-card p-4">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-1">Tips</p>
            <p className="font-mono font-black text-ink" style={{ fontSize: "24px", lineHeight: "1", letterSpacing: "-0.03em" }}>$612</p>
            <p className="font-mono text-xs text-muted mt-1">83 tips · 44% sessions</p>
          </div>
          <div className="bg-white rounded-card shadow-card p-4">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-1">Refunds</p>
            <p className="font-mono font-black" style={{ fontSize: "24px", lineHeight: "1", letterSpacing: "-0.03em", color: "#E63946" }}>$184</p>
            <p className="font-mono text-xs text-muted mt-1">6 events · 0 disputes</p>
          </div>
          <div className="bg-white rounded-card shadow-card p-4">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-1">Sessions</p>
            <p className="font-mono font-black text-ink" style={{ fontSize: "24px", lineHeight: "1", letterSpacing: "-0.03em" }}>187</p>
            <p className="font-mono text-xs text-muted mt-1">this month</p>
          </div>
        </div>

        {/* ── DOWNLOAD STATEMENTS ── */}
        <div className="bg-white rounded-card shadow-card p-4">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-3">Download Statements</p>
          <div className="flex gap-2 flex-wrap">
            {["May 2026", "Apr 2026", "Mar 2026", "Q1 2026"].map((label) => (
              <button
                key={label}
                onClick={handleDownload}
                className="font-mono text-xs font-bold px-3 py-2 rounded-pill transition-all hover:brightness-110 active:scale-[0.97] flex items-center gap-1.5"
                style={{ backgroundColor: downloading && label === "May 2026" ? "#4CAF82" : "#1A1A1A", color: "#fff" }}
              >
                {downloading && label === "May 2026" ? "✓ Downloading" : `↓ ${label}`}
              </button>
            ))}
          </div>
          <p className="font-mono text-xs text-muted mt-3">CSV format · Includes GST breakdown · Stripe reconciliation codes</p>
        </div>

        {/* ── TRANSACTIONS ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-ink" style={{ fontSize: "22px" }}>Transactions</h2>
            <p className="font-mono text-xs text-muted">{filtered.length} of {TRANSACTIONS.length}</p>
          </div>

          {/* Filter pills */}
          <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-2 mb-3">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="font-mono text-xs font-bold px-3 py-1.5 rounded-pill whitespace-nowrap flex-shrink-0 transition-all"
                style={{
                  backgroundColor: filter === f ? "#1A1A1A" : "#F5EDE3",
                  color: filter === f ? "#fff" : "#1A1A1A",
                  border: filter === f ? "none" : "1px solid #E0D9D0",
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Transaction rows */}
          <div className="space-y-2">
            {filtered.map((tx) => {
              const ts = TX_STYLE[tx.type];
              const isOpen = expanded === tx.id;
              return (
                <div key={tx.id} className="bg-white rounded-card shadow-card overflow-hidden">

                  {/* Row summary */}
                  <button
                    className="w-full text-left px-4 py-3.5 flex items-start gap-3"
                    onClick={() => setExpanded(isOpen ? null : tx.id)}
                  >
                    {/* Type badge */}
                    <span
                      className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-pill flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: ts.bg, color: ts.text }}
                    >
                      {tx.type}
                    </span>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{tx.session}</p>
                      <p className="font-mono text-xs text-muted mt-0.5">{tx.datetime} · {tx.suburb}</p>
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <p className="font-mono text-sm font-bold" style={{ color: tx.positive ? "#2D6A4A" : "#E63946" }}>
                        {tx.positive ? "+" : ""}${Math.abs(tx.net)}
                      </p>
                      <p className="font-mono text-[10px] text-muted mt-0.5">{isOpen ? "▲" : "▼"}</p>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="border-t border-border px-4 py-3 space-y-2.5" style={{ backgroundColor: "#FAFAF8" }}>

                      {/* Reference */}
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-xs text-muted">Reference</p>
                        <p className="font-mono text-xs font-bold text-ink">{tx.ref}</p>
                      </div>

                      {/* Date / Time */}
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-xs text-muted">Date · Time</p>
                        <p className="font-mono text-xs text-ink">{tx.date} · {tx.time} NZST</p>
                      </div>

                      {/* Location */}
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-xs text-muted">Location</p>
                        <p className="font-mono text-xs text-ink">{tx.location}, {tx.suburb}</p>
                      </div>

                      {/* Host */}
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-xs text-muted">Host</p>
                        <p className="font-mono text-xs text-ink">{tx.host}</p>
                      </div>

                      {/* Attendees if applicable */}
                      {tx.attendees && (
                        <div className="flex items-center justify-between">
                          <p className="font-mono text-xs text-muted">Attendees</p>
                          <p className="font-mono text-xs text-ink">{tx.attendees} confirmed</p>
                        </div>
                      )}

                      {/* Gross / Net */}
                      <div className="flex items-center justify-between">
                        <p className="font-mono text-xs text-muted">Gross</p>
                        <p className="font-mono text-xs text-ink">${Math.abs(tx.gross)}</p>
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-2">
                        <p className="font-mono text-xs font-bold text-muted">Stretchy Net</p>
                        <p className="font-mono text-xs font-bold" style={{ color: tx.positive ? "#2D6A4A" : "#E63946" }}>
                          {tx.positive ? "+" : ""}${Math.abs(tx.net)}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-1">
                        <button
                          className="font-mono text-xs font-bold px-3 py-1.5 rounded-pill border border-border text-muted hover:text-ink transition-colors"
                        >
                          View in Stripe ↗
                        </button>
                        <button
                          className="font-mono text-xs font-bold px-3 py-1.5 rounded-pill border border-border text-muted hover:text-ink transition-colors"
                        >
                          ↓ Receipt
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="font-mono text-xs text-center text-muted mt-4">Showing 27 May — 22 May · <span className="underline">Load earlier</span></p>
        </div>

      </div>
    </main>
  );
}
