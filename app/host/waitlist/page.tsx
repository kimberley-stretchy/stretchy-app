"use client";

import { useState } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";

const TEACH_TYPES = ["Yoga", "Pilates", "Breathwork", "Sound Bath", "Run Club", "Dance", "HIIT", "Other"];
const NEIGHBOURHOOD_OPTIONS = ["Grey Lynn", "Pt Chev", "Herne Bay", "Ponsonby", "Mt Eden", "Parnell", "Newmarket", "CBD", "Other"];
const EXPERIENCE_OPTIONS = ["1–2 yrs", "3–5 yrs", "6–10 yrs", "10+ yrs"];
const FREQUENCY_OPTIONS = ["Multiple/week", "Weekly", "Fortnightly", "Monthly", "Events only"];

export default function HostWaitlistPage() {
  const [name, setName]             = useState("");
  const [email, setEmail]           = useState("");
  const [teachType, setTeachType]   = useState("");
  const [teachOther, setTeachOther] = useState("");
  const [experience, setExperience] = useState("");
  const [neighbourhoods, setNeighbourhoods] = useState<string[]>([]);
  const [neighbourhoodOther, setNeighbourhoodOther] = useState("");
  const [frequency, setFrequency]   = useState("");
  const [note, setNote]             = useState("");
  const [submitted, setSubmitted]   = useState(false);

  const toggle = (arr: string[], val: string, set: (v: string[]) => void) =>
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);

  if (submitted) {
    return (
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
        <div className="text-4xl mb-4">🙌</div>
        <h1 className="font-display font-bold text-ink mb-3" style={{ fontSize: "36px", letterSpacing: "-0.03em" }}>
          You&apos;re on the list.
        </h1>
        <p className="text-sm text-muted leading-relaxed mb-8 max-w-xs">
          We&apos;re building out city by city. When Stretchy opens in your area, you&apos;ll be first to know.
        </p>
        <Link
          href="/home"
          className="font-semibold text-cream rounded-pill px-8 py-4 transition-all hover:brightness-110 active:scale-[0.98]"
          style={{ backgroundColor: "#14110F", fontSize: "15px" }}
        >
          Back to home
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream pb-28">

      {/* NAV */}
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/home" className="text-ink"><SMark size={28} /></Link>
          <Link href="/home" className="text-muted hover:text-ink text-lg transition-colors" aria-label="Back">←</Link>
        </div>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">
          Host Waitlist
        </p>
        <div className="w-10" />
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-6">

        {/* HEADLINE */}
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.20em] text-muted mb-2">
            Not in your city yet
          </p>
          <h1
            className="font-display font-bold text-ink"
            style={{ fontSize: "clamp(44px, 12vw, 58px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}
          >
            Get on<br />the list.
          </h1>
        </div>

        {/* INFO CARD */}
        <div className="rounded-card p-4" style={{ backgroundColor: "#E8F3FF", border: "2px solid #14110F" }}>
          <p className="text-sm leading-snug" style={{ color: "#1A4A80" }}>
            Stretchy is expanding city by city. Tell us about your practice and where you&apos;d host — we&apos;ll be in touch when we&apos;re ready for you.
          </p>
        </div>

        {/* NAME */}
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-2">Your name</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="First and last"
            className="w-full px-4 py-3.5 rounded-pill border-2 border-border bg-white text-ink placeholder-muted focus:outline-none focus:border-hot-blue transition-colors text-base"
          />
        </div>

        {/* EMAIL */}
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-2">Email</p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="w-full px-4 py-3.5 rounded-pill border-2 border-border bg-white text-ink placeholder-muted focus:outline-none focus:border-hot-blue transition-colors text-base"
          />
        </div>

        {/* I TEACH */}
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-2">I teach</p>
          <div className="flex flex-wrap gap-2">
            {TEACH_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setTeachType(t === teachType ? "" : t)}
                className="px-3 py-1.5 rounded-pill text-sm font-semibold transition-all active:scale-[0.97]"
                style={{
                  backgroundColor: teachType === t ? "#902F8A" : "#F7F0E8",
                  color: teachType === t ? "#fff" : "#14110F",
                }}
              >
                {t}
              </button>
            ))}
          </div>
          {teachType === "Other" && (
            <input
              type="text"
              value={teachOther}
              onChange={(e) => setTeachOther(e.target.value)}
              placeholder="What do you teach? e.g. Aerial, Capoeira, Yin..."
              autoFocus
              className="w-full mt-3 px-4 py-3 rounded-pill border-2 border-border bg-white text-ink placeholder-muted focus:outline-none focus:border-hot-blue transition-colors text-sm"
            />
          )}
        </div>

        {/* YEARS EXPERIENCE */}
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-2">Years experience</p>
          <div className="flex gap-2 flex-wrap">
            {EXPERIENCE_OPTIONS.map((y) => (
              <button
                key={y}
                onClick={() => setExperience(y === experience ? "" : y)}
                className="px-4 py-1.5 rounded-pill text-sm font-semibold transition-all active:scale-[0.97]"
                style={{
                  backgroundColor: experience === y ? "#14110F" : "#F7F0E8",
                  color: experience === y ? "#fff" : "#14110F",
                }}
              >
                {y}
              </button>
            ))}
          </div>
        </div>

        {/* WHERE YOU'D HOST */}
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-2">Where you&apos;d host</p>
          <div className="flex flex-wrap gap-2">
            {NEIGHBOURHOOD_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => toggle(neighbourhoods, n, setNeighbourhoods)}
                className="px-3 py-1.5 rounded-pill text-sm font-semibold transition-all active:scale-[0.97]"
                style={{
                  backgroundColor: neighbourhoods.includes(n) ? "#716F39" : "#F7F0E8",
                  color: neighbourhoods.includes(n) ? "#fff" : "#14110F",
                }}
              >
                {n}
              </button>
            ))}
          </div>
          {neighbourhoods.includes("Other") && (
            <input
              type="text"
              value={neighbourhoodOther}
              onChange={(e) => setNeighbourhoodOther(e.target.value)}
              placeholder="Which city or suburb?"
              autoFocus
              className="w-full mt-3 px-4 py-3 rounded-pill border-2 border-border bg-white text-ink placeholder-muted focus:outline-none focus:border-hot-blue transition-colors text-sm"
            />
          )}
        </div>

        {/* HOW OFTEN */}
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-2">How often would you run?</p>
          <div className="flex flex-wrap gap-2">
            {FREQUENCY_OPTIONS.map((f) => (
              <button
                key={f}
                onClick={() => setFrequency(f === frequency ? "" : f)}
                className="px-3 py-1.5 rounded-pill text-sm font-semibold transition-all active:scale-[0.97]"
                style={{
                  backgroundColor: frequency === f ? "#0000FF" : "#F7F0E8",
                  color: frequency === f ? "#fff" : "#14110F",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* ANYTHING ELSE */}
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-2">
            Anything else? <span className="normal-case font-normal">(optional)</span>
          </p>
          <textarea
            className="w-full bg-white rounded-card px-4 py-3 text-sm text-ink leading-relaxed resize-none outline-none focus:ring-2 focus:ring-hot-blue/30 border-2 border-ink"
            rows={3}
            placeholder="Tell us about your practice, your vibe, what you'd bring..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

      </div>

      {/* STICKY CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-4" style={{ backgroundColor: "#F7F0E8" }}>
        <div className="max-w-lg mx-auto">
          <button
            onClick={() => { if (name.trim() && email.trim()) setSubmitted(true); }}
            className="w-full font-semibold rounded-pill transition-all hover:brightness-110 active:scale-[0.98]"
            style={{
              backgroundColor: name && email ? "#902F8A" : "#D4CFC9",
              color: "#fff",
              height: "56px",
              fontSize: "16px",
            }}
          >
            Join the waitlist →
          </button>
        </div>
      </div>

    </main>
  );
}
