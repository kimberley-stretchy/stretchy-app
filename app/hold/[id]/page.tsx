"use client";

import { useState } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";
import HowToStretchy from "@/components/HowToStretchy";
import { googleCalendarUrl, downloadIcs } from "@/lib/calendar";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK_HOLD = {
  id: "1",
  title: "Sunday Slow Flow",
  host: { name: "Tāne", fullName: "Tāne Ratima" },
  neighbourhood: "Grey Lynn",
  day: "SUN",
  time: "9:00 AM",
  // Session is 12+ hours away — cancel is allowed
  hoursUntilSession: 48,
  price: 28,
  socialVenue: "Little Bird Café next door",
  venueAddress: "510 Richmond Road, Grey Lynn, Auckland",
  // ISO dates used for calendar links (replace with real DB values when wired up)
  startISO: "2026-06-08T09:00:00+12:00",
  endISO:   "2026-06-08T10:00:00+12:00",
};

const canCancel = MOCK_HOLD.hoursUntilSession > 12;

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function PlaceHeldPage({ params }: { params: { id: string } }) {
  const [cancelState, setCancelState] = useState<"idle" | "confirm" | "cancelled">("idle");

  if (cancelState === "cancelled") {
    return (
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
        <p className="text-4xl mb-4">👋</p>
        <h1 className="font-display font-bold text-ink mb-2" style={{ fontSize: "36px", letterSpacing: "-0.03em" }}>
          Hold cancelled.
        </h1>
        <p className="text-sm text-muted leading-relaxed mb-8">
          No charge has been made. Your spot has been released back to the group.
        </p>
        <Link
          href="/sessions"
          className="font-semibold text-cream rounded-pill px-8 py-4 transition-all hover:brightness-110 active:scale-[0.98]"
          style={{ backgroundColor: "#1A1A1A", fontSize: "15px" }}
        >
          Browse sessions →
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream pb-20">

      {/* ── NAV ── */}
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/home" className="text-ink"><SMark size={28} /></Link>
          <Link href={`/sessions/${params.id}`} className="text-muted hover:text-ink text-lg transition-colors" aria-label="Back">←</Link>
        </div>
        <button className="font-mono text-xs font-bold px-4 py-2 rounded-pill border border-border text-ink hover:bg-sand-dark transition-colors">
          RECEIPT
        </button>
        <Link href="/notifications" className="flex items-center px-3 py-1.5 rounded-pill relative" style={{ backgroundColor: "#F5EDE3", border: "1px solid #D4CFC9" }} aria-label="Notifications">
          <span className="text-base">🔔</span>
          <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-hot-blue border-2 border-cream block" />
        </Link>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-4">

        {/* ── S-MARK ILLUSTRATION (sky blue) ── */}
        <div style={{ color: "#4FB8E0" }}>
          <SMark size={88} />
        </div>

        {/* ── YOUR HOLD LABEL ── */}
        <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-muted">
          Your hold
        </p>

        {/* ── HEADLINE ── */}
        <h1
          className="font-display font-bold text-ink"
          style={{ fontSize: "clamp(54px, 15vw, 70px)", letterSpacing: "-0.04em", lineHeight: "0.90" }}
        >
          Place<br />held.
        </h1>

        {/* ── SESSION SUMMARY CARD ── */}
        <div className="bg-white rounded-card shadow-card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-mono text-xs font-semibold text-muted uppercase tracking-wide">
              {MOCK_HOLD.day} · {MOCK_HOLD.time}
            </p>
            <span
              className="font-mono font-bold text-sm px-3 py-1 rounded-pill text-ink flex-shrink-0"
              style={{ backgroundColor: "#FFD166" }}
            >
              ${MOCK_HOLD.price}
            </span>
          </div>
          <h2 className="font-display font-bold text-ink leading-tight mb-0.5" style={{ fontSize: "24px" }}>
            {MOCK_HOLD.title}
          </h2>
          <p className="text-sm text-muted mb-3">
            {MOCK_HOLD.host.fullName} · {MOCK_HOLD.neighbourhood}
          </p>
          <div
            className="flex items-center justify-between px-3 py-2.5 rounded-card"
            style={{ backgroundColor: "#E8F3FF" }}
          >
            <p className="text-sm leading-snug" style={{ color: "#1A4A80" }}>
              No charge yet — you can cancel any time up to 36 hrs out when the session is confirmed. The price can still get cheaper as more people join up to 2 hrs out. Your card is charged at that point, at that price.
            </p>
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#4CAF82" }} />
              <span className="font-mono text-xs font-bold tracking-wide" style={{ color: "#2C8FE0" }}>HOLDING</span>
            </div>
          </div>
        </div>

        {/* ── BRING A MATE CARD ── */}
        <div className="bg-white rounded-card shadow-card p-4">
          <div className="flex items-start gap-3 mb-4">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-lg flex-shrink-0"
              style={{ backgroundColor: "#2C8FE0" }}
            >
              +
            </div>
            <div>
              <p className="font-bold text-ink">Want it cheaper for everyone?</p>
              <p className="text-sm text-muted">Share — each mate drops the price.</p>
            </div>
          </div>
          <button
            className="w-full flex items-center justify-center gap-2 font-semibold text-cream rounded-pill transition-all active:scale-[0.98] hover:brightness-110"
            style={{ backgroundColor: "#1A1A1A", height: "50px", fontSize: "15px" }}
          >
            ▶ Bring a mate · live price ${MOCK_HOLD.price}
          </button>
        </div>

        {/* ── SOCIAL STRETCH BLUE CARD ── */}
        <div className="rounded-card p-4 relative overflow-hidden" style={{ backgroundColor: "#2C8FE0" }}>
          <div className="absolute right-[-16px] top-[-12px] opacity-10" style={{ color: "#fff" }}>
            <SMark size={100} />
          </div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] mb-2" style={{ color: "rgba(255,255,255,0.65)" }}>
            Social Stretch 🤙
          </p>
          <p className="text-white font-semibold leading-snug mb-1" style={{ fontSize: "15px" }}>
            {MOCK_HOLD.host.name} is planning a Social Stretch after at {MOCK_HOLD.socialVenue} — coffee, a cold one, good company.
          </p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.60)" }}>
            Details on session day.
          </p>
        </div>

        {/* ── CALENDAR BUTTONS ── */}
        <div className="flex gap-3">
          <a
            href={googleCalendarUrl({
              title: `Stretchy — ${MOCK_HOLD.title}`,
              startISO: MOCK_HOLD.startISO,
              endISO: MOCK_HOLD.endISO,
              location: MOCK_HOLD.venueAddress,
              description: `Session with ${MOCK_HOLD.host.fullName} in ${MOCK_HOLD.neighbourhood}. Stick around for the Social Stretch after at ${MOCK_HOLD.socialVenue}.`,
            })}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center font-mono text-xs font-bold text-ink rounded-pill border border-border py-3 transition-all hover:bg-sand-dark active:scale-[0.98]"
          >
            + Google Cal
          </a>
          <button
            onClick={() => downloadIcs({
              title: `Stretchy — ${MOCK_HOLD.title}`,
              startISO: MOCK_HOLD.startISO,
              endISO: MOCK_HOLD.endISO,
              location: MOCK_HOLD.venueAddress,
              description: `Session with ${MOCK_HOLD.host.fullName} in ${MOCK_HOLD.neighbourhood}. Stick around for the Social Stretch after at ${MOCK_HOLD.socialVenue}.`,
            })}
            className="flex-1 font-mono text-xs font-bold text-ink rounded-pill border border-border py-3 transition-all hover:bg-sand-dark active:scale-[0.98]"
          >
            + Apple Cal
          </button>
        </div>

        {/* ── HOW TO STRETCHY (reminder, sits last) ── */}
        <HowToStretchy />

        {/* ── CANCEL HOLD ── */}
        {canCancel ? (
          cancelState === "confirm" ? (
            <div className="bg-white rounded-card shadow-card p-5 space-y-3">
              <p className="font-bold text-ink text-sm">Cancel your hold?</p>
              <p className="text-sm text-muted leading-snug">
                No charge will be made. Your spot goes back to the group — someone else might fill it.
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setCancelState("idle")}
                  className="flex-1 font-mono text-xs font-bold text-ink rounded-pill border border-border py-3 hover:bg-sand-dark transition-all"
                >
                  Keep my hold
                </button>
                <button
                  onClick={() => setCancelState("cancelled")}
                  className="flex-1 font-mono text-xs font-bold text-white rounded-pill transition-all hover:brightness-110 active:scale-[0.98]"
                  style={{ backgroundColor: "#E63946", height: "44px" }}
                >
                  Yes, cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setCancelState("confirm")}
              className="w-full font-semibold rounded-pill transition-all hover:bg-red/10 active:scale-[0.98] flex items-center justify-between px-6"
              style={{ border: "1.5px solid #E63946", color: "#E63946", height: "56px", fontSize: "15px" }}
            >
              <span>Cancel hold</span>
              <span>×</span>
            </button>
          )
        ) : (
          <div
            className="rounded-card px-4 py-3 flex items-start gap-2"
            style={{ backgroundColor: "#FFF4E6" }}
          >
            <span className="text-base flex-shrink-0">⚠️</span>
            <p className="text-xs text-ink leading-snug">
              <span className="font-bold">Cancellations close 12 hours before the session.</span> The window has passed — your place is locked in.
            </p>
          </div>
        )}

      </div>
    </main>
  );
}
