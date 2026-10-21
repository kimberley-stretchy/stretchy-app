"use client";

// stretchy.social/research — the market research survey: an intro, six short
// steps (one per section) and a thank-you. Everything is optional, including
// contact details, so people can answer anonymously. Answers are only sent at
// the end. Questions live in lib/socialResearch.ts. Same look as SocialSite.tsx.

import { useEffect, useState } from "react";
import { RESEARCH_SECTIONS, hasOtherBox, otherLabel, type ResearchAnswers, type ResearchQuestion } from "@/lib/socialResearch";

const INK = "#16110F";
const CREAM = "#F7F1EA";
const P = "#8E2F8C";
const MARK = "/social/stretchy-s-ink.png";
const DISPLAY = "'BN Chubb', sans-serif";
const MONO = "var(--font-space-mono), 'Space Mono', monospace";
const BODY = "var(--font-bricolage), 'Bricolage Grotesque', system-ui, sans-serif";

const mono = (size = 12, extra: React.CSSProperties = {}): React.CSSProperties => ({ fontFamily: MONO, fontSize: size, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", ...extra });
const body: React.CSSProperties = { margin: 0, fontSize: 14.5, lineHeight: 1.6 };
const field: React.CSSProperties = { padding: "12px 16px", borderRadius: 14, border: `2px solid ${INK}`, background: "#FFFBF6", color: INK, fontSize: 16, outline: "none", width: "100%", fontFamily: BODY };

type Contact = { name: string; organisation: string; email: string; website: string };

function Button({ children, onClick, filled, disabled, type = "button" }: { children: React.ReactNode; onClick?: () => void; filled?: boolean; disabled?: boolean; type?: "button" | "submit" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ height: 52.9, padding: "0 24px", borderRadius: 999, border: `2.25px solid ${INK}`, background: filled ? INK : "transparent", color: filled ? CREAM : INK, fontWeight: 600, fontSize: 14, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.4 : 1, fontFamily: BODY }}
    >
      {children}
    </button>
  );
}

function LinkButton({ href, children, filled }: { href: string; children: React.ReactNode; filled?: boolean }) {
  return (
    <a href={href} style={{ height: 52.9, padding: "0 24px", borderRadius: 999, border: `2.25px solid ${INK}`, background: filled ? INK : "transparent", color: filled ? CREAM : INK, fontWeight: 600, fontSize: 14, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
      {children}
    </a>
  );
}

function Chip({ label, on, onClick, long }: { label: string; on: boolean; onClick: () => void; long?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      style={{ minHeight: 41.4, padding: long ? "9px 16px" : "6px 14px", borderRadius: long ? 18 : 999, border: `1.75px solid ${INK}`, background: on ? INK : "transparent", color: on ? CREAM : INK, fontWeight: 500, fontSize: 13, lineHeight: 1.35, cursor: "pointer", textAlign: "left", fontFamily: BODY, width: long ? "100%" : undefined }}
    >
      {label}
    </button>
  );
}

function Question({ q, answers, set, update }: { q: ResearchQuestion; answers: ResearchAnswers; set: (k: string, v: string | string[]) => void; update: (fn: (a: ResearchAnswers) => ResearchAnswers) => void }) {
  const val = answers[q.k];
  const list = Array.isArray(val) ? val : [];
  const extra = hasOtherBox(q) ? otherLabel(q) : null;
  const options = [...(q.options ?? []), ...(q.other ? [extra!] : [])];
  const picked = (o: string) => (q.type === "multi" ? list.includes(o) : val === o);
  const full = q.type === "multi" && q.max ? list.length >= q.max : false;
  // Worked out from the latest answers, so quick taps never drop one.
  const toggle = (o: string) => update((a) => {
    const cur = a[q.k];
    if (q.type !== "multi") return { ...a, [q.k]: cur === o ? "" : o };
    const l = Array.isArray(cur) ? cur : [];
    if (l.includes(o)) return { ...a, [q.k]: l.filter((x) => x !== o) };
    if (q.max && l.length >= q.max) return a;
    return { ...a, [q.k]: [...l, o] };
  });
  // Long answers (Q16) read better as full-width rows.
  const long = (q.options ?? []).some((o) => o.length > 70);

  return (
    <fieldset style={{ border: 0, margin: 0, padding: "22px 0", borderTop: `1.5px solid ${INK}`, display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
      <legend style={{ padding: 0, display: "contents" }}>
        <span style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
          <span style={mono(11, { color: P, flex: "none" })}>{String(q.n).padStart(2, "0")}</span>
          <span style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.35 }}>{q.q}</span>
        </span>
      </legend>
      {q.hint && <span style={{ ...mono(9.5, { letterSpacing: ".1em" }), opacity: 0.65, marginTop: -4 }}>{q.hint}{full ? " · That’s the most" : ""}</span>}
      {q.type === "text" ? (
        <textarea rows={3} value={(val as string) ?? ""} onChange={(e) => set(q.k, e.target.value)} placeholder={q.placeholder ?? "Type here (optional)"} style={{ ...field, resize: "vertical" }} />
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, flexDirection: long ? "column" : "row" }}>
          {options.map((o) => <Chip key={o} label={o} on={picked(o)} onClick={() => toggle(o)} long={long} />)}
        </div>
      )}
      {extra && picked(extra) && (
        <input value={(answers[`${q.k}_other`] as string) ?? ""} onChange={(e) => set(`${q.k}_other`, e.target.value)} placeholder="Tell us more" autoFocus style={field} />
      )}
    </fieldset>
  );
}

export default function ResearchSurvey() {
  // -1 = intro, 0–5 = sections, 6 = thank you.
  const [step, setStep] = useState(-1);
  const [answers, setAnswers] = useState<ResearchAnswers>({});
  const [contact, setContact] = useState<Contact>({ name: "", organisation: "", email: "", website: "" });
  const [hp, setHp] = useState("");
  const [source, setSource] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const last = RESEARCH_SECTIONS.length - 1;

  // ?src=email (or homepage, instagram…) so HQ can see where answers came from.
  useEffect(() => { setSource(new URLSearchParams(window.location.search).get("src") ?? ""); }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [step]);

  const set = (k: string, v: string | string[]) => setAnswers((a) => ({ ...a, [k]: v }));

  async function submit() {
    setSending(true);
    setError(null);
    const res = await fetch("/api/social-research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, ...contact, source, hp }),
    }).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    setSending(false);
    if (!res || !res.ok) return setError(d.error ?? "Couldn’t send that just now. Please try again.");
    setStep(last + 1);
  }

  const section = step >= 0 && step <= last ? RESEARCH_SECTIONS[step] : null;

  return (
    <div style={{ fontFamily: BODY, color: INK, background: CREAM, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: CREAM, borderBottom: `2px solid ${INK}` }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "14px clamp(16px,2.5vw,40px)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: INK, minWidth: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MARK} alt="" style={{ height: 34, width: "auto", display: "block", flex: "none" }} />
            <span style={{ fontFamily: DISPLAY, fontSize: "clamp(14px,3.17vw,22px)", lineHeight: 0.95 }}>STRETCHY SOCIAL</span>
          </a>
          {section && <span style={mono(10.5)}>{step + 1} / {last + 1}</span>}
        </div>
        {section && (
          <div style={{ height: 6, background: "rgba(22,17,15,.1)" }}>
            <div style={{ height: "100%", width: `${((step + 1) / (last + 1)) * 100}%`, background: P, transition: "width .25s" }} />
          </div>
        )}
      </header>

      <main style={{ flex: 1, padding: "clamp(28px,5vw,64px) clamp(16px,2.5vw,40px) clamp(48px,7vw,96px)" }}>
        <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 22 }}>
          {step === -1 && (
            <>
              <span style={mono(11, { color: P })}>Research · 3–5 minutes</span>
              <h1 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 400, fontSize: "clamp(22px,4.2vw,48px)", lineHeight: 1, textTransform: "uppercase", overflowWrap: "break-word" }}>
                What if we could bring more people together, to make movement, community, public and charity events, better for more?
              </h1>
              <p style={body}><strong>People-powered pricing</strong> means the more people who join, the better the price can get for everyone. It gives organisers a way to work towards a shared attendance or revenue goal, while making it easier for people to show up.</p>
              <p style={body}>We&rsquo;re building the technology behind Stretchy Yoga to help more communities, businesses and organisations bring people together — from run clubs and creative communities to wellness studios, fundraisers, workshops and one-off events.</p>
              <p style={body}>We started with yoga, but the idea could go much further.</p>
              <p style={body}>We&rsquo;re exploring how this could work for different kinds of gatherings, and we&rsquo;d love to understand how you currently run, book and pay for yours.</p>
              <p style={body}><strong>This short survey will help shape what we build.</strong> It&rsquo;s early-stage research, not a sales pitch. You can respond anonymously, share your details if you&rsquo;d like to be involved, or simply keep up with progress.</p>
              <p style={body}>Thanks for helping us explore a more community-powered way to get together.</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                <Button filled onClick={() => setStep(0)}>Start the survey →</Button>
              </div>
            </>
          )}

          {section && (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={mono(11, { color: P })}>Section {step + 1}</span>
                <h1 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 400, fontSize: "clamp(26px,5vw,52px)", lineHeight: 0.95, textTransform: "uppercase" }}>{section.title}</h1>
                {step === 0 && <p style={{ ...body, opacity: 0.75 }}>Thanks for taking a few minutes to share your thoughts. Skip anything that doesn&rsquo;t fit.</p>}
              </div>
              {section.intro && (
                <div style={{ border: `2px solid ${INK}`, borderRadius: 22, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10, background: "#FFFBF6" }}>
                  {section.intro.map((t) => <p key={t} style={{ ...body, fontSize: 14 }}>{t}</p>)}
                </div>
              )}
              <div>
                {section.questions.map((q) => <Question key={q.k} q={q} answers={answers} set={set} update={setAnswers} />)}
              </div>

              {step === last && (
                <div style={{ borderTop: `1.5px solid ${INK}`, paddingTop: 22, display: "flex", flexDirection: "column", gap: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>Optional: Stay in touch</span>
                  <p style={{ ...body, fontSize: 13.5, opacity: 0.8 }}>You can submit this survey anonymously. If you&rsquo;d like to hear about progress or be considered for a pilot, you can leave your details below.</p>
                  <input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} placeholder="Name" autoComplete="name" style={field} />
                  <input value={contact.organisation} onChange={(e) => setContact({ ...contact, organisation: e.target.value })} placeholder="Organisation or community" autoComplete="organization" style={field} />
                  <input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} placeholder="Email address" autoComplete="email" style={field} />
                  <input value={contact.website} onChange={(e) => setContact({ ...contact, website: e.target.value })} placeholder="Website or social link (optional)" autoComplete="url" style={field} />
                  <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, opacity: 0.75 }}>
                    Your contact details are optional and will only be used to follow up about Stretchy Social and this research. See our <a href="/#terms" style={{ color: INK }}>privacy notice</a>. To see, correct or delete your details at any time, email <a href="mailto:kimberley@stretchyyoga.co.nz" style={{ color: INK }}>kimberley@stretchyyoga.co.nz</a>.
                  </p>
                  {/* Hidden from people; bots fill it in. */}
                  <input value={hp} onChange={(e) => setHp(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" name="company_site" style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} />
                </div>
              )}

              {error && <p role="alert" style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "#B3261E" }}>{error}</p>}
              <div style={{ display: "flex", gap: 10, justifyContent: "space-between", flexWrap: "wrap", paddingTop: 6 }}>
                <Button onClick={() => setStep(step - 1)}>← Back</Button>
                {step < last
                  ? <Button filled onClick={() => setStep(step + 1)}>Next →</Button>
                  : <Button filled onClick={submit} disabled={sending}>{sending ? "Sending…" : "Submit my response"}</Button>}
              </div>
            </>
          )}

          {step === last + 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "flex-start" }}>
              <span style={mono(11, { color: P })}>Response received</span>
              <h1 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 400, fontSize: "clamp(32px,6vw,64px)", lineHeight: 0.95, textTransform: "uppercase" }}>Thank you!</h1>
              <p style={body}>That really helps shape what we build. If you left your details, we&rsquo;ll be in touch about what comes next.</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <LinkButton href="/">Back to Stretchy Social</LinkButton>
                <LinkButton href="/#form-waitlist" filled>Join the waitlist</LinkButton>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer style={{ background: INK, color: CREAM, padding: "20px clamp(16px,2.5vw,40px)", display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10, fontFamily: MONO, fontSize: 10, letterSpacing: ".06em" }}>
        <span>© 2026 Studio Dawn · stretchy.social</span>
        <a href="/#terms" style={{ color: CREAM }}>Privacy · Terms, IP &amp; copyright</a>
      </footer>
    </div>
  );
}
