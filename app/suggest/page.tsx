"use client";

import { useState } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const TYPES = ["Yoga", "Pilates", "Breathwork", "Sound Bath", "Run Club", "Dance", "HIIT", "Other"];
const WHEN_OPTIONS = ["Morning", "Lunchtime", "Evening", "Weekend"];
const NEIGHBOURHOODS = ["Grey Lynn", "Ponsonby", "Herne Bay", "Parnell", "Mt Eden", "Newmarket", "CBD", "Other"];

interface Suggestion {
  id: string;
  type: string;
  label: string;
  when: string;
  where: string;
  votes: number;
  hot: boolean;
  color: string;
  initial: string;
  voted: boolean;
}

const COMMUNITY_WANTS: Suggestion[] = [
  { id: "s1", type: "Dance", label: "Latin Dance · Evening · Ponsonby", when: "Evening", where: "Ponsonby", votes: 34, hot: true, color: "#FF6B35", initial: "D", voted: false },
  { id: "s2", type: "Sound Bath", label: "Sound Bath · Weekend · Grey Lynn", when: "Weekend", where: "Grey Lynn", votes: 28, hot: true, color: "#4FB8E0", initial: "S", voted: false },
  { id: "s3", type: "Run Club", label: "Run Club · Morning · Herne Bay", when: "Morning", where: "Herne Bay", votes: 21, hot: false, color: "#E63946", initial: "R", voted: false },
  { id: "s4", type: "HIIT", label: "HIIT · Lunchtime · CBD", when: "Lunchtime", where: "CBD", votes: 17, hot: false, color: "#FF4D9E", initial: "H", voted: false },
  { id: "s5", type: "Breathwork", label: "Breathwork · Morning · Parnell", when: "Morning", where: "Parnell", votes: 12, hot: false, color: "#7A8330", initial: "B", voted: false },
];

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function SuggestPage() {
  const [type, setType] = useState("");
  const [typeOther, setTypeOther] = useState("");
  const [when, setWhen] = useState("");
  const [where, setWhere] = useState("");
  const [whereOther, setWhereOther] = useState("");
  const [notify, setNotify] = useState(true);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(COMMUNITY_WANTS);
  const [submitted, setSubmitted] = useState(false);

  const toggleVote = (id: string) => {
    setSuggestions((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, voted: !s.voted, votes: s.voted ? s.votes - 1 : s.votes + 1 }
          : s
      )
    );
  };

  return (
    <main className="min-h-screen bg-cream pb-20">

      {/* ── NAV ── */}
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <Link href="/home" className="text-ink"><SMark size={28} /></Link>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">
          A8 · Suggest
        </p>
        <Link href="/home" className="text-muted hover:text-ink text-lg transition-colors">×</Link>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-5">

        {/* ── HEADLINE ── */}
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.20em] text-muted mb-2">
            Shape the schedule
          </p>
          <h1
            className="font-display font-bold text-ink"
            style={{ fontSize: "clamp(44px, 12vw, 58px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}
          >
            Float a<br />Stretchy.
          </h1>
        </div>

        {/* ── FORM CARD (purple) ── */}
        <div className="rounded-card p-5" style={{ backgroundColor: "#A535C7" }}>
          <p
            className="font-mono text-xs font-bold uppercase tracking-[0.18em] mb-4"
            style={{ color: "rgba(255,255,255,0.65)" }}
          >
            What are you after?
          </p>

          {/* TYPE */}
          <div className="mb-4">
            <p className="font-mono text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.65)" }}>
              Type
            </p>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t === type ? "" : t)}
                  className="px-3 py-1.5 rounded-pill text-sm font-semibold transition-all active:scale-[0.97]"
                  style={{
                    backgroundColor: type === t ? "#fff" : "rgba(255,255,255,0.15)",
                    color: type === t ? "#A535C7" : "#fff",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            {type === "Other" && (
              <input
                type="text"
                value={typeOther}
                onChange={(e) => setTypeOther(e.target.value)}
                placeholder="What kind of session? e.g. Aerial, Capoeira…"
                autoFocus
                className="w-full mt-3 px-4 py-3 rounded-pill text-sm font-semibold text-ink placeholder-purple-300 focus:outline-none"
                style={{
                  backgroundColor: "rgba(255,255,255,0.15)",
                  color: "#fff",
                  border: "1.5px solid rgba(255,255,255,0.40)",
                }}
              />
            )}
          </div>

          {/* WHEN */}
          <div className="mb-4">
            <p className="font-mono text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.65)" }}>
              When
            </p>
            <div className="flex flex-wrap gap-2">
              {WHEN_OPTIONS.map((w) => (
                <button
                  key={w}
                  onClick={() => setWhen(w === when ? "" : w)}
                  className="px-3 py-1.5 rounded-pill text-sm font-semibold transition-all active:scale-[0.97]"
                  style={{
                    backgroundColor: when === w ? "#fff" : "rgba(255,255,255,0.15)",
                    color: when === w ? "#A535C7" : "#fff",
                  }}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          {/* WHERE */}
          <div className="mb-5">
            <p className="font-mono text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,255,255,0.65)" }}>
              Where
            </p>
            <div className="flex flex-wrap gap-2">
              {NEIGHBOURHOODS.map((n) => (
                <button
                  key={n}
                  onClick={() => setWhere(n === where ? "" : n)}
                  className="px-3 py-1.5 rounded-pill text-sm font-semibold transition-all active:scale-[0.97]"
                  style={{
                    backgroundColor: where === n ? "#fff" : "rgba(255,255,255,0.15)",
                    color: where === n ? "#A535C7" : "#fff",
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
            {where === "Other" && (
              <input
                type="text"
                value={whereOther}
                onChange={(e) => setWhereOther(e.target.value)}
                placeholder="Which neighbourhood?"
                autoFocus
                className="w-full mt-3 px-4 py-3 rounded-pill text-sm font-semibold focus:outline-none"
                style={{
                  backgroundColor: "rgba(255,255,255,0.15)",
                  color: "#fff",
                  border: "1.5px solid rgba(255,255,255,0.40)",
                }}
              />
            )}
          </div>

          {/* Notify checkbox */}
          <label className="flex items-center gap-3 mb-5 cursor-pointer">
            <div
              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all"
              style={{
                backgroundColor: notify ? "#fff" : "rgba(255,255,255,0.20)",
                border: notify ? "none" : "1.5px solid rgba(255,255,255,0.40)",
              }}
              onClick={() => setNotify(!notify)}
            >
              {notify && (
                <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                  <path d="M1 4L4.5 7.5L11 1" stroke="#A535C7" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <p className="text-sm text-white" style={{ opacity: 0.85 }}>
              Notify me when this gets picked up
            </p>
          </label>

          {/* Submit */}
          <button
            className="w-full font-semibold text-ink rounded-pill transition-all hover:brightness-95 active:scale-[0.98]"
            style={{ backgroundColor: "#F5EDE3", height: "50px", fontSize: "15px" }}
            onClick={() => {
              if ((type || typeOther) && !submitted) {
                const label = type === "Other" ? typeOther : type;
                const COLORS: Record<string, string> = {
                  Yoga: "#7A8330", Pilates: "#A535C7", Breathwork: "#4FB8E0",
                  "Sound Bath": "#4FB8E0", "Run Club": "#E63946", Dance: "#FF6B35",
                  HIIT: "#FF4D9E", Other: "#2C8FE0",
                };
                const newSuggestion: Suggestion = {
                  id: `s${Date.now()}`,
                  type: label,
                  label: [label, when, where === "Other" ? whereOther : where].filter(Boolean).join(" · "),
                  when: when,
                  where: where,
                  votes: 1,
                  hot: false,
                  color: COLORS[type] ?? "#7A8330",
                  initial: label.charAt(0).toUpperCase(),
                  voted: true,
                };
                setSuggestions((prev) => [newSuggestion, ...prev]);
                setSubmitted(true);
              }
            }}
          >
            {submitted ? "✓ Floated — thanks!" : "Float it →"}
          </button>
        </div>

        {/* ── COMMUNITY WANTS ── */}
        <div>
          <h2 className="font-display font-bold text-ink mb-3" style={{ fontSize: "22px" }}>
            What the community wants
          </h2>

          <div className="space-y-2">
            {suggestions
              .sort((a, b) => b.votes - a.votes)
              .map((s) => (
                <div
                  key={s.id}
                  className="bg-white rounded-card shadow-card p-4 flex items-center gap-3"
                >
                  {/* Type circle */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                    style={{ backgroundColor: s.color }}
                  >
                    {s.initial}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-bold text-ink text-sm truncate">{s.label}</p>
                      {s.hot && (
                        <span
                          className="font-mono text-xs font-bold px-2 py-0.5 rounded-pill flex-shrink-0"
                          style={{ backgroundColor: "#FFD166", color: "#1A1A1A" }}
                        >
                          HOT
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-xs text-muted">{s.votes} votes</p>
                  </div>

                  {/* Vote button */}
                  <button
                    onClick={() => toggleVote(s.id)}
                    className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-card transition-all active:scale-[0.95]"
                    style={{
                      backgroundColor: s.voted ? "#2C8FE0" : "#F5EDE3",
                    }}
                  >
                    <span className="text-sm" style={{ color: s.voted ? "#fff" : "#1A1A1A" }}>↑</span>
                    <span className="font-mono text-xs font-bold" style={{ color: s.voted ? "#fff" : "#1A1A1A" }}>
                      {s.votes}
                    </span>
                  </button>
                </div>
              ))}
          </div>
        </div>

      </div>
    </main>
  );
}
