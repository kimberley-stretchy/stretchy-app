"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";

const TYPES = ["Yoga", "Pilates", "Breathwork", "Sound Bath", "Run Club", "Dance", "HIIT", "Other"];
const WHEN_OPTIONS = ["Morning", "Lunchtime", "Evening", "Weekend"];
const NEIGHBOURHOODS = ["Grey Lynn", "Ponsonby", "Herne Bay", "Parnell", "Mt Eden", "Newmarket", "CBD", "Other"];

const TYPE_COLORS: Record<string, string> = {
  Yoga: "#A535C7", Pilates: "#2A3FE0", Breathwork: "#7A8330",
  "Sound Bath": "#4FB8E0", "Run Club": "#E63946", Dance: "#FF6B35",
  HIIT: "#FF4D9E", Other: "#888",
};

type Suggestion = {
  id: string;
  session_type: string;
  preferred_neighbourhood: string | null;
  preferred_time: string | null;
  notes: string | null;
  vote_count: number;
};

export default function SuggestPage() {
  const [type, setType]         = useState("");
  const [when, setWhen]         = useState("");
  const [where, setWhere]       = useState("");
  const [notes, setNotes]       = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [voted, setVoted] = useState<Set<string>>(new Set());

  // Load suggestions from Supabase on mount
  useEffect(() => {
    fetch("/api/suggestions")
      .then(r => r.json())
      .then(data => setSuggestions(Array.isArray(data) ? data : []))
      .catch(console.error);
  }, []);

  async function handleSubmit() {
    if (!type || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_type: type,
          neighbourhood: where || null,
          preferred_time: when || null,
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        // Add new suggestion to top of list
        setSuggestions(prev => [{
          id: data.id, session_type: type,
          preferred_neighbourhood: where || null,
          preferred_time: when || null,
          notes: notes || null,
          vote_count: 1,
        }, ...prev]);
        setVoted(v => new Set(Array.from(v).concat(data.id)));
        setSubmitted(true);
        setType(""); setWhen(""); setWhere(""); setNotes("");
      }
    } catch { /* silent */ }
    setSubmitting(false);
  }

  async function handleVote(id: string) {
    if (voted.has(id)) return;
    setVoted(v => new Set(Array.from(v).concat(id)));
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, vote_count: s.vote_count + 1 } : s));
    await fetch("/api/suggestions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(console.error);
  }

  const sorted = [...suggestions].sort((a, b) => b.vote_count - a.vote_count);

  return (
    <main className="min-h-screen bg-cream pb-20">
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <Link href="/sessions" className="text-ink"><SMark size={28} /></Link>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">Suggest</p>
        <Link href="/sessions" className="text-muted hover:text-ink text-lg transition-colors">×</Link>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-5">
        <div>
          <h1 className="font-display font-bold text-ink mb-2" style={{ fontSize: "clamp(36px,10vw,48px)", letterSpacing: "-0.03em", lineHeight: 1 }}>
            Float a Stretchy.
          </h1>
          <p className="text-sm text-muted leading-relaxed">
            Tell us what you want — community demand shapes what gets built. The most-wanted sessions rise to the top.
          </p>
        </div>

        {/* Submit form */}
        <div className="bg-white rounded-card shadow-card p-5">
          {submitted ? (
            <div className="text-center py-4">
              <p className="text-2xl mb-2">🙌</p>
              <p className="font-bold text-ink mb-1">Floated — thanks!</p>
              <p className="text-sm text-muted">Your suggestion is live. Get your mates to vote on it.</p>
              <button onClick={() => setSubmitted(false)} className="mt-4 font-mono text-xs font-bold text-muted hover:text-ink transition-colors">
                + SUGGEST ANOTHER
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Type */}
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-muted mb-2">What type?</p>
                <div className="flex flex-wrap gap-2">
                  {TYPES.map(t => (
                    <button key={t} onClick={() => setType(t)}
                      className="px-3 py-1.5 rounded-pill text-sm font-semibold transition-all border"
                      style={type === t
                        ? { background: TYPE_COLORS[t] ?? "#888", color: "#fff", borderColor: TYPE_COLORS[t] ?? "#888" }
                        : { background: "transparent", color: "#1A1A1A", borderColor: "#DDD0C0" }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* When */}
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-muted mb-2">When?</p>
                <div className="flex flex-wrap gap-2">
                  {WHEN_OPTIONS.map(w => (
                    <button key={w} onClick={() => setWhen(when === w ? "" : w)}
                      className="px-3 py-1.5 rounded-pill text-sm font-semibold transition-all border"
                      style={when === w
                        ? { background: "#1A1A1A", color: "#F5EDE3", borderColor: "#1A1A1A" }
                        : { background: "transparent", color: "#1A1A1A", borderColor: "#DDD0C0" }}>
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* Where */}
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-muted mb-2">Where?</p>
                <div className="flex flex-wrap gap-2">
                  {NEIGHBOURHOODS.map(n => (
                    <button key={n} onClick={() => setWhere(where === n ? "" : n)}
                      className="px-3 py-1.5 rounded-pill text-sm font-semibold transition-all border"
                      style={where === n
                        ? { background: "#7A8330", color: "#F5EDE3", borderColor: "#7A8330" }
                        : { background: "transparent", color: "#1A1A1A", borderColor: "#DDD0C0" }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-muted mb-2">Any notes? (optional)</p>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. 6am run around the domain, 45 min max"
                  className="w-full px-4 py-3 rounded-stretchy border-2 border-border bg-cream text-ink placeholder-muted focus:outline-none focus:border-hot-blue transition-colors text-sm"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={!type || submitting}
                className="w-full flex items-center justify-center font-semibold rounded-pill transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-40"
                style={{ backgroundColor: "#1A1A1A", color: "#F5EDE3", height: "52px", fontSize: "15px" }}>
                {submitting ? "Floating…" : "Float it →"}
              </button>
            </div>
          )}
        </div>

        {/* Community wants */}
        {sorted.length > 0 && (
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-muted mb-3">
              What the community wants
            </p>
            <div className="space-y-2">
              {sorted.map(s => {
                const color = TYPE_COLORS[s.session_type] ?? "#888";
                const hasVoted = voted.has(s.id);
                const label = [s.session_type, s.preferred_time, s.preferred_neighbourhood].filter(Boolean).join(" · ");
                return (
                  <div key={s.id} className="bg-white rounded-card shadow-card p-4 flex items-center gap-4">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: color }}>
                      {s.session_type.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink text-sm">{label || s.session_type}</p>
                      {s.notes && <p className="text-xs text-muted mt-0.5 truncate">{s.notes}</p>}
                    </div>
                    <button
                      onClick={() => handleVote(s.id)}
                      disabled={hasVoted}
                      className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-card transition-all flex-shrink-0"
                      style={{ background: hasVoted ? "rgba(122,131,48,0.12)" : "rgba(26,26,26,0.06)" }}>
                      <span className="text-sm">{hasVoted ? "✓" : "↑"}</span>
                      <span className="font-mono text-xs font-bold" style={{ color: hasVoted ? "#7A8330" : "#1A1A1A" }}>
                        {s.vote_count}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
