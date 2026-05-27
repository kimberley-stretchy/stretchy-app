"use client";

import { useState } from "react";
import Link from "next/link";

type Role = "attendee" | "host";

const ROLE_CONFIG = {
  attendee: {
    tab:           "I'M HERE TO MOVE",
    label:         "WELCOME BACK",
    headline:      "Hold your place.",
    subtitle:      "Your sessions, your mates, your price.",
    zoneBg:        "#FFD166",
    headlineColor: "#1A1A1A",
    labelColor:    "rgba(26,26,26,0.50)",
    subtitleColor: "#1A1A1A",
    tabActiveBg:   "#1A1A1A",   // black — yellow is the ZONE, not the tab
    tabActiveText: "#F5EDE3",
  },
  host: {
    tab:           "I'M HOSTING",
    label:         "WELCOME BACK",
    headline:      "Run your room.",
    subtitle:      "Your roster, your target, your payouts.",
    zoneBg:        "#A535C7",
    headlineColor: "#F5EDE3",
    labelColor:    "rgba(245,237,227,0.60)",
    subtitleColor: "rgba(245,237,227,0.85)",
    tabActiveBg:   "#A535C7",   // purple
    tabActiveText: "#F5EDE3",
  },
} as const;

type WaitlistRole = "mover" | "host" | "both";

export default function LoginPage() {
  const [role, setRole] = useState<Role>("attendee");
  const [email, setEmail]   = useState("");
  const [mobile, setMobile] = useState("");
  const [sent, setSent]     = useState(false);

  // ── International waitlist ──
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [wlName,    setWlName]    = useState("");
  const [wlEmail,   setWlEmail]   = useState("");
  const [wlCity,    setWlCity]    = useState("");
  const [wlCountry, setWlCountry] = useState("");
  const [wlRole,    setWlRole]    = useState<WaitlistRole>("mover");
  const [wlSent,    setWlSent]    = useState(false);

  const cfg = ROLE_CONFIG[role];

  function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim()) setSent(true);
  }

  return (
    <main className="min-h-screen bg-cream flex flex-col">

      {/* ── FULL-COLOUR HERO BLOCK (nav + headline) ── */}
      <div
        className="w-full transition-colors duration-300"
        style={{ backgroundColor: cfg.zoneBg }}
      >
        {/* NAV inside coloured block */}
        <nav className="relative flex items-center justify-center px-6 py-4 max-w-lg mx-auto w-full">
          <Link
            href="/"
            className="absolute left-6 hover:opacity-70 transition-opacity"
            style={{ color: cfg.headlineColor }}
            aria-label="Back"
          >
            ←
          </Link>
          <span
            className="font-mono text-xs font-bold uppercase tracking-[0.18em]"
            style={{ color: cfg.labelColor }}
          >
            LOG IN
          </span>
        </nav>

        {/* Headline content */}
        <div className="px-6 pt-4 pb-10 max-w-lg mx-auto w-full">
          <p
            className="font-mono text-xs font-bold uppercase tracking-[0.18em] mb-3"
            style={{ color: cfg.labelColor }}
          >
            {cfg.label}
          </p>
          <h1
            className="font-display font-bold leading-none mb-3"
            style={{
              fontSize: "clamp(44px, 13vw, 60px)",
              letterSpacing: "-0.03em",
              lineHeight: "0.92",
              color: cfg.headlineColor,
            }}
          >
            {cfg.headline}
          </h1>
          <p
            className="text-sm leading-snug"
            style={{ color: cfg.subtitleColor }}
          >
            {cfg.subtitle}
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full">

        {/* ── ROLE TABS ── */}
        <div className="mx-4 mt-4 flex rounded-pill border border-border bg-white overflow-hidden">
          {(["attendee", "host"] as Role[]).map((r) => {
            const active = role === r;
            return (
              <button
                key={r}
                onClick={() => { setRole(r); setSent(false); }}
                className="flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-200"
                style={
                  active
                    ? { backgroundColor: ROLE_CONFIG[r].tabActiveBg, color: ROLE_CONFIG[r].tabActiveText }
                    : { backgroundColor: "transparent", color: "#6B6B6B" }
                }
              >
                {ROLE_CONFIG[r].tab}
              </button>
            );
          })}
        </div>

        {/* ── HELPER TEXT ── */}
        <p className="text-center text-xs text-muted mt-2 mb-0 px-4">
          Some people are both. Either log-in unlocks the same account.
        </p>

        {/* ── AUTH FORM ── */}
        <div className="px-4 pt-6 pb-4">
          {sent ? (
            <div className="flex flex-col items-center text-center py-10">
              <p className="text-3xl mb-4">📬</p>
              <p className="font-bold text-lg text-ink mb-2">Check your inbox.</p>
              <p className="text-sm text-muted leading-relaxed">
                We sent a magic link to{" "}
                <span className="font-semibold text-ink">{email}</span>.
                <br />
                Tap it — you're in.
              </p>
              <button
                onClick={() => setSent(false)}
                className="mt-6 text-sm text-muted hover:text-ink transition-colors"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="flex flex-col gap-3">

              {/* Apple */}
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2.5 font-semibold rounded-pill transition-all hover:brightness-125 active:scale-[0.98]"
                style={{ backgroundColor: "#1A1A1A", color: "#F5EDE3", height: "56px", fontSize: "15px" }}
              >
                {/* Apple glyph */}
                <svg width="15" height="18" viewBox="0 0 814 1000" fill="currentColor" aria-hidden>
                  <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-42.8-150.3-103.8c-52.4-71.6-96.5-185-96.5-291.6 0-167.5 109.1-256 215.7-256 81.8 0 149.3 53.3 199.8 53.3 48 0 124.1-56.5 215.9-56.5zm-181.7-152c37.4-44.5 64.7-106.1 64.7-167.8 0-8.4-.6-16.7-2-24.5-61.6 2.3-135.8 41.2-180.9 91.9-34.5 38.5-67.1 100.5-67.1 162.8 0 9.4 1.6 18.8 2.3 21.8 3.9.6 10.4 1.6 16.7 1.6 55.3 0 125.3-37.1 166.3-85.8z"/>
                </svg>
                Continue with Apple
              </button>

              {/* Google */}
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2.5 font-semibold text-ink rounded-pill border border-border bg-white transition-all hover:bg-sand-dark active:scale-[0.98]"
                style={{ height: "56px", fontSize: "15px" }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs font-semibold text-muted uppercase tracking-widest">
                  or email
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-widest text-muted pl-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.co.nz"
                  required
                  className="w-full px-5 py-4 rounded-pill border-2 border-border bg-white text-ink placeholder-muted focus:outline-none focus:border-hot-blue transition-colors text-base"
                />
              </div>

              {/* Mobile */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-widest text-muted pl-1">
                  Or mobile
                </label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="+64 ..."
                  className="w-full px-5 py-4 rounded-pill border-2 border-border bg-white text-ink placeholder-muted focus:outline-none focus:border-hot-blue transition-colors text-base"
                />
              </div>

              {/* Magic link — black */}
              <button
                type="submit"
                className="w-full flex items-center justify-center font-semibold rounded-pill transition-all hover:brightness-125 active:scale-[0.98] mt-1"
                style={{ backgroundColor: "#1A1A1A", color: "#F5EDE3", height: "56px", fontSize: "16px" }}
              >
                Send me a magic link →
              </button>

              <p className="text-center text-xs text-muted leading-relaxed">
                No password to remember. Tap the link — you're in.
              </p>

            </form>
          )}
        </div>

        {/* ── GUEST BYPASS (testing only) ── */}
        <div className="px-4 pt-2 pb-4 text-center">
          <Link href="/sessions" className="text-sm text-muted hover:text-ink transition-colors">
            Continue as guest →
          </Link>
        </div>

        {/* ── INTERNATIONAL WAITLIST ── */}
        <div className="px-4 pb-12">
          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-border" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.20em] text-muted">
              Not in NZ?
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {!showWaitlist && !wlSent && (
            <button
              onClick={() => setShowWaitlist(true)}
              className="w-full flex items-center justify-between px-6 font-semibold rounded-pill transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ backgroundColor: "#E8F3FF", color: "#2C8FE0", height: "56px", fontSize: "15px", border: "1.5px solid #B8D9F8" }}
            >
              <span>Get early access from anywhere 🌏</span>
              <span>→</span>
            </button>
          )}

          {showWaitlist && !wlSent && (
            <div className="rounded-card p-5 space-y-4" style={{ backgroundColor: "#E8F3FF" }}>
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] mb-1" style={{ color: "#1A4A80" }}>
                  Join the global list
                </p>
                <p className="text-sm leading-snug" style={{ color: "#1A4A80" }}>
                  Stretchy is building city by city. Tell us where you are — you'll be first to know when we land near you.
                </p>
              </div>

              {/* Name */}
              <input
                type="text"
                value={wlName}
                onChange={(e) => setWlName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3.5 rounded-pill border-2 bg-white text-ink placeholder-muted focus:outline-none focus:border-hot-blue transition-colors text-sm"
                style={{ borderColor: "#B8D9F8" }}
              />

              {/* Email */}
              <input
                type="email"
                value={wlEmail}
                onChange={(e) => setWlEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-3.5 rounded-pill border-2 bg-white text-ink placeholder-muted focus:outline-none focus:border-hot-blue transition-colors text-sm"
                style={{ borderColor: "#B8D9F8" }}
              />

              {/* City + Country */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={wlCity}
                  onChange={(e) => setWlCity(e.target.value)}
                  placeholder="City"
                  className="flex-1 px-4 py-3.5 rounded-pill border-2 bg-white text-ink placeholder-muted focus:outline-none focus:border-hot-blue transition-colors text-sm"
                  style={{ borderColor: "#B8D9F8" }}
                />
                <input
                  type="text"
                  value={wlCountry}
                  onChange={(e) => setWlCountry(e.target.value)}
                  placeholder="Country"
                  className="flex-1 px-4 py-3.5 rounded-pill border-2 bg-white text-ink placeholder-muted focus:outline-none focus:border-hot-blue transition-colors text-sm"
                  style={{ borderColor: "#B8D9F8" }}
                />
              </div>

              {/* I'm a */}
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#4A6FA5" }}>
                  I&apos;m a
                </p>
                <div className="flex gap-2">
                  {([
                    { value: "mover",  label: "Mover" },
                    { value: "host",   label: "Host" },
                    { value: "both",   label: "Both" },
                  ] as { value: WaitlistRole; label: string }[]).map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setWlRole(r.value)}
                      className="flex-1 font-mono text-xs font-bold py-2.5 rounded-pill transition-all"
                      style={{
                        backgroundColor: wlRole === r.value ? "#2C8FE0" : "#fff",
                        color: wlRole === r.value ? "#fff" : "#4A6FA5",
                        border: wlRole === r.value ? "none" : "1.5px solid #B8D9F8",
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={() => { if (wlName.trim() && wlEmail.trim() && wlCity.trim()) setWlSent(true); }}
                className="w-full font-semibold rounded-pill transition-all hover:brightness-110 active:scale-[0.98]"
                style={{
                  backgroundColor: wlName && wlEmail && wlCity ? "#2C8FE0" : "#B8D9F8",
                  color: "#fff",
                  height: "52px",
                  fontSize: "15px",
                }}
              >
                Put me on the map →
              </button>

              <button
                onClick={() => setShowWaitlist(false)}
                className="w-full text-xs text-center transition-colors"
                style={{ color: "#4A6FA5" }}
              >
                Cancel
              </button>
            </div>
          )}

          {wlSent && (
            <div className="rounded-card p-6 text-center" style={{ backgroundColor: "#E8F3FF" }}>
              <p className="text-3xl mb-3">🌏</p>
              <p className="font-display font-bold text-ink mb-2" style={{ fontSize: "22px", letterSpacing: "-0.02em" }}>
                You&apos;re on the map.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: "#1A4A80" }}>
                {wlCity} is noted. When Stretchy heads your way, you&apos;ll be first to know.
              </p>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
