"use client";

import { useState } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";
import HowToStretchy from "@/components/HowToStretchy";
import { useFavourites, FavouriteSession } from "@/hooks/useFavourites";

// ─── TYPE CONFIG ──────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  yoga:       "#A535C7",
  pilates:    "#2A3FE0",
  breathwork: "#7A8330",
  sound_bath: "#4FB8E0",
  run_club:   "#E63946",
  dance:      "#FF6B35",
  hiit:       "#FF4D9E",
  other:      "#6B6B6B",
};
const TYPE_LABELS: Record<string, string> = {
  yoga: "YOGA", pilates: "PILATES", breathwork: "BREATH",
  sound_bath: "SOUND", run_club: "RUN", dance: "DANCE", hiit: "HIIT", other: "OTHER",
};
const TYPE_INITIALS: Record<string, string> = {
  yoga: "Y", pilates: "P", breathwork: "B",
  sound_bath: "S", run_club: "R", dance: "D", hiit: "H", other: "?",
};

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_SESSIONS = [
  {
    id: "1", title: "Herne Bay Breath",
    isCharity: false, charity: undefined,
    host: { name: "Alex K." }, neighbourhood: "Herne Bay",
    day: "WED 27 MAY", time: "7:00 PM", sessionType: "breathwork",
    spotsHeld: 6, minimumSpots: 8, maxCapacity: 20, rating: 5,
    statusLabel: "GOING AHEAD", statusColor: "#4CAF82", priceLabel: "19",
    confirmed: true,
  },
  {
    id: "2", title: "Ponsonby Pilates",
    host: { name: "Jess M." }, neighbourhood: "Ponsonby",
    day: "THU 28 MAY", time: "6:30 AM", sessionType: "pilates",
    spotsHeld: 3, minimumSpots: 10, maxCapacity: 20, rating: 3,
    statusLabel: "NEEDS 7 TO GO", statusColor: "#FF6B35", priceLabel: "30",
    confirmed: false,
  },
  {
    id: "3", title: "K Rd Sound Bath",
    host: { name: "Sam F." }, neighbourhood: "Karangahape",
    day: "FRI 29 MAY", time: "8:00 PM", sessionType: "sound_bath",
    spotsHeld: 14, minimumSpots: 8, maxCapacity: 20, rating: 4,
    statusLabel: "FILLING FAST", statusColor: "#FF6B35", priceLabel: "16",
    confirmed: true,
  },
  {
    id: "4", title: "Sunday Slow Flow",
    host: { name: "Tāne R." }, neighbourhood: "Grey Lynn",
    day: "SUN 1 JUN", time: "9:00 AM", sessionType: "yoga",
    spotsHeld: 5, minimumSpots: 8, maxCapacity: 20, rating: 5,
    statusLabel: "3 MORE TO CONFIRM", statusColor: "#7A8330", priceLabel: "28",
    confirmed: false, isCharity: false,
  },
  {
    id: "5", title: "Flow for Mind NZ",
    host: { name: "Sofia M." }, neighbourhood: "Ponsonby",
    day: "SAT 7 JUN", time: "10:00 AM", sessionType: "yoga",
    spotsHeld: 11, minimumSpots: 8, maxCapacity: 20, rating: 5,
    statusLabel: "GOING AHEAD", statusColor: "#4CAF82", priceLabel: "22",
    confirmed: true, isCharity: true,
    charity: { name: "Mental Health Foundation NZ", instagram: "mentalhealthfndn" },
  },
];

const FILTER_HOODS = ["All", "Grey Lynn", "Pt Chev", "Ponsonby", "K Rd"];

// ─── S-MARK PIPS (rating) ─────────────────────────────────────────────────────
function SMarkPips({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{ opacity: i < rating ? 1 : 0.22 }}>
          <SMark size={14} className="text-olive" />
        </span>
      ))}
    </div>
  );
}

// ─── SESSION CARD ─────────────────────────────────────────────────────────────
function SessionCard({
  s,
  faved,
  onHeart,
}: {
  s: (typeof MOCK_SESSIONS)[0];
  faved: boolean;
  onHeart: () => void;
}) {
  const typeColor = TYPE_COLORS[s.sessionType] ?? "#6B6B6B";
  const typeLabel = TYPE_LABELS[s.sessionType] ?? "OTHER";
  const initial   = TYPE_INITIALS[s.sessionType] ?? "?";
  const belowMin  = s.spotsHeld < s.minimumSpots;

  return (
    <div className="relative group">
      <Link href={`/sessions/${s.id}`} className="block">
      <div
        className="bg-white rounded-card shadow-card group-hover:shadow-card-hover transition-shadow duration-200 p-4"
        style={s.confirmed ? { outline: "2px solid #4CAF82" } : undefined}
      >
        {/* Row 1: date | time | initial circle */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {/* Date — dark pill */}
            <span
              className="font-mono text-xs font-bold px-3 py-1.5 rounded-pill"
              style={{ backgroundColor: "#1A1A1A", color: "#F5EDE3" }}
            >
              {s.day}
            </span>
            {/* Time — cream pill */}
            <span
              className="font-mono text-xs font-semibold px-3 py-1.5 rounded-pill"
              style={{ backgroundColor: "#E8D9C8", color: "#6B6B6B" }}
            >
              {s.time}
            </span>
          </div>
          {/* Initial circle — top right */}
          <div
            className="w-10 h-10 rounded-card flex items-center justify-center font-bold text-base text-white flex-shrink-0"
            style={{ backgroundColor: typeColor }}
          >
            {initial}
          </div>
        </div>

        {/* Row 2: type pill + charity badge */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span
            className="font-mono text-xs font-bold px-2.5 py-1.5 rounded-pill"
            style={{ backgroundColor: typeColor, color: "#fff" }}
          >
            {typeLabel}
          </span>
          {s.isCharity && (
            <span
              className="font-mono text-xs font-bold px-2.5 py-1.5 rounded-pill flex items-center gap-1"
              style={{ backgroundColor: "#FFF4E6", color: "#FF6B35", border: "1px solid #F8DFC5" }}
            >
              🎗️ FUNDRAISER
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          className="font-display font-bold text-ink leading-tight mb-1"
          style={{ fontSize: "22px" }}
        >
          {s.title}
        </h3>

        {/* Host · location */}
        <p className="text-sm text-muted mb-2">{s.host.name} · {s.neighbourhood}</p>

        {/* S-mark pips */}
        <div className="mb-3">
          <SMarkPips rating={s.rating} />
        </div>

        {/* Status + price badge */}
        <div className="flex items-center justify-between">
          <p
            className="font-mono text-xs font-bold uppercase tracking-wide"
            style={{ color: s.statusColor }}
          >
            {belowMin
              ? `${s.spotsHeld}/${s.minimumSpots} HELD · ${s.statusLabel}`
              : `${s.spotsHeld} HELD · ${s.statusLabel}`}
          </p>
          {/* Price badge */}
          <div
            className="font-mono font-bold text-sm px-3 py-1.5 rounded-pill text-white flex-shrink-0 flex items-baseline gap-0.5"
            style={{ backgroundColor: typeColor }}
          >
            <span className="text-xs font-semibold">$</span>
            <span>{s.priceLabel}</span>
          </div>
        </div>
      </div>
      </Link>

      {/* ── HEART BUTTON (floats top-right, outside Link) ── */}
      <button
        onClick={(e) => { e.stopPropagation(); onHeart(); }}
        className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-90 z-10"
        style={{
          backgroundColor: faved ? "rgba(229,57,70,0.12)" : "rgba(255,255,255,0.85)",
          color: faved ? "#E63946" : "#C4BEB7",
          fontSize: "18px",
          backdropFilter: "blur(4px)",
        }}
        aria-label={faved ? "Remove from favourites" : "Save to favourites"}
      >
        {faved ? "♥" : "♡"}
      </button>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function SessionsPage() {
  const [activeHood, setActiveHood] = useState("All");
  const { toggle, isFaved } = useFavourites();

  const filtered =
    activeHood === "All"
      ? MOCK_SESSIONS
      : MOCK_SESSIONS.filter((s) =>
          s.neighbourhood.toLowerCase().includes(activeHood.toLowerCase()) ||
          (activeHood === "K Rd" && s.neighbourhood === "Karangahape")
        );

  return (
    <main className="min-h-screen bg-cream">

      {/* ── NAV ── */}
      <nav className="flex items-center justify-between px-5 py-4 max-w-lg mx-auto">
        <Link href="/home" className="text-ink">
          <SMark size={32} />
        </Link>
        <Link
          href="/home"
          className="flex items-center gap-1.5 px-4 py-2 rounded-pill font-mono text-xs font-bold uppercase tracking-widest text-ink border border-border hover:bg-sand-dark transition-colors"
        >
          ≡ MENU
        </Link>
        <Link href="/notifications" className="flex items-center px-3 py-1.5 rounded-pill relative" style={{ backgroundColor: "#F5EDE3", border: "1px solid #D4CFC9" }} aria-label="Notifications">
          <span className="text-base">🔔</span>
          <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-hot-blue border-2 border-cream block" />
        </Link>
      </nav>

      {/* ── HEADER ── */}
      <section className="px-5 pb-3 max-w-lg mx-auto">
        <h1
          className="font-display font-bold text-ink"
          style={{ fontSize: "clamp(40px,11vw,54px)", letterSpacing: "-0.03em", lineHeight: "1.0" }}
        >
          Pick your<br />stretch.
        </h1>
        <p className="text-muted text-sm mt-2">
          {filtered.length} session{filtered.length !== 1 ? "s" : ""} in your suburbs this week.
        </p>
      </section>

      {/* ── NEIGHBOURHOOD FILTER ── */}
      <div className="px-4 pb-5 max-w-lg mx-auto">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTER_HOODS.map((hood) => {
            const active = activeHood === hood;
            return (
              <button
                key={hood}
                onClick={() => setActiveHood(hood)}
                className="flex-shrink-0 text-sm font-semibold px-4 py-2 rounded-pill transition-all duration-150"
                style={
                  active
                    ? { backgroundColor: "#1A1A1A", color: "#F5EDE3" }
                    : { backgroundColor: "#E8D9C8", color: "#6B6B6B" }
                }
              >
                {hood}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── SESSION LIST ── */}
      <section className="px-4 pb-10 max-w-lg mx-auto space-y-3">
        {filtered.map((s) => {
          const typeColor = TYPE_COLORS[s.sessionType] ?? "#6B6B6B";
          const favData: FavouriteSession = {
            id: s.id, title: s.title, day: s.day, time: s.time,
            sessionType: s.sessionType, typeColor,
            typeLabel: TYPE_LABELS[s.sessionType] ?? "OTHER",
            initial: TYPE_INITIALS[s.sessionType] ?? "?",
            neighbourhood: s.neighbourhood,
            hostName: s.host.name, priceLabel: s.priceLabel,
          };
          return (
            <SessionCard
              key={s.id}
              s={s}
              faved={isFaved(s.id)}
              onHeart={() => toggle(favData)}
            />
          );
        })}
        {filtered.length === 0 && (
          <div className="card text-center py-10">
            <p className="text-muted text-sm">Nothing in {activeHood} this week.</p>
          </div>
        )}
      </section>

      {/* ── HOW TO STRETCHY ── */}
      <div className="px-4 pb-4 max-w-lg mx-auto">
        <HowToStretchy />
      </div>

      {/* ── SUGGEST PROMPT ── */}
      <div className="px-4 pb-12 max-w-lg mx-auto">
        <div className="card text-center py-6">
          <p className="text-muted text-sm mb-3">Don't see what you're after?</p>
          <Link href="/suggest" className="btn-ghost text-sm px-5 py-2.5">
            Suggest a Stretchy
          </Link>
        </div>
      </div>

    </main>
  );
}
