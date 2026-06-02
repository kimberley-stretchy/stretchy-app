"use client";

import { useState } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type WaitlistRole = "mover" | "host" | "both";

// ─── FAQ DATA ─────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "What is a hold — am I charged straight away?",
    a: "Nope. A hold is like saving your seat with no money down. Your card is on file but nothing leaves your account until the session is locked in — 2 hours before it starts.",
  },
  {
    q: "When does my card actually get charged?",
    a: "2 hours before the session starts. That's lock-in time. The final price is whatever the live price is at that moment — it can only go down from when you held your place.",
  },
  {
    q: "How does the price actually drop?",
    a: "Every session has a host target (what the host needs to earn) and a Stretchy fee ($20 + GST). That total is split equally across everyone who holds a place. More people = smaller share = lower price. Simple maths, shared fairly.",
  },
  {
    q: "What's the most I'll ever pay?",
    a: "The starting price shown when you hold. That's the ceiling. It can only go down as more people join. You'll never pay more than what you saw when you committed.",
  },
  {
    q: "What if the minimum number of people isn't met?",
    a: "The session doesn't go ahead and you pay nothing. Your hold is released, your card is never charged. No stress.",
  },
  {
    q: "Can I cancel my hold?",
    a: "Yes — up to 24 hours before the session. After that the session is heading into lock-in and cancellations affect everyone's price, so holds are locked from that point.",
  },
  {
    q: "What is a Social Stretch?",
    a: "The bit after the session — coffee, matcha, beers, wine, whatever. The host picks a spot nearby, you follow along if you're keen. No obligation, no pressure. Just the most underrated part of any class.",
  },
  {
    q: "How do I become a host?",
    a: "Apply in the app. We vet you once (experience, vibe, safety) and you're approved for 6 months. Then you set your sessions, set your target, and Stretchy handles everything else — pricing, payments, notifications.",
  },
  {
    q: "Does Stretchy take a percentage of what I earn?",
    a: "No. Hosts set their target and always get exactly that. Stretchy adds a flat $20 + GST fee on top of your target. Attendees pay it, not you. You always know exactly what you'll earn before the session even runs.",
  },
  {
    q: "Where is Stretchy available?",
    a: "Auckland, New Zealand right now. We're building city by city. Sign up below and tell us where you are — you'll be first to know when we head your way.",
  },
];

// ─── PRICING VISUALISER ────────────────────────────────────────────────────────
function PricingVisualiser() {
  const [spots, setSpots] = useState(8);
  const TARGET = 200;
  const FEE = 23;
  const MIN = 8;
  const MAX = 20;
  const price = Math.round(((TARGET + FEE) / spots) * 10) / 10;
  const startPrice = Math.round(((TARGET + FEE) / MIN) * 10) / 10;

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl max-w-md mx-auto">
      <div className="flex items-center justify-between mb-1">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#9A9590]">Live price calculator</p>
        <span className="text-xs bg-[#E8F3FF] text-[#2C8FE0] font-bold px-2 py-0.5 rounded-full">Try it</span>
      </div>
      <div className="my-4 flex items-center gap-2 flex-wrap">
        <div className="bg-[#FFD166] rounded-full px-3 py-1.5 text-xs font-bold text-[#1A1A1A]">Host target $200</div>
        <span className="text-[#9A9590] font-bold">+</span>
        <div className="bg-[#F5EDE3] rounded-full px-3 py-1.5 text-xs font-bold text-[#1A1A1A]">Stretchy fee $23</div>
        <span className="text-[#9A9590] font-bold">÷</span>
        <div className="bg-[#E8F3FF] text-[#2C8FE0] rounded-full px-3 py-1.5 text-xs font-bold">{spots} people</div>
        <span className="text-[#9A9590] font-bold">=</span>
        <div className="bg-[#1A1A1A] text-white rounded-full px-3 py-1.5 text-sm font-black">${price.toFixed(0)} each</div>
      </div>
      <div className="mb-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-[#9A9590]">Drag to add people</span>
          <span className="text-sm font-bold text-[#1A1A1A]">{spots} people joining</span>
        </div>
        <input type="range" min={MIN} max={MAX} value={spots} onChange={(e) => setSpots(parseInt(e.target.value))} className="w-full accent-[#2C8FE0] cursor-pointer" />
        <div className="flex justify-between text-xs text-[#9A9590] mt-1">
          <span>Minimum ({MIN})</span>
          <span>Full room ({MAX})</span>
        </div>
      </div>
      {spots > MIN ? (
        <div className="mt-3 bg-[#F0FFF6] rounded-xl px-4 py-2.5 flex items-center justify-between">
          <p className="text-sm text-[#2D6A4A] font-medium">Each person saves</p>
          <p className="text-lg font-black text-[#2D6A4A]">${(startPrice - price).toFixed(0)}</p>
        </div>
      ) : (
        <div className="mt-3 bg-[#FFF4E6] rounded-xl px-4 py-2.5">
          <p className="text-xs text-[#CC5500] font-medium">← Add more people to see the price drop</p>
        </div>
      )}
      <p className="text-center text-xs text-[#9A9590] mt-3 leading-relaxed">
        The host always earns their $200 target. Stretchy always gets $23.<br />
        <strong className="text-[#1A1A1A]">The more who join, the less everyone pays.</strong>
      </p>
    </div>
  );
}

// ─── FAQ ITEM ─────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button onClick={() => setOpen(!open)} className="w-full text-left border-b border-[#E0D9D0] py-4">
      <div className="flex items-start justify-between gap-4">
        <span className="font-semibold text-[#1A1A1A] text-sm leading-snug text-left">{q}</span>
        <span className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-[#D4CFC9] flex items-center justify-center text-[#9A9590] transition-transform duration-200 mt-0.5"
          style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}>+</span>
      </div>
      {open && <p className="mt-3 text-sm text-[#6B6B6B] leading-relaxed pr-8 text-left">{a}</p>}
    </button>
  );
}

// ─── WAITLIST FORM ─────────────────────────────────────────────────────────────
function WaitlistForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [role, setRole] = useState<WaitlistRole>("mover");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !city) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, city, role }),
      });
      if (!res.ok) throw new Error("Failed");
      setSent(true);
    } catch {
      setError("Something went wrong. Try again or email kimberley@stretchyyoga.co.nz");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center py-10">
        <p className="text-5xl mb-4">🌏</p>
        <h3 className="font-bold text-2xl text-white mb-2" style={{ letterSpacing: "-0.02em" }}>You&apos;re in.</h3>
        <p className="text-white/70 leading-relaxed">{city} noted. You&apos;ll be first to know.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 max-w-md mx-auto">
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required
        className="w-full px-5 py-4 rounded-full border-2 border-white/20 bg-white/10 text-white placeholder-white/50 focus:outline-none focus:border-white text-base transition-colors" />
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required
        className="w-full px-5 py-4 rounded-full border-2 border-white/20 bg-white/10 text-white placeholder-white/50 focus:outline-none focus:border-white text-base transition-colors" />
      <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Your city or suburb" required
        className="w-full px-5 py-4 rounded-full border-2 border-white/20 bg-white/10 text-white placeholder-white/50 focus:outline-none focus:border-white text-base transition-colors" />
      <div>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-white/50 mb-2 pl-1">I want to</p>
        <div className="flex gap-2">
          {([
            { v: "mover", l: "Move 🧘" },
            { v: "host",  l: "Host 🎯" },
            { v: "both",  l: "Both 🤙" },
          ] as { v: WaitlistRole; l: string }[]).map(({ v, l }) => (
            <button key={v} type="button" onClick={() => setRole(v)}
              className="flex-1 py-3 rounded-full border-2 text-sm font-semibold transition-all"
              style={{ backgroundColor: role === v ? "#FFD166" : "transparent", borderColor: role === v ? "#FFD166" : "rgba(255,255,255,0.3)", color: role === v ? "#1A1A1A" : "white" }}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-red-200 text-sm text-center">{error}</p>}
      <button type="submit" disabled={loading} className="w-full py-4 rounded-full font-bold text-base transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
        style={{ backgroundColor: "#FFD166", color: "#1A1A1A" }}>
        {loading ? "Sending…" : "Put me on the list →"}
      </button>
    </form>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "#F5EDE3" }}>

      {/* NAV — olive hero bg */}
      <nav style={{ backgroundColor: "#7A8330" }} className="px-5 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-cream" aria-label="Stretchy home">
            <SMark size={32} />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/sessions" className="text-sm font-semibold text-white/70 hover:text-white transition-colors hidden sm:block">Browse sessions</Link>
            <Link href="/login" className="text-sm font-semibold px-4 py-2 rounded-full border-2 border-white/40 text-white hover:bg-white hover:text-[#7A8330] transition-all">Log in</Link>
          </div>
        </div>
      </nav>

      {/* HERO — olive */}
      <section style={{ backgroundColor: "#7A8330" }} className="px-5 pt-10 pb-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-block font-mono text-xs font-bold uppercase tracking-widest mb-6 px-4 py-1.5 rounded-full"
            style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)" }}>
            Auckland, New Zealand · Est. 2026
          </div>
          <h1 className="font-bold text-white mb-6 leading-none"
            style={{ fontSize: "clamp(52px, 14vw, 88px)", letterSpacing: "-0.04em", lineHeight: "0.9" }}>
            A social<br />movement.
          </h1>
          <p className="text-white/80 text-xl leading-relaxed mb-10 max-w-lg mx-auto">
            Community movement classes where <strong className="text-white">the price drops as more people join.</strong> The more who move together, the better value for everyone.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="#waitlist" className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-base transition-all hover:brightness-110 active:scale-[0.98] text-center"
              style={{ backgroundColor: "#FFD166", color: "#1A1A1A" }}>
              Join the waitlist →
            </a>
            <Link href="/sessions" className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-base text-white border-2 border-white/40 hover:border-white transition-all text-center">
              Explore the app
            </Link>
          </div>
        </div>
      </section>

      {/* ONE SENTENCE */}
      <section className="max-w-2xl mx-auto px-5 py-16 text-center">
        <p className="font-bold text-[#1A1A1A] leading-tight" style={{ fontSize: "clamp(22px, 5vw, 36px)", letterSpacing: "-0.03em" }}>
          Yoga, pilates, HIIT, breathwork, run clubs —<br className="hidden sm:block" />
          <span style={{ color: "#7A8330" }}> with a pricing model that rewards community.</span>
        </p>
      </section>

      {/* PRICING MECHANIC — blue */}
      <section className="px-5 py-16" style={{ backgroundColor: "#2C8FE0" }}>
        <div className="max-w-2xl mx-auto">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-white/60 mb-3 text-center">The pricing mechanic</p>
          <h2 className="font-bold text-white text-center mb-4 leading-tight"
            style={{ fontSize: "clamp(30px, 7vw, 50px)", letterSpacing: "-0.03em" }}>
            The more who join,<br />the less you pay.
          </h2>
          <p className="text-white/70 text-center mb-10 max-w-lg mx-auto">
            Every session has a host target and a flat Stretchy fee. Split that across everyone who shows up. It&apos;s just maths — fair, transparent, and kind of obvious in hindsight.
          </p>
          <PricingVisualiser />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-2xl mx-auto px-5 py-20">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#9A9590] mb-3">How it works</p>
        <h2 className="font-bold text-[#1A1A1A] mb-12 leading-tight" style={{ fontSize: "clamp(28px, 7vw, 44px)", letterSpacing: "-0.03em" }}>
          Five steps.<br />That&apos;s it.
        </h2>
        <div className="space-y-8">
          {[
            { n: "01", t: "A session is listed.", d: "A vetted local host sets a session — yoga, pilates, HIIT, sound bath, whatever. They set a target (what they need to earn) and a max capacity.", col: "#2C8FE0" },
            { n: "02", t: "Hold your place.", d: "Find a session in your suburb that fits your week. Tap to hold. No charge yet — your card is on file but nothing leaves your account.", col: "#FFD166" },
            { n: "03", t: "The more who hold, the lower the price.", d: "Every new hold splits the total more ways. Price drops in real time. Tell your mates — you're literally saving each other money.", col: "#A535C7" },
            { n: "04", t: "24 hours out — go or no go.", d: "If enough people have held, it's confirmed and the price locks in. If not, everyone's holds are released. Nothing charged.", col: "#4CAF82" },
            { n: "05", t: "Show up. Move. Social Stretch.", d: "Your card is charged 2 hours before at the final locked price. Turn up, move with your people, then head to the Social Stretch — coffee, drinks, or whatever the host has organised nearby.", col: "#FF6B35" },
          ].map((step) => (
            <div key={step.n} className="flex gap-5">
              <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-mono font-black text-sm"
                style={{ backgroundColor: step.col, color: step.col === "#FFD166" ? "#1A1A1A" : "#fff" }}>
                {step.n}
              </div>
              <div>
                <h3 className="font-bold text-[#1A1A1A] text-lg mb-1 leading-snug">{step.t}</h3>
                <p className="text-[#6B6B6B] text-sm leading-relaxed">{step.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOR MOVERS */}
      <section style={{ backgroundColor: "#FFD166" }} className="px-5 py-20">
        <div className="max-w-2xl mx-auto">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#1A1A1A]/50 mb-3">For movers</p>
          <h2 className="font-bold text-[#1A1A1A] mb-8 leading-tight" style={{ fontSize: "clamp(30px, 7vw, 48px)", letterSpacing: "-0.03em" }}>
            Move more.<br />Pay less.<br />Meet people.
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { e: "💸", t: "The price works for you", d: "The more your friends join, the cheaper everyone's session. Your friend group is literally a discount." },
              { e: "📍", t: "Local sessions, real venues", d: "Parks, studios, rooftops, community halls. Not a big chain. Vetted hosts, local to you." },
              { e: "🤝", t: "The Social Stretch", d: "Every session ends with an optional hang. Coffee, matcha, wine — whatever fits the vibe. The best bit." },
              { e: "🛡️", t: "Zero commitment until lock-in", d: "Hold your place, change your mind anytime up to 24 hours before. Your card never gets touched until you're confirmed." },
              { e: "📲", t: "No app download needed", d: "Works in your browser. No monthly fee. You only pay when you actually go." },
              { e: "🌿", t: "Wellness without the perfection", d: "No aspirational bullshit. Just good movement, real people, fair prices." },
            ].map((b) => (
              <div key={b.t} className="bg-white/50 rounded-2xl p-5">
                <p className="text-2xl mb-2">{b.e}</p>
                <h3 className="font-bold text-[#1A1A1A] mb-1">{b.t}</h3>
                <p className="text-sm text-[#1A1A1A]/70 leading-relaxed">{b.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOR HOSTS */}
      <section style={{ backgroundColor: "#A535C7" }} className="px-5 py-20">
        <div className="max-w-2xl mx-auto">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-white/50 mb-3">For hosts</p>
          <h2 className="font-bold text-white mb-4 leading-tight" style={{ fontSize: "clamp(30px, 7vw, 48px)", letterSpacing: "-0.03em" }}>
            Set your target.<br />We handle the rest.
          </h2>
          <p className="text-white/70 mb-10 text-lg max-w-lg">
            You decide what you need to earn. Stretchy adds a flat fee on top. The platform handles pricing, payments, notifications and payouts. You just run a great session.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { e: "🎯", t: "You always earn your target", d: "Set $200. You get $200. No percentage taken. You know what you'll earn before a single hold comes in." },
              { e: "📊", t: "No platform percentage", d: "Just a flat $20 + GST Stretchy fee added on top. Attendees pay it, not you." },
              { e: "🧾", t: "Transparent pricing formula", d: "(Your target + $23) ÷ number of people = per-person price. Shown to you and your attendees." },
              { e: "🔐", t: "Vetted once, active for 6 months", d: "One application, one vetting. Run as many sessions as you like. Change your schedule any time." },
              { e: "💰", t: "Monday payouts", d: "Stripe Connect straight to your account every Monday. Full breakdown in the app." },
              { e: "🤙", t: "Your community, your rules", d: "Your target, your neighbourhood, your format, your Social Stretch spot. Stretchy is the infrastructure." },
            ].map((b) => (
              <div key={b.t} className="bg-white/10 rounded-2xl p-5">
                <p className="text-2xl mb-2">{b.e}</p>
                <h3 className="font-bold text-white mb-1">{b.t}</h3>
                <p className="text-sm text-white/70 leading-relaxed">{b.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/host/apply" className="inline-block px-8 py-4 rounded-full font-bold text-base transition-all hover:brightness-110 active:scale-[0.98]"
              style={{ backgroundColor: "#FFD166", color: "#1A1A1A" }}>
              Apply to be a host →
            </Link>
          </div>
        </div>
      </section>

      {/* WAITLIST */}
      <section id="waitlist" className="px-5 py-20" style={{ backgroundColor: "#7A8330" }}>
        <div className="max-w-md mx-auto text-center">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-white/60 mb-3">Get early access</p>
          <h2 className="font-bold text-white mb-4 leading-tight" style={{ fontSize: "clamp(30px, 7vw, 48px)", letterSpacing: "-0.03em" }}>
            Be first in<br />your area.
          </h2>
          <p className="text-white/70 mb-10 max-w-sm mx-auto leading-relaxed">
            Auckland is live. More cities coming. Tell us where you are and we&apos;ll let you know when Stretchy heads your way.
          </p>
          <WaitlistForm />
        </div>
      </section>

      {/* THE STORY — bottom of page */}
      <section className="max-w-2xl mx-auto px-5 py-20">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#9A9590] mb-3">The story</p>
        <h2 className="font-bold text-[#1A1A1A] mb-6 leading-tight" style={{ fontSize: "clamp(26px, 6vw, 38px)", letterSpacing: "-0.03em" }}>
          Started with yoga.<br />Became something bigger.
        </h2>
        <div className="space-y-4 text-sm text-[#6B6B6B] leading-relaxed max-w-xl">
          <p>
            Stretchy started as a social yoga community in Auckland in 2024. With the ambition of taking the concept of a run club, applying it to yoga to stretch bodies, minds &amp; social circles. Weekly all-level yoga classes followed by a &ldquo;social stretch&rdquo; (aka. coffees, matchas, wine, beer, banter).
          </p>
          <p>
            Stretchy 1.0 was well loved but labour intensive. Some sessions barely breaking even, others earning hundreds. So there had to be a better &amp; fairer way to move together, for all.
          </p>
          <p>
            Stretchy is evolving into a community movement platform. Yoga is one format. But the model works for anything — pilates, HIIT, breathwork, sound baths, run clubs, dance. If people want to do it together and the economics should reward group effort, Stretchy is the infrastructure. Vetted teachers and hosts have more flexibility to create their own sessions, their way, in their local communities.
          </p>
          <p className="text-[#1A1A1A] font-semibold">Stretching bodies, minds and social circles.</p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ backgroundColor: "#FFD166" }} className="px-5 py-20 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="font-bold text-[#1A1A1A] mb-4 leading-tight"
            style={{ fontSize: "clamp(34px, 9vw, 60px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}>
            Move together.<br />Pay less.<br />Meet people.
          </h2>
          <p className="text-[#1A1A1A]/70 text-lg mb-10 max-w-md mx-auto">The highlight of your week, every week.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="#waitlist" className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-base transition-all hover:brightness-95 active:scale-[0.98] text-center"
              style={{ backgroundColor: "#1A1A1A", color: "#F5EDE3" }}>
              Join the waitlist →
            </a>
            <Link href="/sessions" className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-base border-2 border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-[#F5EDE3] transition-all text-center">
              Explore the app
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="max-w-2xl mx-auto px-5 py-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-t border-[#E0D9D0] pt-8">
          <div>
            <p className="font-bold text-[#1A1A1A] mb-1">STRETCHY</p>
            <p className="text-xs text-[#9A9590]">A social movement. Built in Aotearoa 🌿</p>
          </div>
          <div className="flex items-center gap-5 flex-wrap">
            <a href="https://instagram.com/stretchy.yoga" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors">Instagram</a>
            <a href="https://tiktok.com/@stretchy.yoga" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors">TikTok</a>
            <a href="mailto:kimberley@stretchyyoga.co.nz" className="text-sm font-semibold text-[#6B6B6B] hover:text-[#1A1A1A] transition-colors">kimberley@stretchyyoga.co.nz</a>
          </div>
        </div>
        <div className="flex gap-5 mt-4 flex-wrap">
          <Link href="/terms" className="text-xs text-[#9A9590] hover:text-[#6B6B6B] transition-colors">Terms</Link>
          <Link href="/privacy" className="text-xs text-[#9A9590] hover:text-[#6B6B6B] transition-colors">Privacy</Link>
          <Link href="/profile/help" className="text-xs text-[#9A9590] hover:text-[#6B6B6B] transition-colors">Help</Link>
          <Link href="/admin" className="text-xs text-[#9A9590] hover:text-[#6B6B6B] transition-colors">Stretchy HQ</Link>
        </div>
      </footer>

    </main>
  );
}
