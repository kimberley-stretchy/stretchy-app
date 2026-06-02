"use client";

import { useState } from "react";
import Link from "next/link";

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
        <div className="bg-[#1A1A1A] text-white rounded-full px-3 py-1.5 text-sm font-black">
          ${price.toFixed(0)} each
        </div>
      </div>

      <div className="mb-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-[#9A9590]">Drag to add people</span>
          <span className="text-sm font-bold text-[#1A1A1A]">{spots} people joining</span>
        </div>
        <input
          type="range"
          min={MIN}
          max={MAX}
          value={spots}
          onChange={(e) => setSpots(parseInt(e.target.value))}
          className="w-full accent-[#2C8FE0] cursor-pointer"
        />
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
    <button
      onClick={() => setOpen(!open)}
      className="w-full text-left border-b border-[#E0D9D0] py-4"
    >
      <div className="flex items-start justify-between gap-4">
        <span className="font-semibold text-[#1A1A1A] text-sm leading-snug text-left">{q}</span>
        <span
          className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-[#D4CFC9] flex items-center justify-center text-[#9A9590] transition-transform duration-200 mt-0.5"
          style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
        >
          +
        </span>
      </div>
      {open && (
        <p className="mt-3 text-sm text-[#6B6B6B] leading-relaxed pr-8 text-left">{a}</p>
      )}
    </button>
  );
}

// ─── PHONE MOCKUP ─────────────────────────────────────────────────────────────
function PhoneHome() {
  return (
    <div className="flex-shrink-0 w-40">
      <div className="rounded-[24px] overflow-hidden border-4 border-[#1A1A1A] shadow-2xl" style={{ backgroundColor: "#2C8FE0", minHeight: "300px" }}>
        <div className="px-3 pt-3 pb-2">
          <p className="text-[7px] text-white/60 font-mono mb-2">9:41 — Auckland</p>
          <p className="text-white font-black text-lg leading-tight mb-1">A social<br />movement.</p>
          <p className="text-white/60 text-[7px] mb-3">The more who join, the better value.</p>
          <div className="space-y-1.5">
            <div className="bg-white/20 rounded-lg px-2 py-1.5 flex justify-between"><span className="text-white text-[8px] font-semibold">See this week</span><span className="text-white text-[8px]">→</span></div>
            <div className="bg-[#FFD166] rounded-lg px-2 py-1.5 flex justify-between"><span className="text-[#1A1A1A] text-[8px] font-semibold">Host a Stretchy</span><span className="text-[8px]">→</span></div>
          </div>
          <div className="mt-3 bg-[#FFD166] rounded-xl p-2">
            <p className="text-[#1A1A1A] text-[8px] font-bold leading-tight">The more who join,<br />the less you pay.</p>
          </div>
        </div>
      </div>
      <p className="text-center text-[9px] font-mono font-bold uppercase tracking-widest mt-2 text-[#9A9590]">Home</p>
    </div>
  );
}

function PhoneSession() {
  return (
    <div className="flex-shrink-0 w-40">
      <div className="rounded-[24px] overflow-hidden border-4 border-[#1A1A1A] shadow-2xl" style={{ backgroundColor: "#F5EDE3", minHeight: "300px" }}>
        <div className="px-3 pt-3 pb-2">
          <p className="text-[7px] text-[#9A9590] mb-1">Sun · 9:00 AM · 60 min</p>
          <p className="font-black text-[#1A1A1A] text-base leading-tight mb-0.5">Sunday Slow<br />Flow</p>
          <p className="text-[7px] text-[#9A9590] mb-2">Tāne Ratima · Grey Lynn</p>
          <div className="bg-[#FFD166] rounded-xl p-2 mb-2">
            <div className="flex items-baseline gap-1">
              <span className="text-[#1A1A1A] font-black text-2xl leading-none">$28</span>
              <span className="text-[6px] text-[#1A1A1A]/60 font-mono uppercase">Starting</span>
            </div>
            <p className="text-[6px] text-[#1A1A1A]/70 mt-0.5">Price drops as the room fills.</p>
          </div>
          <div className="bg-[#1A1A1A] rounded-lg py-1.5 text-center">
            <span className="text-white text-[8px] font-semibold">Hold my place →</span>
          </div>
        </div>
      </div>
      <p className="text-center text-[9px] font-mono font-bold uppercase tracking-widest mt-2 text-[#9A9590]">Session detail</p>
    </div>
  );
}

function PhoneHeld() {
  return (
    <div className="flex-shrink-0 w-40">
      <div className="rounded-[24px] overflow-hidden border-4 border-[#1A1A1A] shadow-2xl" style={{ backgroundColor: "#F5EDE3", minHeight: "300px" }}>
        <div className="px-3 pt-3 pb-2">
          <p className="text-[7px] text-[#9A9590] font-mono uppercase mb-1">Receipt</p>
          <div className="bg-[#FFD166] rounded-xl p-3 mb-2">
            <p className="text-[6px] text-[#1A1A1A]/60 font-mono uppercase mb-1">● Holding</p>
            <p className="text-[#1A1A1A] font-black text-lg leading-tight">Place<br />held.</p>
            <div className="flex items-baseline gap-0.5 mt-1">
              <span className="text-xs font-bold text-[#1A1A1A]">$</span>
              <span className="text-2xl font-black text-[#1A1A1A] leading-none">28</span>
            </div>
          </div>
          <p className="text-[6px] text-[#9A9590] text-center leading-relaxed mb-2">No charge yet. Cancel anytime in 24hrs.</p>
          <div className="space-y-1">
            <div className="bg-white rounded-lg px-2 py-1 text-center"><span className="text-[7px] font-semibold text-[#2C8FE0]">+ Add to Calendar</span></div>
            <div className="bg-white rounded-lg px-2 py-1 text-center"><span className="text-[7px] text-[#9A9590]">Get directions</span></div>
          </div>
        </div>
      </div>
      <p className="text-center text-[9px] font-mono font-bold uppercase tracking-widest mt-2 text-[#9A9590]">Place held</p>
    </div>
  );
}

function PhoneHostDash() {
  return (
    <div className="flex-shrink-0 w-40">
      <div className="rounded-[24px] overflow-hidden border-4 border-[#1A1A1A] shadow-2xl" style={{ backgroundColor: "#F5EDE3", minHeight: "300px" }}>
        <div className="px-3 pt-3 pb-2">
          <div className="bg-[#2C8FE0] rounded-xl p-2 mb-2">
            <p className="text-white/60 text-[6px] font-mono uppercase">Host dashboard</p>
            <p className="text-white font-black text-sm leading-tight">Kia ora,<br />Tāne.</p>
          </div>
          <div className="grid grid-cols-2 gap-1 mb-2">
            <div className="bg-[#FFD166] rounded-lg p-1.5">
              <p className="text-[5px] text-[#1A1A1A]/60 font-mono uppercase">This month</p>
              <p className="text-[#1A1A1A] font-black text-sm leading-none">$847</p>
            </div>
            <div className="bg-white rounded-lg p-1.5">
              <p className="text-[5px] text-[#9A9590] font-mono uppercase">Repeat</p>
              <p className="text-[#1A1A1A] font-black text-sm leading-none">68%</p>
            </div>
          </div>
          <div className="bg-[#2C8FE0] rounded-lg py-1 text-center mb-1">
            <span className="text-white text-[7px] font-semibold">+ Add a session</span>
          </div>
          <div className="bg-white rounded-lg p-1.5">
            <p className="text-[6px] text-[#4CAF82] font-mono uppercase">● Confirmed</p>
            <p className="text-[8px] font-bold text-[#1A1A1A]">Sunday Slow Flow</p>
            <p className="text-[6px] text-[#9A9590]">9 held · $19/spot</p>
          </div>
        </div>
      </div>
      <p className="text-center text-[9px] font-mono font-bold uppercase tracking-widest mt-2 text-[#9A9590]">Host dashboard</p>
    </div>
  );
}

// ─── WAITLIST FORM ─────────────────────────────────────────────────────────────
function WaitlistForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [role, setRole] = useState<WaitlistRole>("mover");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name && email && city) setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center py-10">
        <p className="text-5xl mb-4">🌏</p>
        <h3 className="font-bold text-2xl text-white mb-2" style={{ letterSpacing: "-0.02em" }}>
          You&apos;re in.
        </h3>
        <p className="text-white/70 leading-relaxed">
          {city} noted. You&apos;ll be first to know.
        </p>
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
      <button type="submit"
        className="w-full py-4 rounded-full font-bold text-base transition-all hover:brightness-110 active:scale-[0.98]"
        style={{ backgroundColor: "#FFD166", color: "#1A1A1A" }}>
        Put me on the list →
      </button>
    </form>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: "#F5EDE3" }}>

      {/* NAV */}
      <nav style={{ backgroundColor: "#2C8FE0" }} className="px-5 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <span className="font-bold text-xl tracking-tight text-white">STRETCHY</span>
          <div className="flex items-center gap-3">
            <Link href="/sessions" className="text-sm font-semibold text-white/70 hover:text-white transition-colors hidden sm:block">Browse sessions</Link>
            <Link href="/login" className="text-sm font-semibold px-4 py-2 rounded-full border-2 border-white/40 text-white hover:bg-white hover:text-[#2C8FE0] transition-all">Log in</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ backgroundColor: "#2C8FE0" }} className="px-5 pt-10 pb-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-block font-mono text-xs font-bold uppercase tracking-widest mb-6 px-4 py-1.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)" }}>
            Auckland, New Zealand · Est. 2026
          </div>
          <h1 className="font-bold text-white mb-6 leading-none" style={{ fontSize: "clamp(52px, 14vw, 88px)", letterSpacing: "-0.04em", lineHeight: "0.9" }}>
            A social<br />movement.
          </h1>
          <p className="text-white/80 text-xl leading-relaxed mb-5 max-w-lg mx-auto">
            Group movement classes where <strong className="text-white">the price drops as more people join.</strong> The more who move together, the better value for everyone.
          </p>
          <p className="text-white font-bold text-lg mb-10 italic">
            &ldquo;Why hasn&apos;t anyone done this before?&rdquo;
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="#waitlist" className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-base transition-all hover:brightness-110 active:scale-[0.98] text-center" style={{ backgroundColor: "#FFD166", color: "#1A1A1A" }}>
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
          <span style={{ color: "#2C8FE0" }}> with a pricing model that rewards community.</span>
        </p>
      </section>

      {/* PRICING MECHANIC */}
      <section className="px-5 py-16" style={{ backgroundColor: "#1A1A1A" }}>
        <div className="max-w-2xl mx-auto">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#9A9590] mb-3 text-center">The pricing mechanic</p>
          <h2 className="font-bold text-white text-center mb-4 leading-tight" style={{ fontSize: "clamp(30px, 7vw, 50px)", letterSpacing: "-0.03em" }}>
            The more who join,<br />the less you pay.
          </h2>
          <p className="text-[#9A9590] text-center mb-10 max-w-lg mx-auto">
            Every session has a host target and a flat Stretchy fee. Split that across everyone who shows up. It&apos;s just maths — fair, transparent, and kind of obvious in hindsight.
          </p>
          <PricingVisualiser />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-10">
            {[
              { n: "No percentage taken", d: "Stretchy charges a flat fee. Hosts keep exactly what they set." },
              { n: "Price only goes down", d: "You'll never pay more than the price you see when you hold." },
              { n: "Nothing charged upfront", d: "Card on file, charged 2 hours before. Zero risk to hold." },
            ].map((item) => (
              <div key={item.n} className="bg-white/5 rounded-2xl p-5">
                <p className="font-bold text-white text-sm mb-1 leading-snug">{item.n}</p>
                <p className="text-[#9A9590] text-xs leading-relaxed">{item.d}</p>
              </div>
            ))}
          </div>
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
            <Link href="/host/apply" className="inline-block px-8 py-4 rounded-full font-bold text-base transition-all hover:brightness-110 active:scale-[0.98]" style={{ backgroundColor: "#FFD166", color: "#1A1A1A" }}>
              Apply to be a host →
            </Link>
          </div>
        </div>
      </section>

      {/* THE STORY */}
      <section className="max-w-2xl mx-auto px-5 py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 items-start">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#9A9590] mb-3">The story</p>
            <h2 className="font-bold text-[#1A1A1A] mb-5 leading-tight" style={{ fontSize: "clamp(26px, 6vw, 38px)", letterSpacing: "-0.03em" }}>
              Started with yoga.<br />Became something bigger.
            </h2>
            <div className="space-y-4 text-sm text-[#6B6B6B] leading-relaxed">
              <p>Stretchy started as a yoga community in Auckland in 2024. The problem was simple: people wanted great movement but resented fixed pricing, empty promises, and the social isolation of walking into a studio alone.</p>
              <p>The insight was that <strong className="text-[#1A1A1A]">people don&apos;t just want to move — they want to move together.</strong> And that&apos;s worth building a whole platform around.</p>
              <p>By 2026, Stretchy evolved into a community movement platform. Yoga is one format. But the model works for anything — pilates, HIIT, breathwork, sound baths, run clubs, dance. If people want to do it together and the economics should reward group effort, Stretchy is the infrastructure.</p>
              <p className="text-[#1A1A1A] font-semibold">Stretching bodies, minds and social circles.</p>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { y: "2024", t: "Yoga community", d: "IRL yoga sessions in Auckland parks and studios. Building the model.", col: "#FFD166" },
              { y: "2025", t: "Community pricing", d: "The group pricing mechanic is born. The more who join, the less everyone pays.", col: "#2C8FE0" },
              { y: "2026", t: "Movement platform", d: "From yoga to any movement format. The platform is live. The city is moving.", col: "#A535C7" },
            ].map((m) => (
              <div key={m.y} className="flex gap-4 items-start">
                <div className="w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center font-mono font-black text-xs"
                  style={{ backgroundColor: m.col, color: m.col === "#FFD166" ? "#1A1A1A" : "#fff" }}>
                  {m.y}
                </div>
                <div>
                  <h3 className="font-bold text-[#1A1A1A] text-sm">{m.t}</h3>
                  <p className="text-[#6B6B6B] text-xs leading-relaxed">{m.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* APP PREVIEW */}
      <section style={{ backgroundColor: "#EDE8E2" }} className="px-5 py-20 overflow-hidden">
        <div className="max-w-2xl mx-auto">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#9A9590] mb-3 text-center">The app</p>
          <h2 className="font-bold text-[#1A1A1A] mb-4 leading-tight text-center" style={{ fontSize: "clamp(26px, 6vw, 40px)", letterSpacing: "-0.03em" }}>
            See what you&apos;re signing up to.
          </h2>
          <p className="text-[#6B6B6B] text-center mb-10 max-w-md mx-auto text-sm">
            No app store download. Works in your browser today.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <PhoneHome />
            <PhoneSession />
            <PhoneHeld />
            <PhoneHostDash />
          </div>
          <div className="text-center mt-8">
            <Link href="/sessions" className="inline-block px-8 py-4 rounded-full font-bold text-base transition-all hover:brightness-110 active:scale-[0.98]" style={{ backgroundColor: "#1A1A1A", color: "#F5EDE3" }}>
              Explore the live app →
            </Link>
          </div>
        </div>
      </section>

      {/* WAITLIST */}
      <section id="waitlist" className="px-5 py-20" style={{ backgroundColor: "#2C8FE0" }}>
        <div className="max-w-md mx-auto text-center">
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-white/60 mb-3">Get early access</p>
          <h2 className="font-bold text-white mb-4 leading-tight" style={{ fontSize: "clamp(30px, 7vw, 48px)", letterSpacing: "-0.03em" }}>
            Be first in<br />your city.
          </h2>
          <p className="text-white/70 mb-10 max-w-sm mx-auto leading-relaxed">
            Auckland is live. More cities coming. Tell us where you are and we&apos;ll let you know when Stretchy heads your way.
          </p>
          <WaitlistForm />
        </div>
      </section>

      {/* FAQS */}
      <section className="max-w-2xl mx-auto px-5 py-20">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-[#9A9590] mb-3">Quick answers</p>
        <h2 className="font-bold text-[#1A1A1A] mb-10 leading-tight" style={{ fontSize: "clamp(26px, 6vw, 40px)", letterSpacing: "-0.03em" }}>
          Everything you<br />want to know.
        </h2>
        {FAQS.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
      </section>

      {/* FINAL CTA */}
      <section style={{ backgroundColor: "#FFD166" }} className="px-5 py-20 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="font-bold text-[#1A1A1A] mb-4 leading-tight" style={{ fontSize: "clamp(34px, 9vw, 60px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}>
            Move together.<br />Pay less.<br />Meet people.
          </h2>
          <p className="text-[#1A1A1A]/70 text-lg mb-10 max-w-md mx-auto">The highlight of your week, every week.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a href="#waitlist" className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-base transition-all hover:brightness-95 active:scale-[0.98] text-center" style={{ backgroundColor: "#1A1A1A", color: "#F5EDE3" }}>
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
