"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import SMark from "@/components/SMark";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  olive:  "#7A8330",
  cream:  "#F5EDE3",
  black:  "#1A1A1A",
  yellow: "#FFD166",
  purple: "#A535C7",
  blue:   "#2C8FE0",
  title:  "'Space Grotesk', system-ui, sans-serif",
  mono:   "'JetBrains Mono', monospace",
  display:"'Bagel Fat One', cursive",
};

type WaitlistRole = "move" | "host" | "both";

// ─── NAV ──────────────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return (
    <div style={{
      position: "sticky", top: 0, zIndex: 50,
      background: scrolled ? "rgba(245,237,227,0.92)" : "transparent",
      backdropFilter: scrolled ? "blur(10px)" : "none",
      borderBottom: scrolled ? "1px solid rgba(26,26,26,0.08)" : "1px solid transparent",
      transition: "all .25s ease",
    }}>
      <div style={{
        maxWidth: 1180, margin: "0 auto", padding: "14px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Link href="/" aria-label="Stretchy home">
          <SMark size={32} />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <a href="#how" style={navLinkStyle}>How it works</a>
          <Link href="/home" style={navLinkStyle}>Explore the app</Link>
          <a href="#waitlist" style={{
            padding: "10px 20px", borderRadius: 999, background: T.black,
            color: T.cream, fontFamily: T.title, fontSize: 14, fontWeight: 700,
            textDecoration: "none", transition: "opacity .15s",
          }}>Join the waitlist</a>
        </div>
      </div>
    </div>
  );
}
const navLinkStyle: React.CSSProperties = {
  fontFamily: T.title, fontSize: 14, fontWeight: 600, color: T.black,
  textDecoration: "none", padding: "8px 12px", display: "inline-block",
};

// ─── HERO ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <div style={{ background: T.olive, color: T.cream, position: "relative", overflow: "hidden" }}>
      {/* ghost S */}
      <div style={{ position: "absolute", right: -80, top: -40, opacity: 0.07, pointerEvents: "none" }}>
        <span style={{ color: T.cream }}><SMark size={520} /></span>
      </div>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "72px 24px 64px", position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 40, alignItems: "center" }} className="hero-grid">
          {/* left */}
          <div>
            <div style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, letterSpacing: "0.20em", opacity: 0.8, marginBottom: 22 }}>
              AUCKLAND, AOTEAROA · EST. 2026
            </div>
            <h1 style={{
              fontFamily: T.title, fontWeight: 700,
              fontSize: "clamp(48px, 7vw, 92px)", lineHeight: 0.92,
              letterSpacing: "-0.03em", margin: 0,
            }}>
              A social<br />movement.
            </h1>
            <p style={{ margin: "26px 0 0", fontSize: 19, lineHeight: 1.55, maxWidth: 480, opacity: 0.95 }}>
              Community movement classes where <strong>the price drops as more people join.</strong> The more who move together, the better value for everyone. Plus the beloved "Social Stretch" after.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 32, flexWrap: "wrap" }}>
              <a href="#waitlist" style={{
                padding: "16px 28px", borderRadius: 999, background: T.yellow,
                color: T.black, fontFamily: T.title, fontSize: 16, fontWeight: 700,
                textDecoration: "none",
              }}>Join the waitlist →</a>
              <Link href="/home" style={{
                padding: "16px 28px", borderRadius: 999,
                border: "2px solid rgba(245,237,227,0.5)", color: T.cream,
                fontFamily: T.title, fontSize: 16, fontWeight: 700,
                textDecoration: "none",
              }}>Explore the app</Link>
            </div>
            <p style={{ margin: "26px 0 0", fontSize: 14, opacity: 0.7, maxWidth: 420, lineHeight: 1.5 }}>
              Yoga, pilates, HIIT, breathwork, run clubs — with a pricing model that rewards community.
            </p>
          </div>
          {/* right — phone mockup */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }} className="hero-phones">
            <Image
              src="/sunday-slow-flow.png"
              alt="Stretchy app — the price drops as more people hold a spot"
              width={252} height={500}
              style={{ width: 252, height: "auto", filter: "drop-shadow(0 30px 60px rgba(0,0,0,0.42))" }}
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PRICING MECHANIC ─────────────────────────────────────────────────────────
function RangeSlider({ label, value, min, max, step = 1, onChange, minLabel, maxLabel }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; minLabel: string; maxLabel: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{ marginBottom: 26 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: T.black }}>{label}</span>
        <span style={{ fontFamily: T.title, fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>{value}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: "100%", WebkitAppearance: "none", appearance: "none",
          height: 8, borderRadius: 999, outline: "none", cursor: "pointer",
          background: `linear-gradient(90deg, ${T.olive} 0% ${pct}%, rgba(26,26,26,0.10) ${pct}% 100%)`,
        }}
        className="stretchy-range"
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontFamily: T.mono, fontSize: 10, color: "#888", letterSpacing: "0.08em" }}>
        <span>{minLabel}</span><span>{maxLabel}</span>
      </div>
    </div>
  );
}

function PricingMechanic() {
  const [target, setTarget] = useState(250);
  const [minSpots, setMinSpots] = useState(8);
  const [people, setPeople] = useState(8);
  const FEE = 23;
  const effective = Math.max(people, minSpots);
  const perPerson = Math.round((target + FEE) / effective);
  const startPrice = Math.round((target + FEE) / minSpots);
  const confirmed = people >= minSpots;

  return (
    <div style={{ padding: "96px 0" }}>
      <div style={{ textAlign: "center", marginBottom: 12 }}>
        <Eyebrow color={T.olive}>The pricing mechanic</Eyebrow>
      </div>
      <h2 style={{
        fontFamily: T.title, fontWeight: 700,
        fontSize: "clamp(34px, 5vw, 56px)", lineHeight: 0.98,
        letterSpacing: "-0.025em", textAlign: "center", margin: "0 auto 18px", maxWidth: 820,
      }}>
        The more who join, the better value exchange for all.
      </h2>
      <p style={{ textAlign: "center", maxWidth: 600, margin: "0 auto 48px", fontSize: 17, lineHeight: 1.55, color: "#555" }}>
        The host sets their revenue target. Add the flat Stretchy fee of NZD $20 + GST. Split across everyone who holds a spot. Fair, transparent, good for all.
      </p>

      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0,
        background: "#fff", borderRadius: 32, overflow: "hidden",
        border: "1.5px solid rgba(26,26,26,0.08)", boxShadow: "0 30px 60px rgba(26,26,26,0.06)",
      }} className="mechanic-grid">
        {/* controls */}
        <div style={{ padding: 36 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 28,
            fontFamily: T.mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em",
            background: T.olive, color: T.cream, padding: "6px 14px", borderRadius: 999,
          }}>● INTERACTIVE — DRAG IT</div>
          <RangeSlider label="HOST REVENUE TARGET" value={target} min={50} max={400} step={5}
            onChange={setTarget} minLabel="$50" maxLabel="$400" />
          <RangeSlider label="MINIMUM SPOTS TO GO AHEAD" value={minSpots} min={3} max={20}
            onChange={(v) => { setMinSpots(v); if (people < v) setPeople(v); }} minLabel="3" maxLabel="20" />
          <RangeSlider label="PEOPLE HOLDING A SPOT" value={people} min={3} max={50}
            onChange={setPeople} minLabel="3" maxLabel="50" />
        </div>

        {/* readout */}
        <div style={{
          padding: 36, background: confirmed ? T.olive : "#2A2A2A",
          color: T.cream, display: "flex", flexDirection: "column",
          transition: "background .3s ease",
        }}>
          <div style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", opacity: 0.8 }}>
            {confirmed ? "● GOING AHEAD" : `○ NEEDS ${minSpots - people} MORE TO CONFIRM`}
          </div>

          {/* formula chips */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "28px 0", fontFamily: T.mono, fontSize: 13 }}>
            <span style={{ background: T.yellow, color: T.black, padding: "6px 12px", borderRadius: 10, fontWeight: 700 }}>${target} target</span>
            <span style={{ opacity: 0.7, fontSize: 16 }}>+</span>
            <span style={{ background: "rgba(245,237,227,0.16)", padding: "6px 12px", borderRadius: 10, fontWeight: 700 }}>$20 + GST</span>
            <span style={{ opacity: 0.7, fontSize: 16 }}>÷</span>
            <span style={{ background: "rgba(245,237,227,0.16)", padding: "6px 12px", borderRadius: 10, fontWeight: 700 }}>{people} people</span>
          </div>

          <div style={{ marginTop: "auto" }}>
            <div style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", opacity: 0.8, marginBottom: 6 }}>EACH PERSON PAYS</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontFamily: T.mono, fontSize: 32, fontWeight: 700, color: T.yellow }}>$</span>
              <span style={{ fontFamily: T.display, fontSize: "clamp(72px, 9vw, 110px)", lineHeight: 0.82, color: T.yellow, letterSpacing: "-0.04em" }}>{perPerson}</span>
            </div>
            <p style={{ margin: "14px 0 0", fontSize: 13, lineHeight: 1.55, opacity: 0.9 }}>
              Started at <strong style={{ color: T.cream }}>${startPrice}</strong> at minimum. Host always earns <strong style={{ color: T.cream }}>${target}</strong>. Stretchy always gets a flat <strong style={{ color: T.cream }}>$20 + GST</strong>. Everyone else? The more who join, the better the value.
            </p>
          </div>
        </div>
      </div>
      <style>{`
        .stretchy-range { -webkit-appearance: none; appearance: none; }
        .stretchy-range::-webkit-slider-thumb { -webkit-appearance: none; width: 26px; height: 26px; border-radius: 999px; background: #F5EDE3; border: 3px solid #1A1A1A; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
        .stretchy-range::-moz-range-thumb { width: 26px; height: 26px; border-radius: 999px; background: #F5EDE3; border: 3px solid #1A1A1A; cursor: pointer; }
        @media (max-width: 860px) { .hero-grid { grid-template-columns: 1fr !important; } .hero-phones { display: none !important; } .mechanic-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

// ─── EYEBROW ──────────────────────────────────────────────────────────────────
function Eyebrow({ children, color = T.olive }: { children: React.ReactNode; color?: string }) {
  return (
    <div style={{
      fontFamily: T.mono, fontSize: 12, fontWeight: 700, letterSpacing: "0.22em",
      textTransform: "uppercase", color, marginBottom: 18,
      display: "inline-flex", alignItems: "center", gap: 10,
    }}>
      <span style={{ width: 22, height: 2, background: color, display: "inline-block" }} />
      {children}
    </div>
  );
}

// ─── HOW IT WORKS ─────────────────────────────────────────────────────────────
const STEPS = [
  ["A session is listed.", "A vetted local host sets a session — yoga, pilates, HIIT, sound bath, whatever. They set a target and a max capacity."],
  ["Hold your place.", "Find a session in your suburb. Tap to hold. No payment yet — your card is on file but nothing leaves your account."],
  ["The more who hold, the lower the price.", "Every new hold splits the total more ways. Price drops in real time. Tell your mates — you're literally saving each other money."],
  ["24 hours out — go or no go.", "If enough people held, it's confirmed and the price locks in. If not, all holds are released. Nothing charged."],
  ["Show up. Move. Social Stretch.", "Card is charged 2 hours before at the final price. Turn up, move with your people, then head to the Social Stretch nearby."],
];

function HowItWorks() {
  return (
    <div id="how" style={{ background: T.purple, color: T.cream }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "96px 24px" }}>
        <Eyebrow color={T.cream}>How it works</Eyebrow>
        <h2 style={{
          fontFamily: T.title, fontWeight: 700,
          fontSize: "clamp(34px, 5vw, 56px)", lineHeight: 0.98,
          letterSpacing: "-0.025em", margin: "0 0 48px", maxWidth: 700,
        }}>
          Five steps. That&apos;s it.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          {STEPS.map(([title, body], i) => (
            <div key={i} style={{
              background: i === 4 ? T.yellow : "#fff", color: T.black,
              borderRadius: 26, padding: 26,
              display: "flex", flexDirection: "column", gap: 12,
            }}>
              <div style={{ fontFamily: T.display, fontSize: 40, lineHeight: 0.85, color: i === 4 ? T.black : T.purple }}>
                0{i + 1}
              </div>
              <h3 style={{ fontFamily: T.title, fontWeight: 700, fontSize: 18, lineHeight: 1.1, letterSpacing: "-0.01em", margin: 0 }}>{title}</h3>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: "rgba(26,26,26,0.7)" }}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── FOR MOVERS ───────────────────────────────────────────────────────────────
function ForMovers() {
  return (
    <div id="movers" style={{ padding: "96px 0" }}>
      <Eyebrow color={T.olive}>For movers</Eyebrow>
      <h2 style={{
        fontFamily: T.title, fontWeight: 700,
        fontSize: "clamp(34px, 5vw, 56px)", lineHeight: 0.98,
        letterSpacing: "-0.025em", margin: "0 0 48px", maxWidth: 760,
      }}>
        Move more. Pay less.<br />Meet people.
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        {[
          ["💸", "The value exchange works for you", "The more who join, the better value everyone's session. The people you meet — or friends you bring — literally become the discount."],
          ["📍", "Local sessions, real venues", "Parks, studios, rooftops, community halls. Not a big chain. Vetted hosts, local to you."],
          ["🤝", "The Social Stretch", "Every session ends with an optional hang. Coffee, matcha, wine — whatever the vibe. The best bit."],
          ["🛡️", "You always know your max", "Hold with no charge upfront. Once the minimum holds, the price only drops from there. Your card is touched only when it's confirmed."],
        ].map(([icon, title, body]) => (
          <div key={title as string} style={{ background: "#fff", borderRadius: 26, padding: 28, border: "1.5px solid rgba(26,26,26,0.08)" }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, background: T.olive, color: T.cream,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 18,
            }}>{icon}</div>
            <h3 style={{ fontFamily: T.title, fontWeight: 700, fontSize: 19, letterSpacing: "-0.01em", margin: "0 0 10px" }}>{title}</h3>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, color: "#666" }}>{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── FOR HOSTS ────────────────────────────────────────────────────────────────
function ForHosts() {
  return (
    <div id="hosts" style={{ background: T.purple, color: T.cream }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "96px 24px" }}>
        <Eyebrow color={T.cream}>For hosts</Eyebrow>
        <h2 style={{
          fontFamily: T.title, fontWeight: 700,
          fontSize: "clamp(34px, 5vw, 56px)", lineHeight: 0.98,
          letterSpacing: "-0.025em", margin: "0 0 20px", maxWidth: 760,
        }}>
          Set your target.<br />We handle the rest.
        </h2>
        <p style={{ margin: "0 0 48px", fontSize: 18, lineHeight: 1.55, maxWidth: 560, opacity: 0.9 }}>
          You set your target. Stretchy handles pricing, payments, notifications and payouts. You just run a great session.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {[
            ["🎯", "Earn your target", "Set your revenue goal and the minimum attendees needed. You know what you're earning before you host."],
            ["🧾", "Transparent formula", "(Target + $20 + GST fee) ÷ people = per-person price. Shown to you and your attendees."],
            ["🔐", "Vetted once, active 6 months", "One application, one vetting. Run as many sessions as you like. Change your schedule any time."],
            ["🤙", "Be part of a movement", "Expand your community and impact. We list your classes to everyone in the area."],
            ["🥂", "Host a Social Stretch", "The juicy bit after. Banter, community, new and old friends. Hosted by you."],
            ["❤️", "Fundraising sessions", "Your target could be a charity target. We lower our fee for fundraisers. Move for a cause."],
          ].map(([icon, title, body]) => (
            <div key={title as string} style={{ background: "rgba(245,237,227,0.08)", borderRadius: 26, padding: 28, border: "1px solid rgba(245,237,227,0.14)" }}>
              <div style={{ fontSize: 28, marginBottom: 14 }}>{icon}</div>
              <h3 style={{ fontFamily: T.title, fontWeight: 700, fontSize: 19, letterSpacing: "-0.01em", margin: "0 0 8px" }}>{title}</h3>
              <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.55, opacity: 0.82 }}>{body}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 36 }}>
          <Link href="/host/apply" style={{
            padding: "16px 28px", borderRadius: 999, background: T.yellow,
            color: T.black, fontFamily: T.title, fontSize: 16, fontWeight: 700,
            textDecoration: "none", display: "inline-block",
          }}>Apply to be a host →</Link>
        </div>
      </div>
    </div>
  );
}

// ─── STORY ────────────────────────────────────────────────────────────────────
function Story() {
  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "96px 24px" }}>
      <div style={{ maxWidth: 760 }}>
        <Eyebrow color={T.olive}>The backstory</Eyebrow>
        <h2 style={{
          fontFamily: T.title, fontWeight: 700,
          fontSize: "clamp(32px, 4.5vw, 50px)", lineHeight: 1.0,
          letterSpacing: "-0.025em", margin: "0 0 28px",
        }}>
          Started with yoga.<br />Became something bigger.
        </h2>
        <div style={{ fontSize: 17, lineHeight: 1.65, color: "#444", display: "flex", flexDirection: "column", gap: 18 }}>
          <p style={{ margin: 0 }}>Stretchy started as a social yoga community in Auckland in 2024 — taking the run-club idea and applying it to yoga, to stretch bodies, minds and social circles. Weekly all-level classes followed by a &ldquo;social stretch&rdquo; — coffees, matchas, wine, beer, banter.</p>
          <p style={{ margin: 0 }}>Stretchy 1.0 was well loved but labour intensive. Some sessions barely broke even, others earned hundreds. There had to be a better, fairer way to move together — for all.</p>
          <p style={{ margin: 0 }}>Now Stretchy is evolving into a community movement platform. Yoga is one format. The model works for anything — pilates, HIIT, breathwork, sound baths, run clubs, dance. If people want to do it together, and the economics should reward group effort, Stretchy is the infrastructure.</p>
        </div>
        <p style={{ fontFamily: T.title, fontWeight: 700, fontSize: 22, letterSpacing: "-0.01em", margin: "32px 0 0", color: T.olive }}>
          Stretching bodies, minds and social circles.
        </p>
      </div>
    </div>
  );
}

// ─── WAITLIST ─────────────────────────────────────────────────────────────────
function Waitlist() {
  const [role, setRole] = useState<WaitlistRole>("move");
  const [email, setEmail] = useState("");
  const [suburb, setSuburb] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!email.trim()) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: email.split("@")[0], email: email.trim(), city: suburb || "Not specified", role }),
      });
      if (!res.ok) throw new Error("Failed");
      setDone(true);
    } catch {
      setError("Something went wrong. Email kimberley@stretchyyoga.co.nz");
    } finally { setLoading(false); }
  }

  return (
    <div id="waitlist" style={{ background: T.yellow, color: T.black }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "96px 24px", textAlign: "center" }}>
        <span style={{ color: T.black }}><SMark size={72} /></span>
        <div style={{ marginTop: 22, marginBottom: 12 }}>
          <Eyebrow color={T.black}>Get early access</Eyebrow>
        </div>
        <h2 style={{
          fontFamily: T.title, fontWeight: 700,
          fontSize: "clamp(36px, 6vw, 60px)", lineHeight: 0.95,
          letterSpacing: "-0.03em", margin: "0 auto 18px",
        }}>
          Move together.<br />Pay less.<br />Better value for all.
        </h2>
        <p style={{ margin: "0 auto 40px", fontSize: 18, lineHeight: 1.5, maxWidth: 540 }}>
          Auckland goes live Q3 2026 — more cities coming. Tell us where you are and you&apos;ll be first to know. The highlight of your week, every week.
        </p>

        {done ? (
          <div style={{ background: T.black, color: T.cream, borderRadius: 28, padding: 40 }}>
            <div style={{ marginBottom: 18 }}><span style={{ color: T.yellow }}><SMark size={64} /></span></div>
            <h3 style={{ fontFamily: T.title, fontWeight: 700, fontSize: 28, margin: "0 0 10px", letterSpacing: "-0.02em" }}>You&apos;re on the list.</h3>
            <p style={{ margin: 0, fontSize: 16, opacity: 0.85, lineHeight: 1.5 }}>
              We&apos;ll be in touch as {role === "host" ? "a host" : role === "both" ? "a host & mover" : "a mover"}{suburb ? ` in ${suburb}` : ""}. Tell a mate — the more who join, the better it gets.
            </p>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 28, padding: 32, textAlign: "left", boxShadow: "0 30px 60px rgba(26,26,26,0.10)" }}>
            <div style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", color: "#666", marginBottom: 12 }}>I WANT TO</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
              {([["move", "Move 🧘"], ["host", "Host 🎯"], ["both", "Both 🤙"]] as [WaitlistRole, string][]).map(([key, label]) => (
                <button key={key} onClick={() => setRole(key)} style={{
                  flex: 1, padding: "14px", borderRadius: 16, cursor: "pointer",
                  border: role === key ? "none" : "1.5px solid rgba(26,26,26,0.16)",
                  background: role === key ? T.black : "transparent",
                  color: role === key ? T.cream : T.black,
                  fontFamily: T.title, fontSize: 15, fontWeight: 700,
                }}>{label}</button>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.co.nz" type="email" style={inputStyle} />
              <input value={suburb} onChange={(e) => setSuburb(e.target.value)}
                placeholder="Your suburb or city" style={inputStyle} />
              {error && <p style={{ margin: 0, fontSize: 13, color: "#E63946", textAlign: "center" }}>{error}</p>}
              <button onClick={submit} disabled={loading} style={{
                width: "100%", padding: "16px", borderRadius: 999,
                background: T.black, color: T.yellow,
                fontFamily: T.title, fontSize: 16, fontWeight: 700,
                border: "none", cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1, marginTop: 6,
              }}>{loading ? "Sending…" : "Put me on the list →"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
const inputStyle: React.CSSProperties = {
  width: "100%", padding: "15px 18px", borderRadius: 14,
  border: "1.5px solid rgba(26,26,26,0.16)", background: "#FFF8F4",
  fontFamily: T.title, fontSize: 16, color: T.black, outline: "none",
  boxSizing: "border-box",
};

// ─── FINAL CTA ────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <div style={{ background: T.olive, color: T.cream, textAlign: "center" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "96px 24px" }}>
        <div style={{ marginBottom: 28 }}><span style={{ color: T.cream }}><SMark size={88} /></span></div>
        <h2 style={{
          fontFamily: T.title, fontWeight: 700,
          fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 0.95,
          letterSpacing: "-0.03em", margin: "0 auto 22px", maxWidth: 720,
        }}>
          Move together. Pay less.<br />Meet people.
        </h2>
        <p style={{ fontSize: 19, opacity: 0.9, margin: "0 auto 34px" }}>The highlight of your week, every week.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <a href="#waitlist" style={{
            padding: "16px 28px", borderRadius: 999, background: T.yellow,
            color: T.black, fontFamily: T.title, fontSize: 16, fontWeight: 700, textDecoration: "none",
          }}>Join the waitlist →</a>
          <Link href="/home" style={{
            padding: "16px 28px", borderRadius: 999,
            border: "2px solid rgba(245,237,227,0.5)", color: T.cream,
            fontFamily: T.title, fontSize: 16, fontWeight: 700, textDecoration: "none",
          }}>Explore the app</Link>
        </div>
      </div>
    </div>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <div style={{ background: T.yellow, color: T.black }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "56px 24px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 32 }}>
        <div style={{ maxWidth: 300 }}>
          <div style={{ marginBottom: 12 }}><span style={{ color: T.black }}><SMark size={30} /></span></div>
          <p style={{ margin: "0 0 14px", fontSize: 14, opacity: 0.7, lineHeight: 1.5 }}>A social movement. Built in Aotearoa 🌿</p>
          <a href="mailto:kimberley@stretchyyoga.co.nz" style={{ fontFamily: T.mono, fontSize: 13, letterSpacing: "0.04em", color: T.black, textDecoration: "none", opacity: 0.8 }}>
            kimberley@stretchyyoga.co.nz
          </a>
        </div>
        <div style={{ display: "flex", gap: 40, flexWrap: "wrap", fontSize: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", opacity: 0.5, marginBottom: 2 }}>EXPLORE</div>
            <a href="#how" style={footLink}>How it works</a>
            <Link href="/home" style={footLink}>Explore the app</Link>
            <a href="#hosts" style={footLink}>For hosts</a>
            <a href="#waitlist" style={footLink}>Join waitlist</a>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", opacity: 0.5, marginBottom: 2 }}>FOLLOW THE BUILD</div>
            <a href="https://www.caike.club/" target="_blank" rel="noopener noreferrer" style={footLink}>caike.club ↗</a>
            <a href="https://www.instagram.com/caike.club/" target="_blank" rel="noopener noreferrer" style={footLink}>@caike.club ↗</a>
            <a href="https://instagram.com/stretchy.yoga" target="_blank" rel="noopener noreferrer" style={footLink}>@stretchy.yoga ↗</a>
            <a href="https://instagram.com/stretchy.social" target="_blank" rel="noopener noreferrer" style={footLink}>@stretchy.social ↗</a>
          </div>
        </div>
      </div>
      <div style={{ borderTop: "1px solid rgba(26,26,26,0.15)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 24px", display: "flex", justifyContent: "space-between", fontFamily: T.mono, fontSize: 11, letterSpacing: "0.10em", color: "rgba(26,26,26,0.6)", flexWrap: "wrap", gap: 12 }}>
          <span>© 2026 STRETCHY · AOTEAROA NEW ZEALAND</span>
          <span>MOVE TOGETHER · BETTER VALUE FOR ALL</span>
        </div>
      </div>
    </div>
  );
}
const footLink: React.CSSProperties = { color: T.black, opacity: 0.7, textDecoration: "none" };

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div style={{ background: T.cream, fontFamily: T.title }}>
      <Nav />
      <Hero />
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px" }}>
        <PricingMechanic />
      </div>
      <HowItWorks />
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px" }}>
        <ForMovers />
      </div>
      <ForHosts />
      <div style={{ background: T.cream }}>
        <Story />
      </div>
      <Waitlist />
      <FinalCTA />
      <Footer />
    </div>
  );
}
