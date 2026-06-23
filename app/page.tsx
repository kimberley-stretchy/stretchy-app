"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import SMark from "@/components/SMark";

const T = {
  olive:   "#7A8330",
  cream:   "#F5EDE3",
  black:   "#1A1A1A",
  yellow:  "#FFD166",
  purple:  "#A535C7",
  blue:    "#2C8FE0",
  title:   "'Space Grotesk', system-ui, sans-serif",
  mono:    "'JetBrains Mono', monospace",
  display: "'Bagel Fat One', cursive",
};

const MAXW = 1180;

function Eyebrow({ children, color = T.olive }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color, marginBottom: 18, display: "inline-flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 22, height: 2, background: color, display: "inline-block" }} />
      {children}
    </div>
  );
}

// ─── NAV ──────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 50, background: scrolled ? "rgba(245,237,227,0.95)" : "transparent", backdropFilter: scrolled ? "blur(12px)" : "none", borderBottom: scrolled ? "1px solid rgba(26,26,26,0.08)" : "1px solid transparent", transition: "all .25s ease" }}>
      <div style={{ maxWidth: MAXW, margin: "0 auto", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" aria-label="Stretchy home"><SMark size={32} className="text-olive" /></Link>
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
          <a href="#about" style={navLink}>About</a>
          <a href="#host" style={navLink}>Host a Stretchy</a>
          <a href="#suggest" style={navLink}>Suggest a Stretchy</a>
          <a href="#suggest" style={{ marginLeft: 8, padding: "10px 20px", borderRadius: 999, background: T.black, color: T.cream, fontFamily: T.title, fontSize: 14, fontWeight: 700, textDecoration: "none" }}>Join Auckland →</a>
        </div>
      </div>
    </div>
  );
}
const navLink: React.CSSProperties = { fontFamily: T.title, fontSize: 14, fontWeight: 600, color: T.black, textDecoration: "none", padding: "8px 10px", display: "inline-block" };

// ─── HERO ─────────────────────────────────────────────────────
function Hero() {
  return (
    <div style={{ background: T.olive, color: T.cream, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", right: -80, top: -60, opacity: 0.07, pointerEvents: "none" }}>
        <SMark size={580} className="text-cream" />
      </div>
      <div style={{ maxWidth: MAXW, margin: "0 auto", padding: "72px 24px 64px", position: "relative" }}>
        <div style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: "rgba(245,237,227,0.6)", marginBottom: 28, textTransform: "uppercase" }}>
          Stretchy 2.0 · Auckland · Yoga first
        </div>
        <h1 style={{ fontFamily: T.title, fontWeight: 700, fontSize: "clamp(52px, 8vw, 100px)", lineHeight: 0.88, letterSpacing: "-0.035em", margin: "0 0 14px" }}>Stretchy</h1>
        <h2 style={{ fontFamily: T.title, fontWeight: 700, fontSize: "clamp(28px, 4vw, 46px)", lineHeight: 1.0, letterSpacing: "-0.02em", margin: "0 0 28px", opacity: 0.85 }}>A social movement.</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 520 }}>
          <p style={{ margin: 0, fontSize: 18, lineHeight: 1.6, opacity: 0.95 }}>Stretchy is an IRL movement community for people who want to move without the membership. And make new mates while doing so.</p>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, opacity: 0.8 }}>Stretchy started as a social community in Auckland in 2024. Stretching bodies, minds and social circles beyond the walls of a yoga studio.</p>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, opacity: 0.8 }}>Stretchy is now back — new and improved. Made for fairer movement together. <strong style={{ color: T.yellow }}>The more people who join a Stretchy session, the less everyone pays.</strong></p>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 36, flexWrap: "wrap" }}>
          <a href="#suggest" style={{ padding: "16px 28px", borderRadius: 999, background: T.cream, color: T.black, fontFamily: T.title, fontSize: 16, fontWeight: 700, textDecoration: "none" }}>Join Auckland →</a>
          <a href="#how" style={{ padding: "16px 28px", borderRadius: 999, border: "2px solid rgba(245,237,227,0.4)", color: T.cream, fontFamily: T.title, fontSize: 16, fontWeight: 700, textDecoration: "none" }}>How it works</a>
        </div>
      </div>
    </div>
  );
}

// ─── IMAGE BAND ───────────────────────────────────────────────
function ImageBand() {
  return (
    <div style={{ height: 460, overflow: "hidden", background: T.olive, position: "relative" }}>
      <Image src="/stretchy-session.jpg" alt="A Stretchy session in Auckland" fill style={{ objectFit: "cover", objectPosition: "center 42%" }} />
    </div>
  );
}

// ─── HOW IT WORKS ─────────────────────────────────────────────
const HOW_STEPS = [
  ["Hold a spot", "No charge. You see the current price and how many more people are needed to confirm the session."],
  ["More people join", "Every new person in the room splits the cost further. The price drops for everyone, automatically."],
  ["36 hours out", "Minimum met → session confirmed, you're locked in. Minimum not met → all holds release. No charge."],
  ["2 hours out", "Price locks. Your card is charged at the final per-person price."],
  ["Show up. Move.", "Arrive, stretch, connect. Then head to the Social Stretch spot. The best part."],
];

function HowItWorks() {
  return (
    <div id="how" style={{ background: T.purple, color: T.cream }}>
      <div style={{ maxWidth: MAXW, margin: "0 auto", padding: "96px 24px" }}>
        <Eyebrow color={T.cream}>How it works</Eyebrow>
        <h2 style={{ fontFamily: T.title, fontWeight: 700, fontSize: "clamp(32px, 5vw, 54px)", lineHeight: 0.95, letterSpacing: "-0.025em", margin: "0 0 10px", maxWidth: 900 }}>The more people who join a Stretchy session,<br />the less everyone pays.</h2>
        <p style={{ fontSize: 18, lineHeight: 1.6, opacity: 0.85, maxWidth: 620, margin: "0 0 52px" }}>Movement is better together. And fairer together, too.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 24 }}>
          {HOW_STEPS.map(([title, body], i) => (
            <div key={i} style={{ background: "rgba(245,237,227,0.08)", borderRadius: 24, padding: 26 }}>
              <div style={{ fontFamily: T.display, fontSize: 38, lineHeight: 0.85, color: "rgba(245,237,227,0.22)", letterSpacing: "-0.03em", marginBottom: 14 }}>0{i + 1}</div>
              <h3 style={{ fontFamily: T.title, fontWeight: 700, fontSize: 17, lineHeight: 1.1, margin: "0 0 8px", color: T.cream }}>{title}</h3>
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55, color: "rgba(245,237,227,0.78)" }}>{body}</p>
            </div>
          ))}
        </div>
        <div style={{ padding: "20px 28px", borderRadius: 16, background: "rgba(245,237,227,0.1)", border: "1px solid rgba(245,237,227,0.18)", maxWidth: 640 }}>
          <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, opacity: 0.9 }}><strong>One thing to know:</strong> Once you&apos;re locked in at 36 hours — if you can&apos;t make it, your card is still charged. Holds become commitments.</p>
        </div>
      </div>
    </div>
  );
}

// ─── PRICING MECHANIC ─────────────────────────────────────────
function PricingMechanic() {
  const [target, setTarget] = useState(200);
  const [minSpots, setMinSpots] = useState(8);
  const [people, setPeople] = useState(8);
  const FEE = 23;
  const perPerson = Math.round((target + FEE) / Math.max(people, 1));
  const startPrice = Math.round((target + FEE) / minSpots);
  const going = people >= minSpots;

  return (
    <div style={{ background: T.cream }}>
      <div style={{ maxWidth: MAXW, margin: "0 auto", padding: "96px 24px" }}>
        <Eyebrow>The pricing mechanic</Eyebrow>
        <h2 style={{ fontFamily: T.title, fontWeight: 700, fontSize: "clamp(28px, 4vw, 48px)", lineHeight: 0.95, letterSpacing: "-0.025em", margin: "0 0 12px", maxWidth: 760 }}>The more who join, the better value exchange for all.</h2>
        <p style={{ fontSize: 16, color: "rgba(26,26,26,0.65)", maxWidth: 560, margin: "0 0 40px", lineHeight: 1.6 }}>The host sets their revenue target. Split it across everyone who holds a spot. The more who join, the less everyone pays.</p>
        <div style={{ background: "#fff", borderRadius: 28, padding: "36px 40px", boxShadow: "0 20px 60px rgba(26,26,26,0.06)", border: "1.5px solid rgba(26,26,26,0.08)" }}>
          <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: "rgba(26,26,26,0.35)", marginBottom: 24 }}>● INTERACTIVE — DRAG IT</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "start" }} className="mechanic-grid">
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
              {[
                { label: "Host revenue target", value: target, min: 50, max: 400, step: 5, display: `$${target}`, color: T.olive, onChange: setTarget },
                { label: "Minimum spots to go ahead", value: minSpots, min: 3, max: 20, step: 1, display: String(minSpots), color: T.black, onChange: (v: number) => { setMinSpots(v); if (people < v) setPeople(v); } },
                { label: "People holding a spot", value: people, min: minSpots, max: 50, step: 1, display: String(people), color: T.blue, onChange: setPeople },
              ].map(({ label, value, min, max, step, display, color, onChange }) => (
                <div key={label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontFamily: T.title, fontSize: 14, fontWeight: 600, color: "rgba(26,26,26,0.7)" }}>{label}</span>
                    <span style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 700, color }}>{display}</span>
                  </div>
                  <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} style={{ width: "100%", accentColor: color }} />
                </div>
              ))}
            </div>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 999, marginBottom: 20, background: going ? "rgba(122,131,48,0.12)" : "rgba(26,26,26,0.06)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: going ? T.olive : "rgba(26,26,26,0.3)" }} />
                <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", color: going ? T.olive : "rgba(26,26,26,0.5)" }}>{going ? "● GOING AHEAD" : `○ NEEDS ${minSpots - people} MORE`}</span>
              </div>
              <div style={{ fontFamily: T.display, fontSize: 72, color: T.yellow, lineHeight: 0.9, marginBottom: 8 }}>${perPerson}</div>
              <p style={{ fontFamily: T.mono, fontSize: 11, color: "rgba(26,26,26,0.4)", letterSpacing: "0.1em", marginBottom: 20 }}>PER PERSON + GST</p>
              <p style={{ fontSize: 14, color: "rgba(26,26,26,0.6)", lineHeight: 1.6 }}>Starting price: <strong>${startPrice}</strong> at {minSpots} people. The host always earns their target. Everyone benefits as more join.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ABOUT ────────────────────────────────────────────────────
function About() {
  return (
    <div id="about" style={{ background: T.yellow }}>
      <div style={{ maxWidth: MAXW, margin: "0 auto", padding: "96px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "start" }} className="about-grid">
          <div>
            <Eyebrow>The backstory</Eyebrow>
            <h2 style={{ fontFamily: T.title, fontWeight: 700, fontSize: "clamp(32px, 4vw, 52px)", lineHeight: 0.95, letterSpacing: "-0.03em", margin: "0 0 28px" }}>Started as a social yoga community.</h2>
            {["Stretchy started in Auckland in 2024 — community-led yoga classes built on the idea that movement is better in good company.", "We outgrew the studio model fast. Sessions sold out. New faces kept showing up. The community wanted more formats, more neighbourhoods, more of everything.", "So we rebuilt it. Stretchy 2.0 is a platform for community movement — yoga first, then everything else. With a pricing model that rewards community. The more people who join, the less everyone pays.", "Stretching bodies, minds and social circles."].map((p, i) => (
              <p key={i} style={{ margin: "0 0 16px", fontSize: 16, lineHeight: 1.7, color: i < 2 ? "rgba(26,26,26,0.8)" : "rgba(26,26,26,0.65)" }}>{p}</p>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[["🧘", "Yoga first", "Starting with yoga. Pilates, breathwork, run clubs and more coming soon."], ["📍", "Auckland", "Community sessions across Auckland neighbourhoods — and growing."], ["🤙", "Social Stretch", "Every session ends with a Social Stretch. Coffee, food, good company."], ["💛", "Fair pricing", "The host sets a target. Stretchy adds a flat fee. Everyone splits it."]].map(([icon, title, body], i) => (
              <div key={i} style={{ display: "flex", gap: 16, padding: "20px 24px", borderRadius: 20, background: "#fff", border: "1.5px solid rgba(26,26,26,0.08)" }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>{icon}</span>
                <div>
                  <h3 style={{ fontFamily: T.title, fontWeight: 700, fontSize: 16, margin: "0 0 6px" }}>{title as string}</h3>
                  <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, color: "rgba(26,26,26,0.6)" }}>{body as string}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── HOST A STRETCHY ──────────────────────────────────────────
function HostAStretchy() {
  const [form, setForm] = useState({ name: "", email: "", where: "", what: "", how: "", rate: "" });
  const [done, setDone] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  async function submit() {
    if (!form.name.trim() || !form.email.trim()) return;
    try {
      await fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.name, email: form.email, role: "host", suburb: form.where }) });
    } catch { /* silent */ }
    setDone(true);
  }

  return (
    <div id="host" style={{ background: T.cream }}>
      <div style={{ maxWidth: MAXW, margin: "0 auto", padding: "96px 24px" }}>
        <Eyebrow>Ways to join us</Eyebrow>
        <h2 style={{ fontFamily: T.title, fontWeight: 700, fontSize: "clamp(34px, 5vw, 58px)", lineHeight: 0.95, letterSpacing: "-0.03em", margin: "0 0 56px", maxWidth: 840 }}>Stretchy works because<br />of those around it.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }} className="host-grid">
          <div style={{ padding: "40px 44px", borderRadius: 28, background: T.olive, color: T.cream }}>
            <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", opacity: 0.65, marginBottom: 16 }}>HOSTS · TEACHERS · GUIDES</p>
            <h3 style={{ fontFamily: T.title, fontWeight: 700, fontSize: 30, lineHeight: 1.0, letterSpacing: "-0.02em", margin: "0 0 16px" }}>Lead a Stretchy session.</h3>
            <p style={{ margin: "0 0 26px", fontSize: 15, lineHeight: 1.65, opacity: 0.9 }}>Whether you&apos;re a yoga teacher, a movement guide, or someone with a practice and a community — if you&apos;d like to lead a Stretchy session, get in touch.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {["You bring your practice. You find the space.", "We handle bookings and payments. Community access, social media and advertising done by us.", "The Stretchy community grows.", "Building Auckland, NZ and world wide."].map((t, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", fontSize: 14, lineHeight: 1.55, opacity: 0.88 }}>
                  <span style={{ color: T.yellow, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>→</span><span>{t}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: "36px 40px", borderRadius: 28, background: "#fff", border: "1.5px solid rgba(26,26,26,0.08)", boxShadow: "0 16px 40px rgba(26,26,26,0.06)" }}>
            {done ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <SMark size={56} className="text-olive" />
                <h3 style={{ fontFamily: T.title, fontWeight: 700, fontSize: 26, letterSpacing: "-0.02em", margin: "20px 0 10px" }}>Got it. We&apos;ll be in touch.</h3>
                <p style={{ fontSize: 15, color: "#666", lineHeight: 1.55, margin: 0 }}>Thanks for reaching out. We review all host applications and will be in touch soon.</p>
              </div>
            ) : (
              <>
                <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: T.olive, marginBottom: 20 }}>HOST APPLICATION</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <input value={form.name} onChange={set("name")} placeholder="Your name" style={lightInput} />
                    <input value={form.email} onChange={set("email")} placeholder="your@email.com" style={lightInput} />
                  </div>
                  <input value={form.where} onChange={set("where")} placeholder="Where — suburb / venue in mind" style={lightInput} />
                  <input value={form.what} onChange={set("what")} placeholder="What — yoga, pilates, run club..." style={lightInput} />
                  <textarea value={form.how} onChange={set("how")} placeholder="How — your practice, style, experience" rows={3} style={{ ...lightInput, resize: "vertical" }} />
                  <input value={form.rate} onChange={set("rate")} placeholder="Your expected session rate ($)" style={lightInput} />
                  <button onClick={submit} style={{ width: "100%", padding: "16px", borderRadius: 999, background: T.black, color: T.cream, border: "none", cursor: "pointer", fontFamily: T.title, fontSize: 15, fontWeight: 700, marginTop: 4 }}>Apply to host →</button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
const lightInput: React.CSSProperties = { width: "100%", padding: "13px 16px", borderRadius: 12, border: "1.5px solid rgba(26,26,26,0.14)", background: "#FFF8F4", fontFamily: T.title, fontSize: 15, color: T.black, outline: "none", boxSizing: "border-box" };

// ─── SUGGEST A STRETCHY ───────────────────────────────────────
const SEED = [
  { area: "Ponsonby", type: "Yoga", notes: "Morning flow in the park", votes: 18 },
  { area: "Parnell", type: "Breathwork", notes: "Sunday morning, 8am", votes: 12 },
  { area: "Mt Eden", type: "Run Club", notes: "Around the domain", votes: 9 },
];

function SuggestAStretchy() {
  const [area, setArea] = useState(""); const [type, setType] = useState(""); const [notes, setNotes] = useState(""); const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [suggestions, setSuggestions] = useState(SEED);
  const [voted, setVoted] = useState<Record<number, boolean>>({});

  function submit() {
    if (!area.trim()) return;
    setSuggestions(prev => [{ area, type: type || "Stretchy", notes: notes || "", votes: 1 }, ...prev]);
    setDone(true);
  }
  function vote(i: number) {
    if (voted[i]) return;
    setVoted(v => ({ ...v, [i]: true }));
    setSuggestions(prev => prev.map((s, idx) => idx === i ? { ...s, votes: s.votes + 1 } : s));
  }
  const sorted = [...suggestions].sort((a, b) => b.votes - a.votes);

  return (
    <div id="suggest" style={{ background: T.yellow, color: T.black }}>
      <div style={{ maxWidth: MAXW, margin: "0 auto", padding: "96px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "start" }} className="suggest-grid">
          <div>
            <Eyebrow color={T.black}>Suggest a Stretchy</Eyebrow>
            <h2 style={{ fontFamily: T.title, fontWeight: 700, fontSize: "clamp(32px, 4.5vw, 52px)", lineHeight: 0.95, letterSpacing: "-0.03em", margin: "0 0 20px" }}>Need a Stretchy in your community?</h2>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: "rgba(26,26,26,0.75)", margin: "0 0 32px" }}>Fill out the form to suggest a Stretchy. People can vote — the most-wanted rise to the top.</p>
            {done ? (
              <div style={{ padding: "28px 32px", borderRadius: 24, background: T.black, color: T.cream }}>
                <h3 style={{ fontFamily: T.title, fontWeight: 700, fontSize: 24, letterSpacing: "-0.02em", margin: "0 0 8px" }}>You&apos;re on the list.</h3>
                <p style={{ margin: 0, fontSize: 15, opacity: 0.85, lineHeight: 1.55 }}>We&apos;ll be in touch when sessions go live near you.</p>
              </div>
            ) : (
              <div style={{ background: "#fff", borderRadius: 24, padding: 28, boxShadow: "0 16px 40px rgba(26,26,26,0.08)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <input value={area} onChange={e => setArea(e.target.value)} placeholder="Area / suburb" style={lightInput} />
                  <input value={type} onChange={e => setType(e.target.value)} placeholder="Type of session (yoga, run club...)" style={lightInput} />
                  <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any details or notes" style={lightInput} />
                  <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email — to hear when it&apos;s live" style={lightInput} />
                  <button onClick={submit} style={{ width: "100%", padding: "16px", borderRadius: 999, background: T.black, color: T.cream, border: "none", cursor: "pointer", fontFamily: T.title, fontSize: 15, fontWeight: 700 }}>Suggest a Stretchy →</button>
                </div>
              </div>
            )}
          </div>
          <div>
            <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: "rgba(26,26,26,0.5)", marginBottom: 16 }}>WHAT PEOPLE WANT</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {sorted.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", borderRadius: 18, background: "#fff", boxShadow: "0 4px 16px rgba(26,26,26,0.06)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontFamily: T.title, fontWeight: 700, fontSize: 16 }}>{s.area}</span>
                      <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.10em", background: "rgba(26,26,26,0.08)", padding: "3px 8px", borderRadius: 999 }}>{s.type}</span>
                    </div>
                    {s.notes && <div style={{ fontSize: 13, color: "#777" }}>{s.notes}</div>}
                  </div>
                  <button onClick={() => vote(i)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 14px", borderRadius: 12, cursor: voted[i] ? "default" : "pointer", background: voted[i] ? T.olive : "rgba(26,26,26,0.06)", border: "none", flexShrink: 0 }}>
                    <span style={{ fontSize: 14, color: voted[i] ? T.cream : T.black }}>{voted[i] ? "✓" : "↑"}</span>
                    <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: voted[i] ? T.cream : T.black }}>{s.votes}</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── FINAL CTA ────────────────────────────────────────────────
function FinalCTA() {
  return (
    <div style={{ background: T.olive, color: T.cream, textAlign: "center" }}>
      <div style={{ maxWidth: MAXW, margin: "0 auto", padding: "96px 24px" }}>
        <SMark size={88} className="text-cream" />
        <h2 style={{ fontFamily: T.title, fontWeight: 700, fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 0.95, letterSpacing: "-0.03em", margin: "28px auto 22px", maxWidth: 720 }}>Welcome to the highlight<br />of your week.</h2>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, marginTop: 36 }}>
          <a href="#suggest" style={{ padding: "18px 32px", borderRadius: 999, background: T.cream, color: T.black, fontFamily: T.title, fontSize: 16, fontWeight: 700, textDecoration: "none" }}>Join us in Auckland →</a>
          <a href="#host" style={{ padding: "14px 28px", borderRadius: 999, border: "2px solid rgba(245,237,227,0.4)", color: T.cream, fontFamily: T.title, fontSize: 15, fontWeight: 700, textDecoration: "none" }}>Host a Stretchy →</a>
        </div>
      </div>
    </div>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────
function Footer() {
  return (
    <div style={{ background: "#4CAF82", color: T.black }}>
      <div style={{ maxWidth: MAXW, margin: "0 auto", padding: "56px 24px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 32, alignItems: "flex-start" }}>
        <div style={{ maxWidth: 340 }}>
          <div style={{ marginBottom: 16 }}><SMark size={30} className="text-ink" /></div>
          <p style={{ fontFamily: T.mono, fontSize: 11, letterSpacing: "0.08em", lineHeight: 1.7, color: "rgba(26,26,26,0.6)", margin: "0 0 18px" }}>© 2026 STRETCHY · A SOCIAL MOVEMENT.<br />BUILT IN AOTEAROA WITH AROHA.</p>
          <a href="mailto:kimberley@stretchyyoga.co.nz" style={{ fontFamily: T.mono, fontSize: 12, letterSpacing: "0.06em", color: T.black, textDecoration: "none", fontWeight: 600, opacity: 0.8 }}>kimberley@stretchyyoga.co.nz ↗</a>
        </div>
        <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", opacity: 0.5, margin: "0 0 2px" }}>STRETCHY</p>
            {[["#about", "About"], ["#host", "Host a Stretchy"], ["#suggest", "Suggest a Stretchy"], ["#suggest", "Join Auckland"]].map(([href, label]) => (
              <a key={label} href={href} style={{ color: T.black, opacity: 0.75, textDecoration: "none", fontFamily: T.title, fontWeight: 600, fontSize: 14 }}>{label}</a>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", opacity: 0.5, margin: "0 0 2px" }}>FOLLOW</p>
            <a href="https://instagram.com/stretchy.yoga" target="_blank" rel="noopener noreferrer" style={{ color: T.black, opacity: 0.75, textDecoration: "none", fontFamily: T.title, fontWeight: 600, fontSize: 14 }}>@stretchy.yoga ↗</a>
            <a href="https://instagram.com/stretchysocial" target="_blank" rel="noopener noreferrer" style={{ color: T.black, opacity: 0.75, textDecoration: "none", fontFamily: T.title, fontWeight: 600, fontSize: 14 }}>@stretchysocial ↗</a>
            <a href="https://www.stretchyyoga.co.nz" target="_blank" rel="noopener noreferrer" style={{ color: T.black, opacity: 0.75, textDecoration: "none", fontFamily: T.title, fontWeight: 600, fontSize: 14 }}>Stretchy 1.0 ↗</a>
            <Link href="/login" style={{ color: T.black, opacity: 0.75, textDecoration: "none", fontFamily: T.title, fontWeight: 600, fontSize: 14 }}>Sign in →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div style={{ background: T.cream }}>
      <Nav />
      <Hero />
      <ImageBand />
      <HowItWorks />
      <PricingMechanic />
      <About />
      <HostAStretchy />
      <SuggestAStretchy />
      <FinalCTA />
      <Footer />
    </div>
  );
}
