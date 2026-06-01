"use client";

import { useState } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";
import HowToStretchy from "@/components/HowToStretchy";
import { MenuDrawer, MenuRow } from "@/components/MenuDrawer";

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#2C8FE0" }}
    >
      {/* ── NAV ── */}
      <nav className="flex items-center justify-between px-5 py-4 max-w-lg mx-auto w-full">
        {/* S-mark */}
        <Link href="/home" className="text-cream">
          <SMark size={28} />
        </Link>

        {/* MENU + Bell pill — right side */}
        <div
          className="flex items-center rounded-pill overflow-hidden"
          style={{ backgroundColor: "rgba(245,237,227,0.18)" }}
        >
          <button
            onClick={() => setMenuOpen(true)}
            className="flex items-center gap-1.5 pl-4 pr-3 py-2 font-mono text-xs font-bold uppercase tracking-widest transition-all hover:brightness-110"
            style={{ color: "#F5EDE3" }}
            aria-label="Open menu"
          >
            <span className="text-sm">≡</span>
            <span>MENU</span>
          </button>
          <div className="w-px h-4 flex-shrink-0" style={{ backgroundColor: "rgba(245,237,227,0.25)" }} />
          <Link
            href="/notifications"
            className="pl-3 pr-4 py-2 opacity-80 hover:opacity-100 transition-opacity text-sm"
            aria-label="Notifications"
          >
            🔔
          </Link>
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-lg mx-auto w-full">

        {/* Large S-mark */}
        <div className="text-cream mb-8">
          <SMark size={160} />
        </div>

        {/* Location + week label */}
        <p
          className="font-mono text-cream text-center uppercase tracking-[0.18em] mb-4"
          style={{ fontSize: "11px", opacity: 0.70 }}
        >
          Auckland · This week
        </p>

        {/* Headline */}
        <h1
          className="text-cream font-display font-bold text-center"
          style={{
            fontSize: "clamp(44px, 13vw, 60px)",
            letterSpacing: "-0.03em",
            lineHeight: "0.92",
          }}
        >
          A social<br />movement.
        </h1>

        {/* Subtext */}
        <p
          className="text-cream text-center mt-4 leading-snug"
          style={{ fontSize: "15px", opacity: 0.80 }}
        >
          The larger the group gets, the better value for all. Join us.
        </p>

        {/* CTAs */}
        <div className="w-full mt-8 flex flex-col gap-3">
          <Link
            href="/sessions"
            className="w-full flex items-center justify-between px-7 font-semibold text-ink rounded-pill transition-all hover:brightness-95 active:scale-[0.98]"
            style={{ backgroundColor: "#F5EDE3", height: "64px", fontSize: "17px" }}
          >
            <span>See this week</span>
            <span>→</span>
          </Link>

          <Link
            href="/host/create"
            className="w-full flex items-center justify-between px-7 font-semibold text-cream rounded-pill transition-all hover:brightness-125 active:scale-[0.98]"
            style={{ backgroundColor: "#1A1A1A", height: "58px", fontSize: "16px" }}
          >
            <span>Host a Stretchy</span>
            <span>→</span>
          </Link>

          <Link
            href="/suggest"
            className="w-full flex items-center justify-between px-7 font-semibold text-cream rounded-pill border transition-all hover:bg-white/10 active:scale-[0.98]"
            style={{ borderColor: "rgba(245,237,227,0.40)", height: "52px", fontSize: "15px" }}
          >
            <span>Suggest a Stretchy</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* ── HOW TO STRETCHY ── */}
      <div className="px-5 pt-10 pb-6 max-w-lg mx-auto w-full">
        <HowToStretchy />
      </div>

      {/* ── YELLOW FOOTER STRIP ── */}
      <div
        className="h-3"
        style={{ backgroundColor: "#FFD166" }}
      />

      {/* ── MENU DRAWER ── */}
      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </main>
  );
}
