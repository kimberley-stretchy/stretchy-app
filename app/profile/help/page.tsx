"use client";

import { useState } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";

const SOCIAL_LINKS = [
  {
    id: "instagram",
    label: "Instagram",
    handle: "@stretchy.yoga",
    icon: "📸",
    href: "https://www.instagram.com/stretchy.yoga/",
    bg: "#F3E8FF",
    color: "#7C3AED",
  },
  {
    id: "tiktok",
    label: "TikTok",
    handle: "@stretchy.yoga",
    icon: "🎬",
    href: "https://www.tiktok.com/@stretchy.yoga",
    bg: "#FFF0F0",
    color: "#14110F",
  },
  {
    id: "substack",
    label: "Substack",
    handle: "@stretchyyoga",
    icon: "📨",
    href: "https://substack.com/@stretchyyoga",
    bg: "#FFF4E6",
    color: "#E6530D",
  },
];

const FAQS = [
  {
    q: "What is a hold — am I charged straight away?",
    a: "Nope. A hold reserves your place with no charge. Think of it like holding a spot in a queue. Your card is only charged once the session is confirmed and the final price locks — two hours before it starts.",
  },
  {
    q: "When does my card actually get charged?",
    a: "Two hours out — that's when the doors close, the final price locks, and everyone pays at the same time. Until then, your hold sits on your card but nothing is taken.",
  },
  {
    q: "How does the price drop?",
    a: "Sessions start at a max price. The more people who hold a spot, the lower the price drops for everyone. Once the minimum is met (36 hours out), the session is confirmed and the price keeps dropping as more people join — right up until two hours before.",
  },
  {
    q: "What happens if the minimum isn't met?",
    a: "If not enough people hold by the 36-hour mark, the session doesn't go ahead. Your hold is released and nothing is charged. Simple.",
  },
  {
    q: "Can I cancel my hold?",
    a: "Yes — up to 12 hours before the session. Cancel before then and your hold is released with no charge. After that window closes, your place is locked in — someone else may have joined because of you, which helped drop the price.",
  },
  {
    q: "Can I cancel once the session is confirmed?",
    a: "Once confirmed (36 hours out), cancellations close. The session is going ahead and the price is live. No cancellations from this point.",
  },
  {
    q: "What is a Social Stretch?",
    a: "The hang after — coffee, matcha, a cold one, good company. Your host sets it up and you stay as long as you like. Honestly, it's the best bit.",
  },
  {
    q: "How do I become a host?",
    a: "Apply via Menu → Apply to be a host. We vet everyone to keep the quality high. You'll hear back within 5 working days.",
  },
];

export default function HelpPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (subject.trim() && message.trim()) {
      const mailto = `mailto:kimberley@stretchyyoga.co.nz?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
      window.open(mailto, "_blank");
      setSent(true);
    }
  }

  return (
    <main className="min-h-screen bg-cream pb-20">
      {/* NAV */}
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/home" className="text-ink"><SMark size={28} /></Link>
          <Link href="/profile" className="text-muted hover:text-ink text-lg">←</Link>
        </div>
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-muted">
          Help
        </span>
        <div className="w-10" />
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-6">

        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.20em] text-muted mb-2">
            We're real people · we'll get back to you
          </p>
          <h1
            className="font-display font-bold text-ink"
            style={{ fontSize: "clamp(40px,11vw,54px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}
          >
            Say hello.
          </h1>
        </div>

        {/* Direct email */}
        <a
          href="mailto:kimberley@stretchyyoga.co.nz"
          className="flex items-center justify-between px-5 bg-white rounded-card border-2 border-ink transition-all active:scale-[0.99]"
          style={{ height: "64px" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">✉️</span>
            <div>
              <p className="font-semibold text-ink text-sm">Email us</p>
              <p className="font-mono text-xs text-muted">kimberley@stretchyyoga.co.nz</p>
            </div>
          </div>
          <span className="text-muted">›</span>
        </a>

        {/* Social links */}
        <div>
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-2">Find us</h2>
          <div className="space-y-2">
            {SOCIAL_LINKS.map((s) => (
              <a
                key={s.id}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3.5 rounded-card transition-all hover:brightness-95 active:scale-[0.99]"
                style={{ backgroundColor: s.bg, border: "2px solid #14110F" }}
              >
                <span className="text-2xl flex-shrink-0">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm" style={{ color: s.color }}>{s.label}</p>
                  <p className="font-mono text-xs" style={{ color: s.color, opacity: 0.70 }}>{s.handle}</p>
                </div>
                <span style={{ color: s.color, opacity: 0.50 }}>›</span>
              </a>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-2">Quick answers</h2>
          <div className="bg-white rounded-card border-2 border-ink divide-y divide-border">
            {FAQS.map((faq, i) => (
              <div key={i}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-4 text-left transition-colors hover:bg-sand-dark"
                >
                  <p className="font-semibold text-ink text-sm pr-4">{faq.q}</p>
                  <span className="text-muted flex-shrink-0 transition-transform duration-200" style={{ transform: openFaq === i ? "rotate(180deg)" : "none" }}>
                    ↓
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4">
                    <p className="text-sm text-ink leading-relaxed" style={{ opacity: 0.80 }}>{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact form */}
        <div>
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-2">Send a message</h2>
          {sent ? (
            <div className="bg-white rounded-card border-2 border-ink p-6 flex flex-col items-center text-center">
              <p className="text-3xl mb-3">🙌</p>
              <p className="font-bold text-ink mb-1">Got it.</p>
              <p className="text-sm text-muted leading-relaxed">We aim to reply within one working day. Check your email.</p>
              <button onClick={() => { setSent(false); setSubject(""); setMessage(""); }} className="mt-4 text-xs text-muted hover:text-ink transition-colors">
                Send another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSend} className="bg-white rounded-card border-2 border-ink p-4 space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-widest text-muted pl-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="What's up?"
                  required
                  className="w-full px-4 py-3.5 rounded-pill border-2 border-border bg-white text-ink placeholder-muted focus:outline-none focus:border-hot-blue transition-colors text-base"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-widest text-muted pl-1">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what's going on..."
                  required
                  rows={4}
                  className="w-full px-4 py-3.5 rounded-2xl border-2 border-border bg-white text-ink placeholder-muted focus:outline-none focus:border-hot-blue transition-colors text-base resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full font-semibold rounded-pill transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ backgroundColor: "#14110F", color: "#F7F0E8", height: "54px", fontSize: "15px" }}
              >
                Send message →
              </button>
            </form>
          )}
        </div>

        {/* Version */}
        <p className="text-center font-mono text-xs text-muted pb-4">
          Stretchy · Built in Aotearoa 🌿
        </p>
      </div>
    </main>
  );
}
