"use client";

import { useState } from "react";
import SMark from "@/components/SMark";

// stretchy.social — HOLDING PAGE until the full design is built. A short
// intro and the waitlist form; sign-ups go to HQ → stretchy.social forms.
// Words are a first draft for Kimberley to approve.

const field = "w-full h-12 rounded-pill border-2 border-ink bg-white px-4 text-ink";

export default function StretchySocialHome() {
  const [f, setF] = useState({ name: "", email: "", organisation: "", what: "", updates: true });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "platform_waitlist",
        name: f.name,
        email: f.email,
        fields: { organisation: f.organisation, what_youd_run: f.what, happy_to_get_updates: f.updates, came_from: "stretchy.social" },
      }),
    }).catch(() => null);
    setBusy(false);
    if (!res || !res.ok) return setErr("Couldn’t send that. Please try again.");
    setDone(true);
  }

  return (
    <main className="min-h-screen bg-cream text-ink">
      <div className="max-w-xl mx-auto px-5 pt-5 pb-16">
        <nav className="flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-ink" aria-label="stretchy.social">
            <SMark size={32} />
            <span className="font-mono text-xs font-extrabold tracking-[0.12em]">STRETCHY.SOCIAL</span>
          </a>
          <a href="https://www.stretchyyoga.co.nz" className="px-4 py-2 rounded-pill font-mono text-xs font-bold uppercase tracking-widest border border-border">
            Stretchy Yoga ↗
          </a>
        </nav>

        <p className="font-mono text-[11px] font-extrabold tracking-[0.13em] text-purple mt-10 mb-3">COMING SOON</p>
        <h1 className="font-display font-bold leading-none" style={{ fontSize: "clamp(32px,9.5vw,64px)", letterSpacing: "-0.03em", overflowWrap: "anywhere" }}>
          Run your community the Stretchy way.
        </h1>
        <p className="text-base leading-relaxed mt-5">
          The booking, people-powered pricing and on-the-day tools behind{" "}
          <a href="https://www.stretchyyoga.co.nz" className="underline font-semibold">Stretchy Yoga</a>, ready for your classes,
          teachers, venues and organisation. Join the waitlist and we&rsquo;ll be in touch.
        </p>

        {done ? (
          <div className="mt-8 border-2 border-ink rounded-[22px] p-5 bg-white">
            <p className="font-display text-2xl leading-none m-0">You&rsquo;re on the list. 💛</p>
            <p className="text-sm mt-2 mb-0">Thanks! We&rsquo;ve emailed you a confirmation, and we&rsquo;ll be in touch within 5 working days.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 border-2 border-ink rounded-[22px] p-5 bg-white flex flex-col gap-3">
            <p className="font-mono text-[10px] font-extrabold tracking-[0.12em] m-0">JOIN THE WAITLIST</p>
            <input required className={field} style={{ fontSize: 16 }} placeholder="Your name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <input required type="email" className={field} style={{ fontSize: 16 }} placeholder="you@email.com" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <input className={field} style={{ fontSize: 16 }} placeholder="Business, studio or organisation (optional)" value={f.organisation} onChange={(e) => setF({ ...f, organisation: e.target.value })} />
            <textarea rows={3} className="w-full rounded-[18px] border-2 border-ink bg-white px-4 py-3 text-ink" style={{ fontSize: 16 }} placeholder="What would you run on it? (optional)" value={f.what} onChange={(e) => setF({ ...f, what: e.target.value })} />
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={f.updates} onChange={(e) => setF({ ...f, updates: e.target.checked })} />
              <span>Keep me posted on stretchy.social news.</span>
            </label>
            {err && <p className="text-sm font-bold m-0" style={{ color: "#C6362E" }}>{err}</p>}
            <button type="submit" disabled={busy} className="h-12 rounded-pill bg-ink text-cream font-bold disabled:opacity-60">
              {busy ? "Sending…" : "Join the waitlist"}
            </button>
            <p className="text-xs text-ink/55 m-0">
              We only use your details to get in touch about stretchy.social.{" "}
              <a href="https://www.stretchyyoga.co.nz/privacy" className="underline" target="_blank" rel="noopener noreferrer">Privacy ↗</a>
            </p>
          </form>
        )}

        <p className="text-xs text-ink/55 mt-10">
          stretchy.social is made by{" "}
          <a href="https://www.studiodawn.org" target="_blank" rel="noopener noreferrer" className="underline font-semibold">Studio Dawn</a>, the team behind{" "}
          <a href="https://www.stretchyyoga.co.nz" className="underline font-semibold">Stretchy Yoga</a>.
        </p>
      </div>
    </main>
  );
}
