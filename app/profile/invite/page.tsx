"use client";

import { useState } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";

const INVITE_URL = "https://stretchy.club/join?ref=marlee-fisher-gk72";

export default function InvitePage() {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(INVITE_URL).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <main className="min-h-screen bg-cream pb-20">
      {/* NAV */}
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/home" className="text-ink"><SMark size={28} /></Link>
          <Link href="/profile" className="text-muted hover:text-ink text-lg">←</Link>
        </div>
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-muted">
          Invite
        </span>
        <div className="w-10" />
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-5">

        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.20em] text-muted mb-2">
            Bigger group · better price for all
          </p>
          <h1
            className="font-display font-bold text-ink"
            style={{ fontSize: "clamp(40px,11vw,54px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}
          >
            Bring your<br />mates.
          </h1>
        </div>

        {/* Mechanic card */}
        <div
          className="rounded-card px-5 py-5"
          style={{ backgroundColor: "#FFD166" }}
        >
          <p className="font-mono text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(26,26,26,0.55)" }}>
            How it works
          </p>
          <div className="space-y-3">
            {[
              { icon: "🔗", text: "Share your personal link below." },
              { icon: "🧘", text: "Your mate joins and holds their first spot." },
              { icon: "📉", text: "More people = lower price for everyone in the session." },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0 mt-0.5">{item.icon}</span>
                <p className="text-sm font-semibold text-ink leading-snug">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Link card */}
        <div className="bg-white rounded-card shadow-card p-4 space-y-3">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">Your link</p>

          {/* URL display */}
          <div
            className="flex items-center gap-2 px-4 py-3.5 rounded-pill"
            style={{ backgroundColor: "#F5EDE3" }}
          >
            <p className="flex-1 font-mono text-xs text-ink truncate min-w-0">{INVITE_URL}</p>
          </div>

          {/* Copy button */}
          <button
            onClick={copyLink}
            className="w-full font-semibold rounded-pill transition-all hover:brightness-110 active:scale-[0.98]"
            style={{
              backgroundColor: copied ? "#4CAF82" : "#1A1A1A",
              color: "#F5EDE3",
              height: "54px",
              fontSize: "15px",
            }}
          >
            {copied ? "✓ Copied!" : "Copy link"}
          </button>
        </div>

        {/* Share options */}
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-2">Share via</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Messages",   icon: "💬", bg: "#E8F5F0", color: "#2D6A4A" },
              { label: "Instagram",  icon: "📸", bg: "#F3E8FF", color: "#7C3AED" },
              { label: "WhatsApp",   icon: "📱", bg: "#E8F5F0", color: "#16A34A" },
              { label: "More",       icon: "⬆",  bg: "#F5EDE3", color: "#1A1A1A" },
            ].map((opt) => (
              <button
                key={opt.label}
                className="flex items-center gap-2.5 px-4 py-3.5 rounded-card font-semibold text-sm transition-all hover:brightness-95 active:scale-[0.98]"
                style={{ backgroundColor: opt.bg, color: opt.color }}
              >
                <span className="text-xl">{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-card shadow-card p-4">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-3">Your impact</p>
          <div className="flex gap-4">
            <div className="text-center flex-1">
              <p className="font-mono font-black text-ink" style={{ fontSize: "36px", lineHeight: "1", letterSpacing: "-0.04em" }}>4</p>
              <p className="font-mono text-xs text-muted mt-1">MATES JOINED</p>
            </div>
            <div className="w-px bg-border" />
            <div className="text-center flex-1">
              <p className="font-mono font-black text-ink" style={{ fontSize: "36px", lineHeight: "1", letterSpacing: "-0.04em" }}>27</p>
              <p className="font-mono text-xs text-muted mt-1">SESSIONS TOGETHER</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
