"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SMark from "@/components/SMark";

// ─── STEP TYPES ───────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3;

const STEP_LABELS: Record<Step, string> = {
  1: "YOU",
  2: "WHERE & WHAT",
  3: "PAYMENT",
};

// ─── NEIGHBOURHOODS ───────────────────────────────────────────────────────────
const NEIGHBOURHOODS = [
  "Grey Lynn", "Pt Chev", "Ponsonby", "Herne Bay",
  "Mt Eden", "Karangahape", "Westmere", "Kingsland",
  "CBD", "Devonport", "Takapuna", "Other",
];

// ─── MOVEMENT TYPES ───────────────────────────────────────────────────────────
const MOVEMENT_TYPES = [
  { label: "Yoga",    color: "#A535C7" },
  { label: "Pilates", color: "#2A3FE0" },
  { label: "Breath",  color: "#7A8330" },
  { label: "Sound",   color: "#4FB8E0" },
  { label: "HIIT",    color: "#FF4D9E" },
  { label: "Run",     color: "#E63946" },
  { label: "Dance",   color: "#FF6B35" },
  { label: "Other",   color: "#6B6B6B" },
];

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
function ProgressBar({ step, total = 4 }: { step: Step; total?: number }) {
  return (
    <div className="flex gap-1.5 flex-1">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1 flex-1 rounded-pill transition-all duration-300"
          style={{ backgroundColor: i < step ? "#1A1A1A" : "#DDD0C0" }}
        />
      ))}
    </div>
  );
}

// ─── TOGGLE SWITCH ────────────────────────────────────────────────────────────
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="relative w-12 h-7 rounded-pill transition-colors duration-200 flex-shrink-0"
      style={{ backgroundColor: on ? "#2C8FE0" : "#DDD0C0" }}
      aria-checked={on}
      role="switch"
    >
      <span
        className="absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all duration-200"
        style={{ left: on ? "calc(100% - 24px)" : "4px" }}
      />
    </button>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [name, setName]     = useState("");
  const [email, setEmail]   = useState("");
  const [mobile, setMobile] = useState("");

  // Step 2
  const [hoods, setHoods]       = useState<string[]>([]);
  const [moves, setMoves]       = useState<string[]>([]);
  const [pushOn, setPushOn]     = useState(true);
  const [smsOn, setSmsOn]       = useState(true);

  // Step 3
  const [cardNum, setCardNum]   = useState("");
  const [expiry, setExpiry]     = useState("");
  const [cvc, setCvc]           = useState("");

  function toggleHood(h: string) {
    setHoods((prev) => prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]);
  }
  function toggleMove(m: string) {
    setMoves((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
  }

  function next() {
    if (step < 3) setStep((s) => (s + 1) as Step);
    else router.push("/home");
  }
  function back() {
    if (step > 1) setStep((s) => (s - 1) as Step);
    else router.push("/");
  }

  return (
    <main className="min-h-screen bg-cream flex flex-col">

      {/* ── NAV ── */}
      <nav className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto w-full">
        {/* S-mark */}
        <Link href="/" className="text-ink flex-shrink-0">
          <SMark size={28} />
        </Link>

        {/* Back */}
        <button
          onClick={back}
          className="text-muted hover:text-ink transition-colors text-lg flex-shrink-0"
          aria-label="Back"
        >
          ←
        </button>

        {/* Progress dashes */}
        <ProgressBar step={step} />

        {/* Skip (steps 2 & 3) */}
        {step > 1 ? (
          <button
            onClick={next}
            className="font-mono text-xs font-bold uppercase tracking-widest text-muted hover:text-ink transition-colors flex-shrink-0"
          >
            SKIP
          </button>
        ) : (
          /* Bell placeholder to keep layout balanced on step 1 */
          <span className="text-muted flex-shrink-0">🔔</span>
        )}
      </nav>

      {/* ── STEP LABEL ── */}
      <div className="px-6 pt-4 pb-2 max-w-lg mx-auto w-full">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-muted">
          Step {step} of 4 · {STEP_LABELS[step]}
        </p>
      </div>

      {/* ─────────── STEP 1 — WHO ARE YOU ─────────────────────────── */}
      {step === 1 && (
        <div className="flex-1 flex flex-col px-6 max-w-lg mx-auto w-full">
          <h1
            className="font-display font-bold text-ink mb-6"
            style={{ fontSize: "clamp(32px,9vw,44px)", letterSpacing: "-0.03em", lineHeight: "1.05" }}
          >
            What should we<br />call you?
          </h1>

          <div className="flex flex-col gap-3">
            {/* Apple */}
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2.5 font-semibold rounded-pill transition-all hover:brightness-125 active:scale-[0.98]"
              style={{ backgroundColor: "#1A1A1A", color: "#F5EDE3", height: "56px", fontSize: "15px" }}
            >
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

            {/* OR divider */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs font-semibold text-muted uppercase tracking-widest">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Name */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-widest text-muted pl-1">Your name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Marlee Fisher"
                className="w-full px-5 py-4 rounded-pill border-2 border-border bg-white text-ink placeholder-muted focus:outline-none focus:border-hot-blue transition-colors text-base"
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-widest text-muted pl-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="marlee@email.co.nz"
                className="w-full px-5 py-4 rounded-pill border-2 border-border bg-white text-ink placeholder-muted focus:outline-none focus:border-hot-blue transition-colors text-base"
              />
            </div>

            {/* Mobile */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-widest text-muted pl-1">Or mobile (for SMS nudges)</label>
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="+64 ..."
                className="w-full px-5 py-4 rounded-pill border-2 border-border bg-white text-ink placeholder-muted focus:outline-none focus:border-hot-blue transition-colors text-base"
              />
            </div>

            {/* Terms */}
            <p className="text-xs text-muted text-center leading-relaxed px-2">
              By continuing you agree to the{" "}
              <a href="/terms" className="font-bold text-ink hover:underline">Stretchy terms</a>.
              We'll never share your details with hosts beyond first name.
            </p>

            {/* CTA */}
            <button
              onClick={next}
              className="w-full flex items-center justify-center font-semibold rounded-pill transition-all hover:brightness-110 active:scale-[0.98] mt-1"
              style={{ backgroundColor: "#2C8FE0", color: "#fff", height: "56px", fontSize: "16px" }}
            >
              Continue →
            </button>
          </div>

          <div className="pb-10" />
        </div>
      )}

      {/* ─────────── STEP 2 — PREFERENCES ─────────────────────────── */}
      {step === 2 && (
        <div className="flex-1 flex flex-col px-6 max-w-lg mx-auto w-full overflow-y-auto pb-10">
          <h1
            className="font-display font-bold text-ink mb-2"
            style={{ fontSize: "clamp(30px,8vw,40px)", letterSpacing: "-0.03em", lineHeight: "1.05" }}
          >
            Tune your<br />weekly drop.
          </h1>
          <p className="text-sm text-muted mb-6 leading-snug">
            We'll only show what's in your suburbs and the formats you love. Skip if you want everything.
          </p>

          {/* Neighbourhoods */}
          <h2 className="font-bold text-base text-ink mb-3">Neighbourhoods</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {NEIGHBOURHOODS.map((h) => {
              const active = hoods.includes(h);
              return (
                <button
                  key={h}
                  onClick={() => toggleHood(h)}
                  className="px-4 py-2 rounded-pill text-sm font-semibold transition-all duration-150 border-2"
                  style={
                    active
                      ? { backgroundColor: "#2C8FE0", color: "#fff", borderColor: "#2C8FE0" }
                      : { backgroundColor: "transparent", color: "#1A1A1A", borderColor: "#DDD0C0" }
                  }
                >
                  {h}
                </button>
              );
            })}
          </div>

          {/* Movement */}
          <h2 className="font-bold text-base text-ink mb-3">Movement</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {MOVEMENT_TYPES.map(({ label, color }) => {
              const active = moves.includes(label);
              return (
                <button
                  key={label}
                  onClick={() => toggleMove(label)}
                  className="px-4 py-2 rounded-pill text-sm font-semibold transition-all duration-150 border-2"
                  style={
                    active
                      ? { backgroundColor: color, color: "#fff", borderColor: color }
                      : { backgroundColor: "transparent", color: "#1A1A1A", borderColor: "#DDD0C0" }
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Notifications */}
          <h2 className="font-bold text-base text-ink mb-3">How to reach you</h2>
          <div className="bg-white rounded-card shadow-card overflow-hidden mb-6">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <p className="font-semibold text-sm text-ink">Push notifications</p>
                <p className="text-xs text-muted mt-0.5">Price drops, confirmations, locks</p>
              </div>
              <Toggle on={pushOn} onChange={setPushOn} />
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <p className="font-semibold text-sm text-ink">SMS (text)</p>
                <p className="text-xs text-muted mt-0.5">For the can't-miss-this stuff</p>
              </div>
              <Toggle on={smsOn} onChange={setSmsOn} />
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={next}
            className="w-full flex items-center justify-center font-semibold rounded-pill transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ backgroundColor: "#2C8FE0", color: "#fff", height: "56px", fontSize: "16px" }}
          >
            Continue →
          </button>
        </div>
      )}

      {/* ─────────── STEP 3 — PAYMENT ──────────────────────────────── */}
      {step === 3 && (
        <div className="flex-1 flex flex-col px-6 max-w-lg mx-auto w-full overflow-y-auto pb-10">
          <h1
            className="font-display font-bold text-ink mb-3"
            style={{ fontSize: "clamp(32px,9vw,44px)", letterSpacing: "-0.03em", lineHeight: "1.0" }}
          >
            Card on file.<br />Nothing<br />charged yet.
          </h1>
          <p className="text-sm text-muted mb-6 leading-snug">
            We hold your card so you can hold a place in one tap. You're only charged when your session is locked in — 2 hours before.
          </p>

          {/* Card form */}
          <div className="bg-white rounded-card shadow-card p-5 mb-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-widest text-muted">Card number</label>
                <input
                  type="text"
                  value={cardNum}
                  onChange={(e) => setCardNum(e.target.value)}
                  placeholder="4242 4242 4242 4242"
                  maxLength={19}
                  className="w-full px-4 py-3 rounded-stretchy border-2 border-border bg-cream text-ink placeholder-muted focus:outline-none focus:border-hot-blue transition-colors text-base font-mono"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted">Expiry</label>
                  <input
                    type="text"
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    placeholder="MM / YY"
                    maxLength={7}
                    className="w-full px-4 py-3 rounded-stretchy border-2 border-border bg-cream text-ink placeholder-muted focus:outline-none focus:border-hot-blue transition-colors text-base font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted">CVC</label>
                  <input
                    type="text"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value)}
                    placeholder="123"
                    maxLength={4}
                    className="w-full px-4 py-3 rounded-stretchy border-2 border-border bg-cream text-ink placeholder-muted focus:outline-none focus:border-hot-blue transition-colors text-base font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Stripe badge */}
            <div className="flex items-start gap-2 mt-4 pt-4 border-t border-border">
              <span className="text-sm">🔒</span>
              <p className="text-xs text-muted leading-snug">
                <span className="font-bold text-ink">Powered by Stripe.</span> We never see your card. Holds are pre-authorisations only.
              </p>
            </div>
          </div>

          {/* Before you hold card */}
          <div
            className="rounded-card p-5 mb-6"
            style={{ backgroundColor: "#FFD166" }}
          >
            <p className="font-mono text-xs font-bold uppercase tracking-[0.15em] text-ink mb-3">
              Before you hold
            </p>
            <ul className="space-y-2">
              {[
                "Holding a place is free. You only pay if the session goes ahead.",
                "From 24 hours out, holds become locked-in bookings. No cancellations. BUT the overall price may keep dropping for you. Yeehaw!",
                "Price locks 2 hours before — that's when your card is charged.",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-ink leading-snug">
                  <span className="mt-0.5 flex-shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <button
            onClick={next}
            className="w-full flex items-center justify-center font-semibold rounded-pill transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ backgroundColor: "#2C8FE0", color: "#fff", height: "56px", fontSize: "16px" }}
          >
            Save card &amp; continue →
          </button>

          <p className="text-center text-xs text-muted mt-3">
            You won't be charged anything today.
          </p>
        </div>
      )}

    </main>
  );
}
