"use client";

import { useState } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type CardType = "ACTION" | "CONFIRMED" | "PAYOUT" | "SOCIAL" | "UPDATE" | "RENEWAL";
type Filter = "ALL" | "NEEDS ACTION" | "POSITIVE" | "PAYOUTS";

interface InboxCard {
  id: string;
  type: CardType;
  title: string;
  body: string;
  time: string;
  unread: boolean;
  actions?: { label: string; primary?: boolean }[];
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const CARDS: InboxCard[] = [
  {
    id: "c1",
    type: "ACTION",
    title: "Sat Sunrise — short of floor",
    body: "6 of 8 held. 3 more to go. Locks in 2h 47m.",
    time: "Just now",
    unread: true,
    actions: [{ label: "Open", primary: true }, { label: "Share" }],
  },
  {
    id: "c2",
    type: "CONFIRMED",
    title: "Sunday Slow Flow — confirmed at $28",
    body: "9 of 8 held. Target hit. Locks in 22 hours.",
    time: "2h ago",
    unread: true,
  },
  {
    id: "c3",
    type: "PAYOUT",
    title: "Payout incoming · $431",
    body: "Pays Monday into ANZ -2847. 2 sessions this week.",
    time: "6h ago",
    unread: true,
  },
  {
    id: "c4",
    type: "SOCIAL",
    title: "Community vote: \"Sunset HIIT at the viaduct\"",
    body: "47 mates want it. Matches your range. Want to take it on?",
    time: "Yesterday",
    unread: false,
  },
  {
    id: "c5",
    type: "UPDATE",
    title: "Kit P. just held their 6th Slow Flow in a row",
    body: "",
    time: "Yesterday",
    unread: false,
  },
  {
    id: "c6",
    type: "RENEWAL",
    title: "Vetting renewed for another 6 months",
    body: "No action needed. Carry on.",
    time: "3 days ago",
    unread: false,
  },
];

// ─── CARD CONFIG ──────────────────────────────────────────────────────────────
const cardStyle: Record<CardType, { bg: string; labelColor: string; label: string; labelEmoji?: string; titleColor: string; bodyColor: string }> = {
  ACTION:    { bg: "#0000FF", labelColor: "rgba(255,255,255,0.65)", label: "ACTION", titleColor: "#fff", bodyColor: "rgba(255,255,255,0.80)" },
  CONFIRMED: { bg: "#E8F3FF", labelColor: "#716F39",                 label: "CONFIRMED", titleColor: "#1A4A80", bodyColor: "#4A6A90" },
  PAYOUT:    { bg: "#FCBB16", labelColor: "rgba(26,26,26,0.55)",    label: "$ PAYOUT", titleColor: "#14110F", bodyColor: "rgba(26,26,26,0.65)" },
  SOCIAL:    { bg: "#E8F5F0", labelColor: "#2D6A4A",                 label: "SOCIAL", labelEmoji: "🤙", titleColor: "#14110F", bodyColor: "#4A6A50" },
  UPDATE:    { bg: "#ffffff", labelColor: "#9A9590",                  label: "UPDATE", titleColor: "#14110F", bodyColor: "#9A9590" },
  RENEWAL:   { bg: "#E8F3FF", labelColor: "#716F39",                 label: "CONFIRMED", titleColor: "#1A4A80", bodyColor: "#4A6A90" },
};

const filterMatch: Record<Filter, (c: InboxCard) => boolean> = {
  "ALL":          () => true,
  "NEEDS ACTION": (c) => c.type === "ACTION",
  "POSITIVE":     (c) => c.type === "CONFIRMED" || c.type === "RENEWAL" || c.type === "SOCIAL",
  "PAYOUTS":      (c) => c.type === "PAYOUT",
};

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function HostInboxPage() {
  const [filter, setFilter] = useState<Filter>("ALL");

  const newCount = CARDS.filter((c) => c.unread).length;
  const filtered = CARDS.filter(filterMatch[filter]);
  const FILTERS: Filter[] = ["ALL", "NEEDS ACTION", "POSITIVE", "PAYOUTS"];

  return (
    <main className="min-h-screen bg-cream pb-20">

      {/* ── NAV ── */}
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/host/home" className="text-ink"><SMark size={28} /></Link>
          <Link href="/host/dashboard" className="text-muted hover:text-ink text-lg transition-colors">←</Link>
        </div>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">
          Host Inbox · <span style={{ color: "#0000FF" }}>{newCount} new</span>
        </p>
        <Link href="/host/inbox" className="relative">
          <span className="text-2xl">🔔</span>
          {newCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-hot-blue border-2 border-cream block" />}
        </Link>
      </nav>

      <div className="px-4 max-w-lg mx-auto">

        {/* ── HEADLINE ── */}
        <h1
          className="font-display font-bold text-ink mb-5"
          style={{ fontSize: "clamp(48px, 13vw, 64px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}
        >
          The desk.
        </h1>

        {/* ── FILTER PILLS ── */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-4 px-4 scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="font-mono text-xs font-bold px-4 py-2 rounded-pill whitespace-nowrap transition-all flex-shrink-0"
              style={{
                backgroundColor: filter === f ? "#14110F" : "#F7F0E8",
                color: filter === f ? "#fff" : "#14110F",
                border: filter === f ? "none" : "1px solid #E0D9D0",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* ── CARDS ── */}
        <div className="space-y-3">
          {filtered.map((card) => {
            const style = cardStyle[card.type];
            const isLight = card.type === "UPDATE";

            return (
              <div
                key={card.id}
                className="rounded-card p-4 relative"
                style={{
                  backgroundColor: style.bg,
                  border: isLight ? "2px solid #14110F" : "none",
                }}
              >
                {/* Unread dot */}
                {card.unread && (
                  <span
                    className="absolute top-4 right-4 w-2 h-2 rounded-full"
                    style={{ backgroundColor: isLight ? "#0000FF" : "rgba(255,255,255,0.80)" }}
                  />
                )}

                {/* Label row */}
                <div className="flex items-center gap-1.5 mb-1.5">
                  {card.type === "CONFIRMED" || card.type === "RENEWAL" ? (
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#716F39" }} />
                  ) : null}
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.16em]" style={{ color: style.labelColor }}>
                    {style.labelEmoji ? `${style.labelEmoji} ` : ""}{style.label}
                  </p>
                </div>

                {/* Title */}
                <h2
                  className="font-display font-bold leading-tight mb-1"
                  style={{ fontSize: "18px", color: style.titleColor }}
                >
                  {card.title}
                </h2>

                {/* Body */}
                {card.body && (
                  <p className="text-sm leading-snug mb-3" style={{ color: style.bodyColor }}>
                    {card.body}
                  </p>
                )}

                {/* Action buttons */}
                {card.actions && card.actions.length > 0 && (
                  <div className="flex gap-2 mb-3">
                    {card.actions.map((a) => (
                      <Link
                        key={a.label}
                        href={a.label === "Open" ? "/host/floor-not-met" : "#"}
                        className="flex items-center justify-center font-semibold rounded-pill transition-all active:scale-[0.98]"
                        style={{
                          backgroundColor: a.primary ? "#fff" : "rgba(255,255,255,0.20)",
                          color: a.primary ? "#14110F" : "#fff",
                          height: "40px",
                          paddingLeft: "20px",
                          paddingRight: "20px",
                          fontSize: "14px",
                        }}
                      >
                        {a.label}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Timestamp */}
                <p className="font-mono text-xs" style={{ color: style.labelColor, opacity: 0.70 }}>
                  {card.time}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </main>
  );
}
