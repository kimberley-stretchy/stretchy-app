"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SMark from "@/components/SMark";

// ─── OPTIONS ──────────────────────────────────────────────────────────────────
const TEACH_TYPES = ["Yoga", "Pilates", "Breathwork", "Sound Bath", "Run Club", "Dance", "HIIT", "Other"];
const NEIGHBOURHOOD_OPTIONS = ["Grey Lynn", "Pt Chev", "Herne Bay", "Ponsonby", "Mt Eden", "Parnell", "CBD"];
const CREDENTIAL_OPTIONS = ["Certified", "First aid", "Other"];
const SOCIAL_PLATFORM_OPTIONS = ["Instagram", "TikTok", "Website", "Substack"];
const FREQUENCY_OPTIONS = ["Multiple/week", "Weekly", "Fortnightly", "Monthly", "Events only"];

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function HostApplyPage() {
  const router = useRouter();

  const [basedInNZ, setBasedInNZ] = useState<boolean | null>(null);
  const [why, setWhy] = useState("");
  const [teachType, setTeachType] = useState("");
  const [teachTypeOther, setTeachTypeOther] = useState("");
  const [yearsExperience, setYearsExperience] = useState("4");
  const [neighbourhoods, setNeighbourhoods] = useState<string[]>(["Grey Lynn", "Pt Chev"]);
  const [credentials, setCredentials] = useState<string[]>(["Certified", "First aid"]);
  const [platforms, setPlatforms] = useState<string[]>(["Instagram"]);
  const [socialStretch, setSocialStretch] = useState<boolean>(true);
  const [venue, setVenue] = useState("Little Bird Café, Grey Lynn");
  const [frequency, setFrequency] = useState("Weekly");
  const [agreed, setAgreed] = useState(false);

  const toggle = (arr: string[], val: string, set: (v: string[]) => void) => {
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  return (
    <main className="min-h-screen bg-cream pb-28">

      {/* ── NAV ── */}
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/home" className="text-ink"><SMark size={28} /></Link>
          <Link href="/home" className="text-muted hover:text-ink text-lg transition-colors" aria-label="Back">←</Link>
        </div>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">
          Host Application
        </p>
        <Link href="/notifications" className="flex items-center px-3 py-1.5 rounded-pill relative" style={{ backgroundColor: "#F5EDE3", border: "1px solid #D4CFC9" }} aria-label="Notifications">
          <span className="text-base">🔔</span>
        </Link>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-6">

        {/* ── HEADLINE ── */}
        <div>
          <h1
            className="font-display font-bold text-ink"
            style={{ fontSize: "clamp(48px, 13vw, 64px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}
          >
            Host a<br />Stretchy.
          </h1>
        </div>

        {/* ── INFO CARD (blue) ── */}
        <div className="rounded-card p-4" style={{ backgroundColor: "#E8F3FF" }}>
          <p className="text-sm leading-snug" style={{ color: "#1A4A80" }}>
            A Stretchy movement led by locals. <strong>Vetted once. Active for 6 months.</strong> Change your sessions any time.
          </p>
          <div className="mt-3 space-y-1">
            {[
              "Set your own revenue target",
              "$20 + GST flat fee per session — that's it",
              "Cancel any session",
            ].map((p) => (
              <p key={p} className="text-sm font-semibold" style={{ color: "#1A4A80" }}>✓ {p}</p>
            ))}
          </div>
          <p className="text-xs mt-3 leading-snug" style={{ color: "#4A6FA5" }}>
            The $20 + GST fee is spread across attendees — your target revenue is always protected.
          </p>
        </div>

        {/* ── NZ BASED ── */}
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-3">
            Are you based in New Zealand?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setBasedInNZ(true)}
              className="flex-1 font-bold rounded-pill transition-all active:scale-[0.98] hover:brightness-110"
              style={{
                backgroundColor: basedInNZ === true ? "#1A1A1A" : "#F5EDE3",
                color: basedInNZ === true ? "#fff" : "#1A1A1A",
                height: "52px",
                fontSize: "15px",
                border: basedInNZ === true ? "none" : "1px solid #E0D9D0",
              }}
            >
              YES
            </button>
            <button
              onClick={() => setBasedInNZ(false)}
              className="flex-1 font-bold rounded-pill transition-all active:scale-[0.98] hover:brightness-110"
              style={{
                backgroundColor: basedInNZ === false ? "#1A1A1A" : "#F5EDE3",
                color: basedInNZ === false ? "#fff" : "#1A1A1A",
                height: "52px",
                fontSize: "15px",
                border: basedInNZ === false ? "none" : "1px solid #E0D9D0",
              }}
            >
              NO — waitlist
            </button>
          </div>
        </div>

        {/* ── WHY YOU'RE PERFECT ── */}
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-2">
            Why you&apos;re perfect
          </p>
          <textarea
            className="w-full bg-white rounded-card px-4 py-3 text-sm text-ink leading-relaxed resize-none outline-none focus:ring-2 focus:ring-hot-blue/30 shadow-card"
            rows={3}
            placeholder="Tell us about you and what you bring..."
            value={why}
            onChange={(e) => setWhy(e.target.value)}
          />
        </div>

        {/* ── I TEACH ── */}
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-2">I teach</p>
          <div className="flex flex-wrap gap-2">
            {TEACH_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setTeachType(t === teachType ? "" : t)}
                className="px-3 py-1.5 rounded-pill text-sm font-semibold transition-all active:scale-[0.97]"
                style={{
                  backgroundColor: teachType === t ? "#A535C7" : "#F5EDE3",
                  color: teachType === t ? "#fff" : "#1A1A1A",
                }}
              >
                {t}
              </button>
            ))}
          </div>
          {teachType === "Other" && (
            <input
              type="text"
              value={teachTypeOther}
              onChange={(e) => setTeachTypeOther(e.target.value)}
              placeholder="What do you teach? e.g. Aerial, Capoeira, Yin..."
              autoFocus
              className="w-full mt-3 px-4 py-3 rounded-pill border-2 border-border bg-white text-ink placeholder-muted focus:outline-none focus:border-hot-blue transition-colors text-sm"
            />
          )}
        </div>

        {/* ── YEARS EXPERIENCE ── */}
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-2">Years experience</p>
          <div className="flex gap-2 flex-wrap">
            {["1–2", "3–5", "6–10", "10+"].map((y) => (
              <button
                key={y}
                onClick={() => setYearsExperience(y === yearsExperience ? "" : y)}
                className="px-4 py-1.5 rounded-pill text-sm font-semibold transition-all active:scale-[0.97]"
                style={{
                  backgroundColor: yearsExperience === y ? "#1A1A1A" : "#F5EDE3",
                  color: yearsExperience === y ? "#fff" : "#1A1A1A",
                }}
              >
                {y} yrs
              </button>
            ))}
          </div>
        </div>

        {/* ── WHERE YOU'LL HOST ── */}
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-2">
            Where you&apos;ll host
          </p>
          <div className="flex flex-wrap gap-2">
            {NEIGHBOURHOOD_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => toggle(neighbourhoods, n, setNeighbourhoods)}
                className="px-3 py-1.5 rounded-pill text-sm font-semibold transition-all active:scale-[0.97]"
                style={{
                  backgroundColor: neighbourhoods.includes(n) ? "#7A8330" : "#F5EDE3",
                  color: neighbourhoods.includes(n) ? "#fff" : "#1A1A1A",
                }}
              >
                {n}
              </button>
            ))}
            <button
              className="px-3 py-1.5 rounded-pill text-sm font-semibold transition-all"
              style={{ backgroundColor: "#F5EDE3", color: "#9A9590", border: "1px dashed #D4CFC9" }}
            >
              + Add
            </button>
          </div>
        </div>

        {/* ── CREDENTIALS ── */}
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-2">
            Credentials <span className="normal-case font-normal">(recommended, not required)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {CREDENTIAL_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => toggle(credentials, c, setCredentials)}
                className="px-3 py-1.5 rounded-pill text-sm font-semibold transition-all active:scale-[0.97]"
                style={{
                  backgroundColor: credentials.includes(c) ? "#2C8FE0" : "#F5EDE3",
                  color: credentials.includes(c) ? "#fff" : "#1A1A1A",
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* ── WHERE MATES FIND YOU ── */}
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-2">
            Where mates find you <span className="normal-case font-normal">(all optional)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {SOCIAL_PLATFORM_OPTIONS.map((p) => (
              <button
                key={p}
                onClick={() => toggle(platforms, p, setPlatforms)}
                className="px-3 py-1.5 rounded-pill text-sm font-semibold transition-all active:scale-[0.97]"
                style={{
                  backgroundColor: platforms.includes(p) ? "#1A1A1A" : "#F5EDE3",
                  color: platforms.includes(p) ? "#fff" : "#1A1A1A",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* ── SOCIAL STRETCH ── */}
        <div className="bg-white rounded-card shadow-card p-4">
          <div className="flex items-start gap-3 mb-1">
            <div className="flex-1">
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-1">
                Will you add a Social Stretch?
              </p>
              <p className="text-sm text-muted">Coffee, beer, booch after the class.</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => setSocialStretch(true)}
                className="font-mono text-xs font-bold px-3 py-1.5 rounded-pill transition-all"
                style={{
                  backgroundColor: socialStretch ? "#2C8FE0" : "#F5EDE3",
                  color: socialStretch ? "#fff" : "#1A1A1A",
                }}
              >
                YES
              </button>
              <button
                onClick={() => setSocialStretch(false)}
                className="font-mono text-xs font-bold px-3 py-1.5 rounded-pill transition-all"
                style={{
                  backgroundColor: !socialStretch ? "#1A1A1A" : "#F5EDE3",
                  color: !socialStretch ? "#fff" : "#1A1A1A",
                }}
              >
                NO
              </button>
            </div>
          </div>
        </div>

        {/* ── VENUE PARTNER ── */}
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-2">
            Venue partner
          </p>
          <input
            className="w-full bg-white rounded-card px-4 py-3 text-sm text-ink outline-none focus:ring-2 focus:ring-hot-blue/30 shadow-card"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            placeholder="Venue name, neighbourhood"
          />
        </div>

        {/* ── HOW OFTEN ── */}
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-2">
            How often?
          </p>
          <div className="flex flex-wrap gap-2">
            {FREQUENCY_OPTIONS.map((f) => (
              <button
                key={f}
                onClick={() => setFrequency(f)}
                className="px-3 py-1.5 rounded-pill text-sm font-semibold transition-all active:scale-[0.97]"
                style={{
                  backgroundColor: frequency === f ? "#2C8FE0" : "#F5EDE3",
                  color: frequency === f ? "#fff" : "#1A1A1A",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* ── TERMS ── */}
        <label className="flex items-start gap-3 cursor-pointer">
          <div
            className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all"
            style={{
              backgroundColor: agreed ? "#2C8FE0" : "transparent",
              border: agreed ? "none" : "1.5px solid #D4CFC9",
            }}
            onClick={() => setAgreed(!agreed)}
          >
            {agreed && (
              <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                <path d="M1 4L4.5 7.5L11 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <p className="text-sm text-ink leading-snug">
            I agree to the <strong>Stretchy host terms</strong>. Or —{" "}
            <span className="text-hot-blue underline cursor-pointer">Chat to Stretchy</span> first.
          </p>
        </label>

      </div>

      {/* ── STICKY CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-4" style={{ backgroundColor: "#F5EDE3" }}>
        <div className="max-w-lg mx-auto">
          <button
            className="w-full font-semibold text-white rounded-pill transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ backgroundColor: "#2C8FE0", height: "56px", fontSize: "16px" }}
            onClick={() => router.push("/host/dashboard")}
          >
            Apply · we&apos;ll vet within 5 days
          </button>
        </div>
      </div>

    </main>
  );
}
