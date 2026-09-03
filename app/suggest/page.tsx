"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";
import SuggestionCard, { type BoardSuggestion } from "@/components/suggest/SuggestionCard";

const MOVEMENTS = ["Yoga", "Pilates", "Breathwork", "Sound bath", "Run club", "Dance", "HIIT", "Other"];
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const TIMES = ["Early AM", "Lunchtime", "After work", "Evening", "Weekend"];
const NEIGHBOURHOODS = ["Grey Lynn", "Ponsonby", "Herne Bay", "Parnell", "Mt Eden", "Newmarket", "CBD", "Other"];
const DURATIONS = ["45", "60", "75", "90", "Any"];
const SOCIAL_AFTER = ["Café", "Bar", "Park", "Wherever"];

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-pill px-[14px] py-[9px] text-[13px] font-semibold border-2 border-ink"
      style={selected ? { background: "#14110F", color: "#F7F0E8" } : { background: "#F7F0E8", color: "#14110F" }}
    >
      {children}
    </button>
  );
}

export default function SuggestPage() {
  const [suggestions, setSuggestions] = useState<BoardSuggestion[]>([]);
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [loadingBoard, setLoadingBoard] = useState(true);

  const [movement, setMovement] = useState("Yoga");
  const [movementOther, setMovementOther] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [time, setTime] = useState("");
  const [neighbourhoods, setNeighbourhoods] = useState<string[]>([]);
  const [neighbourhoodOther, setNeighbourhoodOther] = useState("");
  const [duration, setDuration] = useState("60");
  const [socialAfter, setSocialAfter] = useState("");
  const [anythingElse, setAnythingElse] = useState("");
  const [notifyMe, setNotifyMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/suggestions")
      .then((r) => r.json())
      .then((data: BoardSuggestion[]) => setSuggestions(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoadingBoard(false));
  }, []);

  function toggleDay(i: number) {
    setDays((prev) => (prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i]));
  }
  function toggleNeighbourhood(n: string) {
    setNeighbourhoods((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  }

  async function handleVote(id: string) {
    if (voted.has(id)) return;
    setVoted((v) => new Set(v).add(id));
    setSuggestions((prev) => prev.map((s) => (s.id === id ? { ...s, vote_count: s.vote_count + 1 } : s)));
    await fetch("/api/suggestions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(console.error);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (movement === "Other" && !movementOther.trim()) {
      setFormError("Tell us what kind of movement you're after.");
      return;
    }
    setFormError(null);
    setSubmitting(true);

    const movementLabel = movement === "Other" ? movementOther.trim() : movement;
    const dayLabels = days.map((i) => ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]);
    const neighbourhoodLabel =
      neighbourhoods.includes("Other") && neighbourhoodOther.trim()
        ? [...neighbourhoods.filter((n) => n !== "Other"), neighbourhoodOther.trim()].join(", ")
        : neighbourhoods.join(", ");

    const detailParts = [
      time || null,
      movementLabel.toLowerCase(),
      duration !== "Any" ? `${duration} min` : null,
      socialAfter ? `${socialAfter.toLowerCase()} after` : null,
    ].filter(Boolean);

    const payload = {
      session_type: movementLabel.toLowerCase().replace(/\s+/g, "_"),
      neighbourhood: neighbourhoodLabel || null,
      preferred_time: [dayLabels.join("/"), time].filter(Boolean).join(" · ") || null,
      notes: detailParts.join(" · ") || anythingElse || null,
      details: {
        movement: movementLabel,
        days: dayLabels,
        time,
        neighbourhoods,
        neighbourhoodOther,
        duration,
        socialAfter,
        anythingElse,
        notifyMe,
      },
    };

    try {
      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setSuggestions((prev) => [{ id: data.id, session_type: payload.session_type, preferred_neighbourhood: payload.neighbourhood, preferred_time: payload.preferred_time, notes: payload.notes, vote_count: 1 }, ...prev]);
        setVoted((v) => new Set(v).add(data.id));
        setSubmitted(true);
      } else {
        setFormError(data.error ?? "Something went wrong.");
      }
    } catch {
      setFormError("Something went wrong.");
    }
    setSubmitting(false);
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center py-0 lg:py-8 px-0 lg:px-6">
      <div className="w-full lg:max-w-[1120px] border-0 lg:border-2 border-ink rounded-none lg:rounded-[20px] overflow-hidden bg-cream">
        {/* Header */}
        <div className="flex items-center justify-between px-[18px] lg:px-[26px] py-3.5 border-b-2 border-ink" style={{ background: "#716F39", color: "#F7F0E8" }}>
          <div className="flex items-center gap-2.5">
            <SMark size={28} />
            <span className="font-mono text-[10px] lg:text-[11px] font-extrabold tracking-[0.13em]">SUGGEST A STRETCHY</span>
          </div>
          <Link
            href="/sessions"
            aria-label="Close"
            className="w-11 h-11 flex-shrink-0 rounded-pill flex items-center justify-center text-base font-extrabold"
            style={{ border: "2px solid #F7F0E8" }}
          >
            ×
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row">
          {/* Form column */}
          <div className="lg:flex-[1.05] px-[18px] py-[26px] lg:p-[44px] flex flex-col gap-4" style={{ background: "#716F39", color: "#F7F0E8" }}>
            {submitted ? (
              <div className="py-16 text-center">
                <p className="text-3xl mb-3">🙌</p>
                <h1 className="font-display text-[28px] leading-none mb-2">On the board.</h1>
                <p className="text-sm leading-[1.5]">Thanks — the more &ldquo;me too&rdquo;s it gets, the sooner it happens.</p>
              </div>
            ) : (
              <>
                <h1 className="font-display text-[36px] lg:text-[44px] leading-[.95] m-0">Tell us where you want one.</h1>
                <p className="m-0 text-sm leading-[1.5]">
                  Suggest a session, a type of movement, a location, a social stretch. We&rsquo;ll see what we can do. Outside of Auckland too!
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-1">
                  <div>
                    <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2">WHAT MOVEMENT</div>
                    <div className="flex flex-wrap gap-1.5">
                      {MOVEMENTS.map((m) => (
                        <Chip key={m} selected={movement === m} onClick={() => setMovement(m)}>{m}</Chip>
                      ))}
                    </div>
                    {movement === "Other" && (
                      <input
                        value={movementOther}
                        onChange={(e) => setMovementOther(e.target.value)}
                        placeholder="If other, tell us what"
                        className="w-full h-11 mt-2 border-2 border-dashed border-ink rounded-pill px-[15px] text-xs bg-cream text-ink placeholder:text-ink/50 outline-none"
                      />
                    )}
                  </div>

                  <div>
                    <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2">WHICH DAY</div>
                    <div className="flex gap-1.5">
                      {DAYS.map((d, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggleDay(i)}
                          className="w-11 h-11 lg:w-11 lg:h-11 rounded-[10px] font-mono text-xs font-bold border-2 border-ink flex-shrink-0"
                          style={days.includes(i) ? { background: "#14110F", color: "#F7F0E8" } : { background: "#F7F0E8", color: "#14110F" }}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2">WHAT TIME</div>
                    <div className="flex flex-wrap gap-1.5">
                      {TIMES.map((t) => (
                        <Chip key={t} selected={time === t} onClick={() => setTime(t === time ? "" : t)}>{t}</Chip>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2">WHERE</div>
                    <div className="flex flex-wrap gap-1.5">
                      {NEIGHBOURHOODS.map((n) => (
                        <Chip key={n} selected={neighbourhoods.includes(n)} onClick={() => toggleNeighbourhood(n)}>{n}</Chip>
                      ))}
                    </div>
                    {neighbourhoods.includes("Other") && (
                      <input
                        value={neighbourhoodOther}
                        onChange={(e) => setNeighbourhoodOther(e.target.value)}
                        placeholder="Another suburb, or a city outside Auckland"
                        className="w-full h-11 mt-2 border-2 border-dashed border-ink rounded-pill px-[15px] text-xs bg-cream text-ink placeholder:text-ink/50 outline-none"
                      />
                    )}
                  </div>

                  <div>
                    <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2">HOW LONG</div>
                    <div className="flex gap-1.5">
                      {DURATIONS.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDuration(d)}
                          className="flex-1 h-11 rounded-pill font-mono text-xs font-bold border-2 border-ink"
                          style={duration === d ? { background: "#14110F", color: "#F7F0E8" } : { background: "#F7F0E8", color: "#14110F" }}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2">SOCIAL STRETCH AFTER</div>
                    <div className="flex flex-wrap gap-1.5">
                      {SOCIAL_AFTER.map((s) => (
                        <Chip key={s} selected={socialAfter === s} onClick={() => setSocialAfter(s === socialAfter ? "" : s)}>{s}</Chip>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2">ANYTHING ELSE</div>
                    <textarea
                      value={anythingElse}
                      onChange={(e) => setAnythingElse(e.target.value)}
                      placeholder="A teacher, a venue, a format, a reason… e.g. 6am run around the Domain, 45 min max."
                      className="w-full min-h-[90px] border-2 border-ink rounded-2xl px-[17px] py-3.5 text-xs bg-cream text-ink placeholder:text-ink/50 outline-none resize-none"
                    />
                  </div>

                  <label className="flex items-center gap-[11px] border-2 border-ink rounded-pill py-3 px-[18px] cursor-pointer" style={{ background: "#716F39" }}>
                    <span className="w-[42px] h-6 rounded-pill relative flex-shrink-0" style={{ background: "#14110F" }}>
                      <span className="absolute top-0.5 w-5 h-5 rounded-pill transition-all" style={{ left: notifyMe ? "20px" : "2px", background: "#FCBB16" }} />
                    </span>
                    <input type="checkbox" checked={notifyMe} onChange={(e) => setNotifyMe(e.target.checked)} className="sr-only" />
                    <span className="text-xs leading-[1.4]">Tell me first if this one happens. You&rsquo;re on the list automatically.</span>
                  </label>

                  {formError && <p className="text-xs font-semibold" style={{ color: "#FCBB16" }}>{formError}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="h-14 lg:h-14 rounded-pill text-base font-bold disabled:opacity-70"
                    style={{ background: "#14110F", color: "#F7F0E8" }}
                  >
                    {submitting ? "Sending…" : "Suggest it"}
                  </button>
                  <p className="text-[11px] leading-[1.4] text-center opacity-80">
                    Anonymous. Takes a minute. Others can say &ldquo;me too&rdquo; to push it up the board.
                  </p>
                </form>
              </>
            )}
          </div>

          {/* Board column */}
          <div className="lg:flex-[.95] px-[18px] py-[26px] lg:p-[44px] flex flex-col gap-4 bg-cream text-ink">
            <div className="font-mono text-[10px] lg:text-[11px] font-extrabold tracking-[0.13em]">WHAT THE COMMUNITY WANTS</div>
            <h2 className="font-display text-[34px] lg:text-[38px] leading-none m-0">The board.</h2>

            {loadingBoard ? (
              <p className="text-sm text-ink/50">Loading…</p>
            ) : suggestions.length === 0 ? (
              <p className="text-sm text-ink/50">Nothing suggested yet — be the first.</p>
            ) : (
              <div className="flex flex-col gap-3.5">
                {suggestions.map((s, i) => (
                  <SuggestionCard key={s.id} s={s} voted={voted.has(s.id)} onVote={handleVote} highlighted={i === 0} />
                ))}
              </div>
            )}

            <div className="hidden lg:block border-2 border-dashed border-ink/40 rounded-2xl p-5 mt-2">
              <div className="font-display text-lg leading-none mb-2">Nothing here for you?</div>
              <p className="m-0 text-xs leading-[1.5] text-ink/70">
                Suggest your own and we&rsquo;ll put it on the board. Enough &ldquo;me too&rdquo;s and it becomes a session.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
