"use client";

import { useState } from "react";
import Link from "next/link";
import type { GiftSession } from "@/lib/giftLinks";
import { NewTabLink, HOW_IT_WORKS_HREF } from "@/components/PolicyLinks";

const INK = "#14110F";
const CREAM = "#F7F0E8";
const YELLOW = "#FCBB16";
const button = "block w-full text-center rounded-pill py-[13px] px-[18px] font-bold text-[15px] disabled:opacity-50";
const field = "w-full px-4 py-3.5 rounded-pill border-2 border-ink bg-white text-ink outline-none text-sm";
const label = "font-mono text-xs font-bold uppercase tracking-widest text-muted";

export default function GiftClaim({
  code,
  from,
  until,
  left,
  sessions,
}: {
  code: string;
  from: string;
  until: string;
  left: number;
  sessions: GiftSession[];
}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ newAccount: boolean } | null>(null);

  async function claim(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await fetch(`/api/gift/${encodeURIComponent(code)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, name, email, agreed }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) setDone({ newAccount: !!data.newAccount });
      else setError(data.error ?? "Something went wrong. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setBusy(false);
  }

  const picked = sessions.find((s) => s.id === sessionId);

  if (done && picked) {
    return (
      <>
        <h1 className="font-display font-bold text-ink" style={{ fontSize: "clamp(40px,11vw,54px)", letterSpacing: "-0.04em", lineHeight: 0.92 }}>
          You&rsquo;re in. 💛
        </h1>
        <div className="rounded-card border-2 border-ink p-5" style={{ background: YELLOW }}>
          <p className="font-bold text-ink">{picked.day}, {picked.time} · {picked.place}</p>
          {picked.venue && <p className="text-sm text-ink/70">{picked.venue}</p>}
          <p className="text-sm text-ink mt-3">On {from}. Nothing to pay.</p>
        </div>
        <p className="text-sm text-ink">
          We&rsquo;ve emailed <strong>{email}</strong> all the details. Not there? Check junk.
          {done.newAccount && " Log in with that email any time to see your place."}
        </p>
        <Link href="/sessions" className={button} style={{ background: INK, color: CREAM }}>See what else is on</Link>
      </>
    );
  }

  return (
    <>
      <div>
        <p className={`${label} mb-2`}>A gift from {from}</p>
        <h1 className="font-display font-bold text-ink" style={{ fontSize: "clamp(40px,11vw,54px)", letterSpacing: "-0.04em", lineHeight: 0.92 }}>
          {from} has shouted you a place.
        </h1>
        <p className="text-sm text-ink mt-3">It&rsquo;s all paid for. Pick any Stretchy up to {until}.</p>
      </div>

      <div className="rounded-card border-2 border-ink px-5 py-5 space-y-3" style={{ background: YELLOW }}>
        <p className="font-mono text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(26,26,26,0.55)" }}>New to Stretchy?</p>
        {[
          { icon: "🧘", bold: "An hour of yoga.", text: "Every body welcome." },
          { icon: "☕", bold: "Social Stretch after.", text: "Come solo, leave with a crew." },
        ].map((l) => (
          <div key={l.icon} className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">{l.icon}</span>
            <p className="text-sm text-ink leading-snug"><strong>{l.bold}</strong> {l.text}</p>
          </div>
        ))}
        <p className="text-sm font-bold text-ink"><NewTabLink href={HOW_IT_WORKS_HREF}>How it works</NewTabLink></p>
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-ink">There aren&rsquo;t any sessions with room up to {until} right now. Check back soon.</p>
      ) : (
        <form onSubmit={claim} className="space-y-5">
          <fieldset className="space-y-2">
            <legend className={`${label} mb-2`}>Pick your Stretchy</legend>
            {sessions.map((s) => {
              const on = s.id === sessionId;
              return (
                <label
                  key={s.id}
                  className="flex items-start gap-3 rounded-card border-2 border-ink p-4 cursor-pointer transition-colors"
                  style={{ background: on ? INK : "#fff", color: on ? CREAM : INK }}
                >
                  <input type="radio" name="session" value={s.id} checked={on} onChange={() => setSessionId(s.id)} className="sr-only" />
                  <span className="mt-1 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center" style={{ borderColor: on ? CREAM : INK }}>
                    {on && <span className="w-2 h-2 rounded-full" style={{ background: YELLOW }} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-bold text-[15px]">{s.day}, {s.time} · {s.place}</span>
                    {s.venue && <span className="block text-sm opacity-70">{s.venue}</span>}
                    <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.06em] mt-1.5 opacity-80">{s.room}</span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          {sessionId && (
            <div className="space-y-3 motion-safe:animate-[giftReveal_250ms_ease-out]">
              <p className={label}>Your details</p>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your first name" autoComplete="given-name" className={field} required />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" type="email" autoComplete="email" className={field} required />
              <label className="flex items-start gap-3 text-sm text-ink cursor-pointer pt-1">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 flex-shrink-0" style={{ accentColor: INK }} />
                <span>I agree to the <NewTabLink href="/terms">terms</NewTabLink>.</span>
              </label>
              {error && <p className="text-sm font-bold text-ink" role="alert">{error}</p>}
              <button type="submit" disabled={busy || !name.trim() || !email.trim() || !agreed} className={button} style={{ background: INK, color: CREAM }}>
                {busy ? "Claiming…" : "Claim my place"}
              </button>
              <p className="text-xs text-muted text-center">
                Free, no card needed. We only use your email for your place. <NewTabLink href="/privacy">Privacy policy</NewTabLink>
              </p>
            </div>
          )}
        </form>
      )}

      <p className="text-xs text-muted text-center">
        {left === 1 ? "1 gifted place left" : `${left} gifted places left`} on {from}&rsquo;s link.
      </p>

      <style>{`@keyframes giftReveal { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }`}</style>
    </>
  );
}
