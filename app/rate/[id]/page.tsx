"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import SMark from "@/components/SMark";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK = {
  id: "1",
  sessionTitle: "Slow Flow",
  host: { name: "Tāne", fullName: "Tāne Ratima" },
};

const VIBE_TAGS = [
  { label: "Strong flow", defaultSelected: true },
  { label: "Welcoming", defaultSelected: true },
  { label: "Good cues", defaultSelected: true },
  { label: "Felt the connection", defaultSelected: true },
  { label: "Loved the Social Stretch", defaultSelected: true },
  { label: "Great music", defaultSelected: false },
  { label: "Punctual", defaultSelected: false },
  { label: "Other", defaultSelected: false },
];

const RATING_LABELS: Record<number, string> = {
  1: "S — tough one",
  2: "SS — getting there",
  3: "SSS — solid session",
  4: "SSSS — loved it",
  5: "SSSSS — perfection",
};

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function RateItPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [rating, setRating] = useState(4);
  const [tags, setTags] = useState<string[]>(
    VIBE_TAGS.filter((t) => t.defaultSelected).map((t) => t.label)
  );
  const [note, setNote] = useState("");
  const [sharePhoto, setSharePhoto] = useState(true);
  const [socialHandle, setSocialHandle] = useState("");

  const toggleTag = (label: string) => {
    setTags((prev) =>
      prev.includes(label) ? prev.filter((t) => t !== label) : [...prev, label]
    );
  };

  return (
    <main className="min-h-screen bg-cream pb-32">

      {/* ── NAV ── */}
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <Link href="/home" className="text-ink"><SMark size={28} /></Link>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">
          A6 · Rate It
        </p>
        <button
          className="font-mono text-xs font-bold text-muted hover:text-ink transition-colors"
          onClick={() => router.push("/home")}
        >
          SKIP
        </button>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-5">

        {/* ── HEADLINE ── */}
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.20em] text-muted mb-2">
            Session complete
          </p>
          <h1
            className="font-display font-bold text-ink"
            style={{ fontSize: "clamp(38px, 10vw, 52px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}
          >
            How was<br />{MOCK.sessionTitle}?
          </h1>
        </div>

        {/* ── S-MARK RATING ── */}
        <div className="bg-white rounded-card shadow-card p-5">
          {/* S-mark stars */}
          <div className="flex items-center gap-2 mb-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                className="transition-all active:scale-90"
                aria-label={`Rate ${n}`}
              >
                <div
                  style={{
                    color: n <= rating ? "#2C8FE0" : "#D4CFC9",
                    transition: "color 0.15s",
                  }}
                >
                  <SMark size={40} />
                </div>
              </button>
            ))}
          </div>

          {/* Dynamic label */}
          <p
            className="font-mono text-sm font-bold uppercase tracking-widest"
            style={{ color: "#2C8FE0" }}
          >
            {RATING_LABELS[rating]}
          </p>
        </div>

        {/* ── VIBE TAGS ── */}
        <div className="bg-white rounded-card shadow-card p-5">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-muted mb-3">
            What landed?
          </p>
          <div className="flex flex-wrap gap-2">
            {VIBE_TAGS.map((t) => {
              const selected = tags.includes(t.label);
              return (
                <button
                  key={t.label}
                  onClick={() => toggleTag(t.label)}
                  className="px-3 py-2 rounded-pill text-sm font-semibold transition-all active:scale-[0.97]"
                  style={{
                    backgroundColor: selected ? "#2C8FE0" : "#F5EDE3",
                    color: selected ? "#fff" : "#1A1A1A",
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── NOTE ── */}
        <div className="bg-white rounded-card shadow-card p-5">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-muted mb-3">
            Anything else?
          </p>
          <textarea
            className="w-full bg-cream rounded-card px-4 py-3 text-sm text-ink leading-relaxed resize-none outline-none focus:ring-2 focus:ring-hot-blue/30"
            rows={3}
            placeholder={`Leave a note for ${MOCK.host.name}...`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        {/* ── PHOTO UPLOAD ── */}
        <div className="bg-white rounded-card shadow-card p-5">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-muted mb-3">
            Add a photo
          </p>
          <div className="flex gap-3">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                className="flex-1 aspect-square rounded-card border-2 border-dashed border-border flex items-center justify-center text-muted text-2xl transition-all hover:border-hot-blue hover:text-hot-blue active:scale-[0.97]"
                style={{ minHeight: "80px" }}
              >
                +
              </button>
            ))}
          </div>

          {/* Share consent */}
          <label className="flex items-center gap-3 mt-4 cursor-pointer">
            <div
              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all"
              style={{
                backgroundColor: sharePhoto ? "#2C8FE0" : "transparent",
                border: sharePhoto ? "none" : "1.5px solid #D4CFC9",
              }}
              onClick={() => setSharePhoto(!sharePhoto)}
            >
              {sharePhoto && (
                <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                  <path d="M1 4L4.5 7.5L11 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <p className="text-sm text-ink leading-snug">
              OK to use my photo/video in Stretchy social
            </p>
          </label>

          {/* Social handle — shown when consent is on */}
          {sharePhoto && (
            <div className="mt-3">
              <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-muted mb-2">
                Tag me when you share
              </p>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-semibold text-sm select-none">@</span>
                <input
                  type="text"
                  value={socialHandle}
                  onChange={(e) => setSocialHandle(e.target.value.replace(/^@/, ""))}
                  placeholder="yourhandle"
                  className="w-full pl-8 pr-4 py-3 rounded-pill border-2 border-border bg-cream text-ink placeholder-muted focus:outline-none focus:border-hot-blue transition-colors text-sm"
                />
              </div>
              <p className="text-xs text-muted mt-1.5 pl-1">
                Instagram or TikTok — we&apos;ll tag you if we share.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* ── STICKY SEND BUTTON ── */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-4" style={{ backgroundColor: "#F5EDE3" }}>
        <div className="max-w-lg mx-auto">
          <button
            className="w-full font-semibold text-white rounded-pill transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ backgroundColor: "#2C8FE0", height: "56px", fontSize: "16px" }}
            onClick={() => router.push("/home")}
          >
            Send rating
          </button>
        </div>
      </div>

    </main>
  );
}
