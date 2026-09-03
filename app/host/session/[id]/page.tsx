"use client";

import { useState } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK = {
  id: "1",
  title: "Sunday Slow Flow",
  status: "CONFIRMED",
  day: "SUN 31",
  time: "9:00 AM",
  roster: 9,
  minimum: 8,
  currentPrice: 19,
  socialVenue: "Little Bird",
  runOfShow: [
    { time: "8:45", label: "doors" },
    { time: "9:00", label: "sharp start" },
    { time: "10:00", label: "close" },
    { time: "~10:15", label: `Social Stretch at Little Bird` },
  ],
};

interface Attendee {
  id: string;
  initial: string;
  color: string;
  name: string;
  tag: string;
  tagColor?: string;
  sessions: number;
  checkedIn: boolean;
  flagged?: boolean; // red border = needs host awareness
  note?: string;
}

const ATTENDEES: Attendee[] = [
  { id: "a1", initial: "M", color: "#902F8A", name: "Marlee F.", tag: "NEW THIS MONTH", sessions: 27, checkedIn: true },
  { id: "a2", initial: "K", color: "#0000FF", name: "Kit P.", tag: "REGULAR · 6 IN A ROW", sessions: 18, checkedIn: true },
  { id: "a3", initial: "S", color: "#716F39", name: "Sam W.", tag: "pregnancy · modifications", tagColor: "#C6362E", sessions: 4, checkedIn: false, flagged: true, note: "pregnancy · modifications" },
  { id: "a4", initial: "J", color: "#0000FF", name: "Jess M.", tag: "FIRST STRETCHY 🎉", sessions: 1, checkedIn: false },
  { id: "a5", initial: "A", color: "#E96709", name: "Ari T.", tag: "REGULAR", sessions: 12, checkedIn: false },
  { id: "a6", initial: "L", color: "#C6362E", name: "Lena B.", tag: "REGULAR", sessions: 9, checkedIn: false },
  { id: "a7", initial: "T", color: "#29ABE2", name: "Theo R.", tag: "NEW MATE", sessions: 2, checkedIn: false },
  { id: "a8", initial: "P", color: "#902F8A", name: "Pip C.", tag: "knee · gentle", tagColor: "#C6362E", sessions: 5, checkedIn: false, flagged: true, note: "knee · gentle" },
  { id: "a9", initial: "O", color: "#9A9590", name: "Olive K.", tag: "NEW MATE", sessions: 1, checkedIn: false },
];

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function ManageSessionPage({ params }: { params: { id: string } }) {
  const [attendees, setAttendees] = useState<Attendee[]>(ATTENDEES);

  const checkedInCount = attendees.filter((a) => a.checkedIn).length;

  const toggleCheckIn = (id: string) => {
    setAttendees((prev) =>
      prev.map((a) => (a.id === id ? { ...a, checkedIn: !a.checkedIn } : a))
    );
  };

  return (
    <main className="min-h-screen bg-cream pb-20">

      {/* ── NAV ── */}
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/host/home" className="text-ink"><SMark size={28} /></Link>
          <Link href="/host/dashboard" className="text-muted hover:text-ink text-lg transition-colors" aria-label="Back">←</Link>
        </div>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">Manage</p>
        <Link href="/host/inbox" className="flex items-center px-3 py-1.5 rounded-pill relative" style={{ backgroundColor: "#F7F0E8", border: "1px solid #D4CFC9" }} aria-label="Notifications">
          <span className="text-base">🔔</span>
          <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-hot-blue border-2 border-cream block" />
        </Link>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-4">

        {/* ── STATUS + HEADLINE ── */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "#716F39" }} />
            <p className="font-mono text-xs font-bold uppercase tracking-widest" style={{ color: "#716F39" }}>
              {MOCK.status} · {MOCK.day} · {MOCK.time}
            </p>
          </div>
          <h1
            className="font-display font-bold text-ink"
            style={{ fontSize: "clamp(38px, 10vw, 52px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}
          >
            Who&apos;s coming.
          </h1>
        </div>

        {/* ── ROSTER SUMMARY CARD ── */}
        <div className="bg-white rounded-card border-2 border-ink p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-1">Roster</p>
              <p className="font-display font-bold text-ink" style={{ fontSize: "28px", letterSpacing: "-0.03em" }}>
                {MOCK.roster} <span className="text-muted font-normal" style={{ fontSize: "18px" }}>/ {MOCK.minimum} min</span>
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-1">Current Price</p>
              <p className="font-mono font-black text-ink" style={{ fontSize: "28px", letterSpacing: "-0.04em" }}>
                <span style={{ fontSize: "16px" }}>$</span>{MOCK.currentPrice}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              className="flex-1 font-mono text-xs font-bold rounded-pill text-white transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ backgroundColor: "#14110F", height: "44px" }}
            >
              ≡ Message all
            </button>
            <button
              className="flex-1 font-mono text-xs font-bold rounded-pill text-ink transition-all hover:bg-sand-dark active:scale-[0.98]"
              style={{ border: "1.5px solid #D4CFC9", height: "44px" }}
            >
              ↗ Share
            </button>
          </div>
        </div>

        {/* ── RUN OF SHOW (yellow) ── */}
        <div className="rounded-card p-4" style={{ backgroundColor: "#FCBB16", border: "2px solid #14110F" }}>
          <p className="font-mono text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(26,26,26,0.55)" }}>
            Run of Show
          </p>
          <p className="text-sm font-semibold text-ink leading-relaxed">
            {MOCK.runOfShow.map((r, i) => (
              <span key={i}>
                <strong>{r.time}</strong> {r.label}
                {i < MOCK.runOfShow.length - 1 ? " · " : ""}
              </span>
            ))}
          </p>
        </div>

        {/* ── CHECK IN ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-ink" style={{ fontSize: "22px" }}>
              Check in
            </h2>
            <p className="font-mono text-xs font-bold text-muted uppercase tracking-widest">
              {checkedInCount} / {attendees.length} IN
            </p>
          </div>

          <div className="space-y-2">
            {attendees.map((a) => (
              <div
                key={a.id}
                className="bg-white rounded-card border-2 border-ink p-3 flex items-center gap-3"
                style={a.flagged ? { border: "1.5px solid #C6362E" } : undefined}
              >
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                  style={{ backgroundColor: a.color }}
                >
                  {a.initial}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-ink text-sm">{a.name}</p>
                  <p
                    className="font-mono text-xs mt-0.5"
                    style={{ color: a.tagColor ?? "#9A9590" }}
                  >
                    {a.note ? `· ${a.note}` : a.tag.toLowerCase()}
                  </p>
                </div>

                {/* Session count */}
                <p className="font-mono text-sm font-bold text-muted flex-shrink-0">{a.sessions}</p>

                {/* Check-in toggle */}
                <button
                  onClick={() => toggleCheckIn(a.id)}
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
                  style={{
                    backgroundColor: a.checkedIn ? "#716F39" : "transparent",
                    border: a.checkedIn ? "none" : "1.5px solid #D4CFC9",
                  }}
                  aria-label={a.checkedIn ? "Mark absent" : "Mark checked in"}
                >
                  {a.checkedIn && (
                    <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                      <path d="M1 5L5 9L13 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── FLOOR NOT MET LINK ── */}
        <Link href="/host/floor-not-met">
          <div className="rounded-card p-4 flex items-center justify-between" style={{ backgroundColor: "#E96709", border: "2px solid #14110F" }}>
            <div>
              <p className="font-mono text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.65)" }}>
                Heads up
              </p>
              <p className="font-bold text-white text-sm">Short of the floor? Tap to see your options.</p>
            </div>
            <span className="text-white text-lg flex-shrink-0">›</span>
          </div>
        </Link>

      </div>
    </main>
  );
}
