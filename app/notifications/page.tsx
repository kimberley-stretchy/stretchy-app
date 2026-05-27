"use client";

import { useState } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
type NotifType = "DROPPING" | "ALMOST_FULL" | "CONFIRMED" | "ACTION" | "UPDATE";

interface Notif {
  id: string;
  type: NotifType;
  session: string;
  time: string;
  body: string;
  unread?: boolean;
  price?: number;
  wasPrice?: number;
}

const NOTIFS: Notif[] = [
  {
    id: "n1",
    type: "DROPPING",
    session: "Sunday Slow Flow",
    time: "2 MIN AGO",
    body: "Price just dropped to $21. Bring a mate — it can go lower.",
    unread: true,
    price: 21,
    wasPrice: 28,
  },
  {
    id: "n2",
    type: "ALMOST_FULL",
    session: "Ponsonby Pilates",
    time: "14 MIN AGO",
    body: "Only 2 spots left. Price is at the floor — $14.",
    unread: true,
    price: 14,
  },
  {
    id: "n3",
    type: "CONFIRMED",
    session: "Herne Bay Breath",
    time: "1 HR AGO",
    body: "Minimum hit. Your session is going ahead — WED 27 · 7:00 PM.",
    unread: false,
    price: 19,
  },
  {
    id: "n4",
    type: "ACTION",
    session: "Grey Lynn Slow Flow",
    time: "3 HRS AGO",
    body: "2 hours out — price locked at $23. You're charged now.",
    unread: true,
  },
  {
    id: "n5",
    type: "UPDATE",
    session: "Tuesday HIIT",
    time: "YESTERDAY",
    body: "Session didn't hit minimum. Nothing charged. Hold released.",
    unread: false,
  },
  {
    id: "n6",
    type: "UPDATE",
    session: "Dance Collective",
    time: "MON",
    body: "Your rating for Dance Collective was received. Thanks ✌️",
    unread: false,
  },
];

type Filter = "ALL" | "UNREAD" | "ACTION" | "CONFIRMED" | "UPDATE";
const FILTERS: Filter[] = ["ALL", "UNREAD", "ACTION", "CONFIRMED", "UPDATE"];

// ─── CARD STYLES ──────────────────────────────────────────────────────────────
const cardBg: Record<NotifType, string> = {
  DROPPING: "#FFD166",
  ALMOST_FULL: "#2C8FE0",
  CONFIRMED: "#ffffff",
  ACTION: "#2C8FE0",
  UPDATE: "#ffffff",
};

const cardLabel: Record<NotifType, string> = {
  DROPPING: "PRICE DROPPING",
  ALMOST_FULL: "ALMOST FULL",
  CONFIRMED: "CONFIRMED",
  ACTION: "ACTION NEEDED",
  UPDATE: "UPDATE",
};

const labelColor: Record<NotifType, string> = {
  DROPPING: "rgba(26,26,26,0.55)",
  ALMOST_FULL: "rgba(255,255,255,0.65)",
  CONFIRMED: "#7A8330",
  ACTION: "rgba(255,255,255,0.65)",
  UPDATE: "#9A9590",
};

const textColor: Record<NotifType, string> = {
  DROPPING: "#1A1A1A",
  ALMOST_FULL: "#ffffff",
  CONFIRMED: "#1A1A1A",
  ACTION: "#ffffff",
  UPDATE: "#1A1A1A",
};

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function NotificationsPage() {
  const [filter, setFilter] = useState<Filter>("ALL");

  const filtered = NOTIFS.filter((n) => {
    if (filter === "ALL") return true;
    if (filter === "UNREAD") return n.unread;
    if (filter === "CONFIRMED") return n.type === "CONFIRMED";
    if (filter === "ACTION") return n.type === "ACTION";
    if (filter === "UPDATE") return n.type === "UPDATE";
    return true;
  });

  const unreadCount = NOTIFS.filter((n) => n.unread).length;

  return (
    <main className="min-h-screen bg-cream pb-20">

      {/* ── NAV ── */}
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <Link href="/home" className="text-ink"><SMark size={28} /></Link>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">
          A7 · Inbox
        </p>
        <Link href="/home" className="text-muted hover:text-ink text-lg transition-colors" aria-label="Home">
          ×
        </Link>
      </nav>

      <div className="px-4 max-w-lg mx-auto">

        {/* ── HEADLINE ── */}
        <div className="mb-5">
          <h1
            className="font-display font-bold text-ink"
            style={{ fontSize: "clamp(44px, 12vw, 58px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}
          >
            What&apos;s<br />moving.
          </h1>
          {unreadCount > 0 && (
            <p className="font-mono text-xs font-bold text-muted uppercase tracking-widest mt-2">
              {unreadCount} unread
            </p>
          )}
        </div>

        {/* ── FILTER PILLS ── */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 -mx-4 px-4 scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="font-mono text-xs font-bold px-4 py-2 rounded-pill whitespace-nowrap transition-all flex-shrink-0"
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

        {/* ── NOTIFICATION CARDS ── */}
        <div className="space-y-3">
          {filtered.map((n) => {
            const bg = cardBg[n.type];
            const label = cardLabel[n.type];
            const lblColor = labelColor[n.type];
            const txt = textColor[n.type];
            const isLight = n.type === "CONFIRMED" || n.type === "UPDATE";

            return (
              <div
                key={n.id}
                className="rounded-card p-4 relative overflow-hidden"
                style={{ backgroundColor: bg, boxShadow: isLight ? "0 1px 4px rgba(0,0,0,0.08)" : "none" }}
              >
                {/* Unread dot */}
                {n.unread && (
                  <span
                    className="absolute top-4 right-4 w-2 h-2 rounded-full"
                    style={{ backgroundColor: isLight ? "#2C8FE0" : "#fff" }}
                  />
                )}

                {/* Label + time */}
                <div className="flex items-center gap-2 mb-2">
                  {n.type === "CONFIRMED" && (
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#4CAF82" }} />
                  )}
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.18em]" style={{ color: lblColor }}>
                    {label}
                  </p>
                  <span className="font-mono text-xs" style={{ color: lblColor }}>· {n.time}</span>
                </div>

                {/* Session title */}
                <h3
                  className="font-display font-bold leading-tight mb-1"
                  style={{ fontSize: "20px", color: txt }}
                >
                  {n.session}
                </h3>

                {/* Price badge for dropping */}
                {n.type === "DROPPING" && n.price && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono font-black text-ink" style={{ fontSize: "28px" }}>
                      ${n.price}
                    </span>
                    {n.wasPrice && (
                      <span className="font-mono text-sm text-ink line-through" style={{ opacity: 0.50 }}>
                        ${n.wasPrice}
                      </span>
                    )}
                  </div>
                )}

                {/* Body */}
                <p className="text-sm leading-snug mb-4" style={{ color: txt, opacity: 0.85 }}>
                  {n.body}
                </p>

                {/* Actions */}
                {(n.type === "DROPPING") && (
                  <div className="flex gap-2">
                    <button
                      className="flex-1 font-semibold rounded-pill transition-all active:scale-[0.98] hover:brightness-95"
                      style={{ backgroundColor: "#1A1A1A", color: "#fff", height: "44px", fontSize: "14px" }}
                    >
                      Bring a mate
                    </button>
                    <Link
                      href={`/sessions/1`}
                      className="flex-1 flex items-center justify-center font-semibold rounded-pill transition-all hover:bg-black/10 active:scale-[0.98]"
                      style={{ border: "1.5px solid rgba(26,26,26,0.30)", color: "#1A1A1A", height: "44px", fontSize: "14px" }}
                    >
                      View
                    </Link>
                  </div>
                )}

                {n.type === "ALMOST_FULL" && (
                  <div className="flex gap-2">
                    <button
                      className="flex-1 font-semibold rounded-pill transition-all active:scale-[0.98] hover:brightness-95"
                      style={{ backgroundColor: "#fff", color: "#1A1A1A", height: "44px", fontSize: "14px" }}
                    >
                      View session
                    </button>
                  </div>
                )}

                {n.type === "ACTION" && (
                  <button
                    className="w-full font-semibold rounded-pill transition-all active:scale-[0.98]"
                    style={{ backgroundColor: "#fff", color: "#1A1A1A", height: "44px", fontSize: "14px" }}
                  >
                    View details
                  </button>
                )}

                {(n.type === "CONFIRMED" || n.type === "UPDATE") && (
                  <Link
                    href={`/sessions/1`}
                    className="inline-flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-widest transition-colors hover:opacity-70"
                    style={{ color: n.type === "CONFIRMED" ? "#2C8FE0" : "#9A9590" }}
                  >
                    View →
                  </Link>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </main>
  );
}
