"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import SMark from "@/components/SMark";
import { createClient } from "@/lib/supabase/client";
import { FEEDBACK_QUESTIONS, OTHER, type FeedbackQuestion } from "@/lib/feedbackQuestions";

// stretchyyoga.co.nz/rate/[session] — a few very quick questions after a
// session. Tap an answer (or "Other" and write your own); everything is
// optional, and no sign-in needed (name / email only if they want to add
// them). Linked from the "How was your first Stretchy?" email.

type Session = { id: string; title: string; starts_at: string; location_name: string };
type Answers = Record<string, string | string[]>;

const INK = "#14110F";

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className="px-3 py-1 rounded-pill text-xs font-semibold border-2 transition-colors"
      style={{ borderColor: INK, background: on ? INK : "#FFFFFF", color: on ? "#F7F0E8" : INK }}
    >
      {label}
    </button>
  );
}

function Question({ q, answers, setAnswers }: { q: FeedbackQuestion; answers: Answers; setAnswers: (a: Answers) => void }) {
  const val = answers[q.k];
  const picked = (o: string) => (q.multi ? ((val as string[] | undefined) ?? []).includes(o) : val === o);
  const toggle = (o: string) => {
    if (q.multi) {
      const list = (val as string[] | undefined) ?? [];
      setAnswers({ ...answers, [q.k]: list.includes(o) ? list.filter((x) => x !== o) : [...list, o] });
    } else {
      setAnswers({ ...answers, [q.k]: val === o ? "" : o });
    }
  };
  const otherOn = picked(OTHER);

  return (
    <div className="bg-white rounded-card border-2 border-ink p-3 flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <p className="m-0 font-bold text-ink text-sm leading-snug">{q.q}</p>
        {q.options.length > 0 && (
          <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-muted">{q.multi ? "Pick as many as you like" : "Pick one"}</span>
        )}
      </div>
      {q.options.length === 0 ? (
        <textarea
          rows={2}
          value={(val as string) ?? ""}
          onChange={(e) => setAnswers({ ...answers, [q.k]: e.target.value })}
          placeholder={q.placeholder}
          className="w-full rounded-lg border-2 border-ink px-3 py-1.5 bg-cream text-ink resize-none"
          style={{ fontSize: 16 }}
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5">
            {q.options.map((o) => <Chip key={o} label={o} on={picked(o)} onClick={() => toggle(o)} />)}
            {q.other && <Chip label={OTHER} on={otherOn} onClick={() => toggle(OTHER)} />}
          </div>
          {otherOn && (
            <input
              value={(answers[`${q.k}_other`] as string) ?? ""}
              onChange={(e) => setAnswers({ ...answers, [`${q.k}_other`]: e.target.value })}
              placeholder="Tell us more"
              autoFocus
              className="w-full h-9 rounded-lg border-2 border-ink px-3 bg-cream text-ink"
              style={{ fontSize: 16 }}
            />
          )}
          {q.more && Array.isArray(val) && val.length > 0 && (
            <textarea
              rows={2}
              value={(answers[`${q.k}_more`] as string) ?? ""}
              onChange={(e) => setAnswers({ ...answers, [`${q.k}_more`]: e.target.value })}
              placeholder="Say more (optional)"
              className="w-full rounded-lg border-2 border-ink px-3 py-1.5 bg-cream text-ink resize-none"
              style={{ fontSize: 16 }}
            />
          )}
        </>
      )}
    </div>
  );
}

export default function RateItPage() {
  const params = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [hp, setHp] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // No sign-in needed. If they happen to be signed in, the token just lets a
  // second go update their first answers.
  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session: authSession } }) => setToken(authSession?.access_token ?? null));
    fetch(`/api/sessions/${params.id}`).then((r) => (r.ok ? r.json() : null)).then((d) => setSession(d)).catch(() => {});
  }, [params.id]);

  const answered = Object.entries(answers).some(([, v]) => (Array.isArray(v) ? v.length > 0 : !!(v ?? "").trim()));

  async function send() {
    if (!answered) return;
    setSending(true);
    setError(null);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ sessionId: params.id, answers, name, email, hp }),
    }).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    setSending(false);
    if (!res || !res.ok) return setError(d.error ?? "Couldn’t send that just now. Please try again.");
    setDone(true);
    window.scrollTo(0, 0);
  }

  if (done) {
    return (
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center gap-3">
        <div className="text-ink"><SMark size={56} /></div>
        <h1 className="font-display font-bold text-ink m-0" style={{ fontSize: "clamp(34px,10vw,44px)", letterSpacing: "-0.03em", lineHeight: 1 }}>Thank you! 💛</h1>
        <p className="text-sm text-muted max-w-xs m-0">That really helps us make Stretchy better for everyone.</p>
        <div className="flex flex-col gap-2 mt-4 w-full max-w-xs">
          <Link href="/sessions" className="h-12 rounded-pill bg-ink text-cream font-bold flex items-center justify-center">See what&rsquo;s on next</Link>
          <Link href="/suggest" className="h-12 rounded-pill border-2 border-ink text-ink font-bold flex items-center justify-center">Suggest a Stretchy</Link>
        </div>
      </main>
    );
  }

  const day = session
    ? new Date(session.starts_at).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "short", day: "numeric", month: "short" }).toUpperCase()
    : null;

  return (
    <main className="min-h-screen bg-cream pb-20">
      <nav className="flex items-center justify-between px-5 py-4 max-w-lg mx-auto">
        <Link href="/sessions" className="text-ink" aria-label="Stretchy"><SMark size={30} /></Link>
        <Link href="/sessions" className="px-4 py-2 rounded-pill font-mono text-xs font-bold uppercase tracking-widest text-ink border border-border">Skip</Link>
      </nav>

      <div className="px-5 max-w-lg mx-auto flex flex-col gap-3">
        <div className="flex flex-col gap-2 mb-1">
          {day && <p className="m-0 font-mono text-xs font-bold uppercase tracking-[0.16em] text-muted">{day} · {session?.location_name}</p>}
          <h1 className="font-display font-bold text-ink m-0" style={{ fontSize: "clamp(26px,7vw,36px)", letterSpacing: "-0.03em", lineHeight: 1 }}>
            How was your Stretchy?
          </h1>
          <p className="m-0 text-sm text-muted">About 30 seconds. Tap what fits, skip anything you like.</p>
        </div>

        {FEEDBACK_QUESTIONS.map((q) => <Question key={q.k} q={q} answers={answers} setAnswers={setAnswers} />)}

        <div className="bg-white rounded-card border-2 border-ink p-3 flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <p className="m-0 font-bold text-ink text-sm leading-snug">Want us to know it&rsquo;s you?</p>
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-muted">Optional</span>
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
            className="w-full h-9 rounded-lg border-2 border-ink px-3 bg-cream text-ink"
            style={{ fontSize: 16 }}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
            autoComplete="email"
            className="w-full h-9 rounded-lg border-2 border-ink px-3 bg-cream text-ink"
            style={{ fontSize: 16 }}
          />
          <p className="m-0 text-xs text-muted">Leave these blank to stay anonymous.</p>
        </div>
        {/* Hidden from people; bots fill it in. */}
        <input value={hp} onChange={(e) => setHp(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" name="company" />

        {error && <p className="m-0 text-sm font-bold" style={{ color: "#C6362E" }}>{error}</p>}
        <button
          type="button"
          onClick={send}
          disabled={sending || !answered}
          className="h-11 rounded-pill bg-ink text-cream font-bold text-sm disabled:opacity-40"
        >
          {sending ? "Sending…" : "Send my answers"}
        </button>
        <p className="m-0 text-xs text-muted text-center">Only the Stretchy team sees your answers.</p>
      </div>
    </main>
  );
}
