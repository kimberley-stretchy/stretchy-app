"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NewTabLink } from "@/components/PolicyLinks";

const INK = "#14110F";
const CREAM = "#F7F0E8";
const YELLOW = "#FCBB16";
const button = "block w-full text-center rounded-pill py-[13px] px-[18px] font-bold text-[15px] disabled:opacity-50";
const field = "w-full px-4 py-3.5 rounded-pill border-2 border-ink bg-white text-ink outline-none text-sm";
const label = "font-mono text-xs font-bold uppercase tracking-widest text-muted";

// The claim form: first name, email, an optional care note, the terms. No card.
export default function ShoutClaim(p: {
  code: string;
  giver: string;
  name: string;
  email: string;
  note: string | null;
  heading: string;
  venue: string;
  lines: { icon: string; bold: string; text: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [cant, setCant] = useState(false);
  const [name, setName] = useState(p.name);
  const [email, setEmail] = useState(p.email);
  const [careNote, setCareNote] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ newAccount: boolean; sessionId: string } | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("cant") === "1") setCant(true);
  }, []);

  async function claim(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await fetch(`/api/shout/claim/${encodeURIComponent(p.code)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, careNote, agreed }),
    }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (!r || !r.ok) return setError(d.error ?? "Something went wrong. Please try again.");
    setDone(d);
  }

  if (done) {
    return (
      <>
        <h1 className="font-display font-bold" style={{ fontSize: "clamp(40px,11vw,54px)", letterSpacing: "-0.04em", lineHeight: 0.92 }}>You&rsquo;re in. 🎁</h1>
        <div className="rounded-card border-2 border-ink p-5" style={{ background: YELLOW }}>
          <p className="font-bold">{p.heading}</p>
          {p.venue && <p className="text-sm text-ink/70">{p.venue}</p>}
          <p className="text-sm mt-3">Shouted by {p.giver}. Nothing to pay.</p>
        </div>
        <p className="text-sm">
          We&rsquo;ve emailed <strong>{email}</strong> all the details. Not there? Check junk.
          {done.newAccount && " Log in with that email any time to see your place."}
        </p>
        <Link href={done.newAccount ? `/login?next=/hold/${done.sessionId}` : `/hold/${done.sessionId}`} className={button} style={{ background: INK, color: CREAM }}>
          {done.newAccount ? "Set up my account" : "Manage my booking"}
        </Link>
      </>
    );
  }

  return (
    <>
      <div>
        <h1 className="font-display font-bold" style={{ fontSize: "clamp(40px,11vw,54px)", letterSpacing: "-0.04em", lineHeight: 0.92 }}>{p.giver} has shouted you a place.</h1>
        <p className="font-bold mt-3">{p.heading}</p>
        {p.venue && <p className="text-sm text-ink/70">{p.venue}</p>}
        <p className="text-sm mt-2">It&rsquo;s all paid for.</p>
      </div>

      {p.note && (
        <div className="rounded-card border-2 border-ink p-4 bg-white">
          <p className="text-[15px] italic">&ldquo;{p.note}&rdquo;</p>
          <p className="text-sm font-bold mt-1">{p.giver}</p>
        </div>
      )}

      {!open && !cant && (
        <button type="button" onClick={() => setOpen(true)} className={button} style={{ background: INK, color: CREAM }}>Claim my place</button>
      )}

      <div className="rounded-card border-2 border-ink px-5 py-5 space-y-3" style={{ background: YELLOW }}>
        <p className="font-mono text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(26,26,26,0.55)" }}>New to Stretchy?</p>
        {p.lines.map((l) => (
          <div key={l.icon} className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0" aria-hidden>{l.icon}</span>
            <p className="text-sm leading-snug"><strong>{l.bold}</strong> {l.text}</p>
          </div>
        ))}
      </div>

      {cant ? (
        <div className="rounded-card border-2 border-ink p-5 bg-white space-y-3">
          <p className="font-bold">No worries.</p>
          <p className="text-sm">Let {p.giver} know you can&rsquo;t make it, so they can shout someone else. Changed your mind? You can still claim it.</p>
          <button type="button" onClick={() => { setCant(false); setOpen(true); }} className={button} style={{ background: INK, color: CREAM }}>Claim my place</button>
        </div>
      ) : (
        <>
          <p className="text-sm"><strong>Claiming takes a minute.</strong> A couple of health questions and our terms. No card needed.</p>
          {open ? (
            <form onSubmit={claim} className="space-y-3 animate-slide-down motion-reduce:animate-none">
              <p className={label}>Your details</p>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your first name" autoComplete="given-name" className={field} required />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" type="email" autoComplete="email" className={field} required />
              <label className="block space-y-1.5">
                <span className={label}>Moving with care <span className="normal-case tracking-normal font-normal">(optional)</span></span>
                <textarea value={careNote} onChange={(e) => setCareNote(e.target.value.slice(0, 500))} rows={3} placeholder="Anything your teacher should know? An injury, pregnancy, surgery, or something you’re easing back from." className="w-full rounded-xl border-2 border-ink px-3 py-2 bg-white" style={{ fontSize: 16 }} />
                <span className="block text-xs text-muted">Only your teacher, your GEM and Stretchy HQ see it.</span>
              </label>
              <label className="flex items-start gap-3 text-sm cursor-pointer pt-1">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 flex-shrink-0" style={{ accentColor: INK }} />
                <span>I agree to the <NewTabLink href="/terms">terms</NewTabLink>.</span>
              </label>
              {error && <p className="text-sm font-bold" role="alert">{error}</p>}
              <button type="submit" disabled={busy || !name.trim() || !email.trim() || !agreed} className={button} style={{ background: INK, color: CREAM }}>
                {busy ? "Claiming…" : "Claim my place"}
              </button>
            </form>
          ) : (
            <button type="button" onClick={() => setOpen(true)} className={button} style={{ background: INK, color: CREAM }}>Claim my place</button>
          )}
          <button type="button" onClick={() => setCant(true)} className="block mx-auto font-bold text-sm underline underline-offset-2">I can&rsquo;t make it</button>
        </>
      )}

      <p className="text-xs text-muted text-center">
        We only use your email for this place. <NewTabLink href="/privacy">Privacy policy</NewTabLink>
      </p>
    </>
  );
}
