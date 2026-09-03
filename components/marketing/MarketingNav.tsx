"use client";

import { useState } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";

const LINKS = [
  { label: "WHAT'S ON", href: "#whats-on" },
  { label: "HOW IT WORKS", href: "#how-it-works" },
  { label: "SUGGEST A STRETCHY", href: "#suggest" },
  { label: "ABOUT", href: "#about" },
  { label: "OPPORTUNITIES", href: "#opportunities" },
];

export default function MarketingNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <div
        className="sticky top-0 z-30 flex items-center justify-between gap-5 px-[18px] py-[14px] lg:px-[34px] lg:py-4 bg-cream text-ink border-b-2 border-ink"
        style={{ transform: "translateZ(0)", WebkitTransform: "translateZ(0)", willChange: "transform" }}
      >
        <div className="flex items-center gap-[9px] lg:gap-3">
          <div className="text-purple">
            <SMark size={32} />
          </div>
          <div className="font-display text-[20px] lg:text-[22px] leading-none">STRETCHY</div>
        </div>

        <div className="hidden lg:flex gap-5 font-mono text-[11px] font-extrabold tracking-[0.11em]">
          {LINKS.map((l, i) => (
            <a key={l.label} href={l.href} className={i === 0 ? "text-ink" : "text-ink/60 hover:text-ink transition-colors"}>
              {l.label}
            </a>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
          <Link href="/login" className="text-[13px] font-semibold text-ink/65 whitespace-nowrap">
            Log in
          </Link>
          <a
            href="#whats-on"
            className="inline-flex items-center justify-center bg-purple text-cream rounded-pill h-11 px-[18px] text-[13px] font-bold whitespace-nowrap"
          >
            See what&rsquo;s on
          </a>
        </div>

        <div className="flex lg:hidden items-center gap-[10px]">
          <a
            href="#whats-on"
            className="inline-flex items-center h-11 px-4 bg-purple text-cream rounded-pill text-[13px] font-bold whitespace-nowrap"
          >
            What&rsquo;s on
          </a>
          <button
            aria-label="Menu"
            onClick={() => setMenuOpen(true)}
            className="w-11 h-11 flex-shrink-0 bg-transparent border-none p-0 cursor-pointer flex flex-col justify-center items-center gap-1"
          >
            <span className="block w-[22px] h-[2px] bg-ink" />
            <span className="block w-[22px] h-[2px] bg-ink" />
            <span className="block w-[22px] h-[2px] bg-ink" />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-ink/40" onClick={() => setMenuOpen(false)} />
      )}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 w-80 max-w-[85vw] bg-cream border-l-2 border-ink flex flex-col transition-transform duration-300 ease-out"
        style={{ transform: menuOpen ? "translateX(0)" : "translateX(100%)" }}
      >
        <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b-2 border-ink">
          <div className="text-purple">
            <SMark size={28} />
          </div>
          <button
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="text-2xl leading-none text-ink"
          >
            ×
          </button>
        </div>
        <nav className="flex-1 px-5 py-6 flex flex-col gap-1">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="font-mono text-[13px] font-extrabold tracking-[0.11em] text-ink py-3 border-b border-border"
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/login"
            onClick={() => setMenuOpen(false)}
            className="mt-6 inline-flex items-center justify-center h-12 rounded-pill border-2 border-ink text-ink font-semibold text-sm"
          >
            Log in
          </Link>
        </nav>
      </div>
    </>
  );
}
