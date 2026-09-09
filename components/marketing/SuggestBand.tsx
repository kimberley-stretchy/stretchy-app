"use client";

import { useState, useEffect } from "react";
import { suggestionTitle, type BoardSuggestion } from "@/components/suggest/SuggestionCard";

export type MarketingSuggestion = BoardSuggestion;

const VOTED_KEY = "stretchy-suggestion-votes";

function loadVoted(): Set<string> {
  try {
    const raw = localStorage.getItem(VOTED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}
function saveVoted(voted: Set<string>) {
  try {
    localStorage.setItem(VOTED_KEY, JSON.stringify(Array.from(voted)));
  } catch {
    // ignore — worst case someone can vote again next visit
  }
}

function HeartIcon({ voted }: { voted: boolean }) {
  return (
    <svg viewBox="0 0 24 22" width="20" height="18" className="lg:w-[22px] lg:h-5" aria-hidden>
      <path
        d="M12 20.2 3.6 12A5.3 5.3 0 0 1 12 5.4a5.3 5.3 0 0 1 8.4 6.6Z"
        fill={voted ? "#FCBB16" : "none"}
        stroke={voted ? "#FCBB16" : "#F7F0E8"}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SuggestionRow({ s, voted, onVote }: { s: BoardSuggestion; voted: boolean; onVote: (id: string) => void }) {
  const title = suggestionTitle(s);
  return (
    <button
      type="button"
      onClick={() => onVote(s.id)}
      disabled={voted}
      aria-label={voted ? `You voted for ${title}` : `Vote for ${title}`}
      className="w-full text-left flex items-center gap-3 lg:gap-[14px] rounded-2xl lg:rounded-[18px] border-2 border-cream px-3.5 py-3 lg:px-[18px] lg:py-[14px] transition-colors"
      style={{ background: voted ? "#14110F" : "transparent" }}
    >
      <span className="w-10 h-10 lg:w-11 lg:h-11 rounded-full border-2 border-cream flex items-center justify-center flex-shrink-0">
        <HeartIcon voted={voted} />
      </span>
      <span className="min-w-0">
        <span className="block font-display text-[17px] lg:text-[19px] leading-none">{title}</span>
        {s.notes && <span className="block text-[10px] lg:text-[11px] opacity-85 mt-1">{s.notes}</span>}
      </span>
    </button>
  );
}

export default function SuggestBand({ suggestions }: { suggestions: MarketingSuggestion[] }) {
  const [items] = useState(suggestions);
  const [voted, setVoted] = useState<Set<string>>(new Set());
  const [errorId, setErrorId] = useState<string | null>(null);

  // Persisted per-browser so a reload doesn't let the same person vote again —
  // a real server-side one-vote-per-person system (with signed-in + anonymous
  // reconciliation) is a larger piece of work not built in this pass.
  useEffect(() => { setVoted(loadVoted()); }, []);

  async function handleVote(id: string) {
    if (voted.has(id)) return;
    const next = new Set(voted).add(id);
    setVoted(next);
    saveVoted(next);
    setErrorId(null);

    const target = items.find((s) => s.id === id);
    if (target?.isPlaceholder) return; // example content — nothing real to vote on yet

    try {
      const res = await fetch("/api/suggestions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
    } catch {
      const reverted = new Set(voted);
      reverted.delete(id);
      setVoted(reverted);
      saveVoted(reverted);
      setErrorId(id);
    }
  }

  const board = items.slice(0, 4);

  return (
    <div className="bg-cream lg:bg-olive lg:border-t-2 lg:border-ink px-[14px] py-[14px] lg:px-0 lg:py-0">
      <div
        id="suggest"
        className="bg-olive text-cream rounded-[24px] lg:rounded-none border-2 border-ink lg:border-0 px-[18px] py-[22px] lg:p-[60px_44px]"
      >
      <div className="lg:grid lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)] lg:gap-[52px] lg:items-center">
        {/* Left — the pitch */}
        <div className="flex flex-col gap-3">
          <div className="font-mono text-[9px] lg:text-[11px] font-extrabold tracking-[0.15em]">SUGGEST A STRETCHY</div>
          <h2 className="font-display text-[28px] lg:text-[50px] leading-[1] lg:leading-[.94] m-0 lg:max-w-[14ch]">
            Tell us where you want one.
          </h2>
          <p className="m-0 text-[13px] lg:text-[15px] leading-[1.55]">
            <span className="lg:hidden">A session, a movement, a location, a social stretch. Outside of Auckland too.</span>
            <span className="hidden lg:inline">
              Suggest a session, a type of movement, a location, a social stretch. We&rsquo;ll see what we can do. Outside of Auckland too!
            </span>
          </p>
          <a
            href="/suggest"
            className="hidden lg:inline-flex items-center justify-center bg-ink text-cream border-2 border-ink rounded-pill h-14 w-fit px-8 mt-1.5 text-sm font-bold"
          >
            Suggest your own
          </a>
        </div>

        <div className="lg:hidden h-[2px] bg-ink my-4" />

        {/* Right — the board */}
        <div>
          <div className="hidden lg:block font-mono text-[11px] font-extrabold tracking-[0.13em] mb-[14px]">
            WHAT PEOPLE ARE ASKING FOR
          </div>
          {board.length > 0 && (
            <div className="grid grid-cols-1 gap-[9px] items-start">
              {board.map((s) => (
                <SuggestionRow key={s.id} s={s} voted={voted.has(s.id)} onVote={handleVote} />
              ))}
            </div>
          )}
          {errorId && <p className="text-xs mt-2 opacity-80">Couldn&rsquo;t save that — try again.</p>}
        </div>
      </div>

      <a
        href="/suggest"
        className="lg:hidden mt-4 inline-flex w-full items-center justify-center h-12 bg-ink text-cream border-2 border-ink rounded-pill text-sm font-bold"
      >
        Suggest your own
      </a>
      </div>
    </div>
  );
}
