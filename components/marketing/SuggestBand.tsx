"use client";

import { useState } from "react";
import SuggestionCard, { type BoardSuggestion } from "@/components/suggest/SuggestionCard";

export type MarketingSuggestion = BoardSuggestion;

export default function SuggestBand({ suggestions }: { suggestions: MarketingSuggestion[] }) {
  const [items, setItems] = useState(suggestions);
  const [voted, setVoted] = useState<Set<string>>(new Set());

  async function handleVote(id: string) {
    if (voted.has(id)) return;
    setVoted((v) => new Set(v).add(id));
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, vote_count: s.vote_count + 1 } : s)));

    const target = items.find((s) => s.id === id);
    if (target?.isPlaceholder) return; // example content — nothing real to vote on yet

    await fetch("/api/suggestions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(console.error);
  }

  return (
    <div
      id="suggest"
      className="bg-olive border-t-2 border-ink text-cream px-[18px] py-[26px] lg:p-[60px_44px] flex flex-col gap-[14px] lg:gap-[30px]"
    >
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 lg:gap-6">
        <div className="flex flex-col gap-3 lg:gap-3 max-w-[660px] lg:flex-1">
          <div className="font-mono text-[9px] lg:text-[11px] font-extrabold tracking-[0.14em] lg:tracking-[0.15em]">SUGGEST A STRETCHY</div>
          <h2 className="font-display text-[34px] lg:text-[50px] leading-[.94] lg:leading-[.92] m-0">Tell us where you want one.</h2>
          <p className="m-0 text-sm lg:text-[15px] leading-[1.55]">
            Suggest a session, a type of movement, a location, a social stretch.
            <span className="hidden lg:inline"> We&rsquo;ll see what we can do.</span> Outside of Auckland too!
          </p>
        </div>
        <a
          href="/suggest"
          className="hidden lg:inline-flex items-center justify-center bg-ink text-cream border-2 border-ink rounded-pill h-11 w-[235px] flex-shrink-0 text-sm font-bold"
        >
          Suggest your own
        </a>
      </div>

      {items.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-[9px] lg:gap-4">
          {items.slice(0, 4).map((s) => (
            <SuggestionCard key={s.id} s={s} voted={voted.has(s.id)} onVote={handleVote} highlighted />
          ))}
        </div>
      )}

      <a
        href="/suggest"
        className="lg:hidden inline-flex items-center justify-center h-12 bg-ink text-cream border-2 border-ink rounded-pill text-sm font-bold"
      >
        Suggest your own
      </a>
    </div>
  );
}
