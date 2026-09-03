import type { Metadata } from "next";
import Link from "next/link";
import SMark from "@/components/SMark";

export const metadata: Metadata = {
  title: "The Stretchy World",
  description: "Built by Stretchy — our brand, our thinking, our technology. And how to get involved.",
};

export default function VisionPage() {
  return (
    <main className="min-h-dvh bg-cream pb-20">
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <Link href="/" className="text-ink"><SMark size={28} /></Link>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">The Stretchy World</p>
        <Link href="/" className="text-muted hover:text-ink text-lg transition-colors">×</Link>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="font-display font-bold text-ink mb-1" style={{ fontSize: "36px", letterSpacing: "-0.03em" }}>
            Built by Stretchy.<br />Please don&rsquo;t copy it.
          </h1>
        </div>

        <div className="bg-white rounded-card border-2 border-ink p-5 space-y-4 text-sm text-ink leading-relaxed">
          <p className="text-muted">
            Stretchy is an original movement, community and technology platform, born in Aotearoa New Zealand and built with a global future in mind.
          </p>
          <p className="text-muted">
            The brand, ideas, creative work, technology, systems, experiences and community model have been imagined, developed and brought to life by Kimberley Torrie, trading as Studio Dawn / Kimberley Torrie Creative, together with the people and partners who have helped bring Stretchy to life.
          </p>
          <p className="text-muted">
            <strong className="text-ink">Stretchy Yoga®</strong> and <strong className="text-ink">Stretching bodies minds &amp; social circles®</strong> are registered trade marks in New Zealand. Our original creative work, written content, photography, design, software, product thinking, systems and other proprietary materials are protected by applicable intellectual property rights.
          </p>
          <p className="text-muted">
            Some elements of Stretchy — including the mechanics behind our pricing model — are deliberately kept confidential as part of the know-how behind how we operate and what we&rsquo;re building.
          </p>
          <p className="text-muted">
            Please don&rsquo;t copy, reproduce, adapt, scrape, extract, republish or commercialise Stretchy&rsquo;s work, systems or technology without permission — including for the purpose of training, developing or commercialising AI systems.
          </p>
        </div>

        <div className="rounded-card border-2 border-ink p-5 space-y-3" style={{ backgroundColor: "#902F8A", color: "#F7F0E8" }}>
          <h2 className="font-display text-[26px] leading-none">Like our thinking? Let&rsquo;s talk.</h2>
          <p className="text-sm leading-relaxed opacity-90">
            If you like our brand, thinking, technology, identity, systems or community ethos, we&rsquo;d love to hear from you. We&rsquo;re open to licensing, white-label technology, partnerships and collaborations with people who see the potential in what we&rsquo;re building.
          </p>
          <Link
            href="/partner"
            className="inline-flex items-center justify-center h-11 px-6 rounded-pill text-sm font-bold border-2"
            style={{ borderColor: "#F7F0E8" }}
          >
            Start a conversation →
          </Link>
          <p className="text-xs opacity-75 pt-1">Kimberley Torrie @ Studio Dawn — Aotearoa New Zealand → the world.</p>
        </div>

        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-3">Want in another way?</p>
          <div className="grid grid-cols-2 gap-2.5">
            <Link href="/host/apply" className="border-2 border-ink rounded-card p-4 bg-white">
              <div className="font-mono text-[9px] font-extrabold tracking-widest text-hot-blue mb-1">TEACH</div>
              <div className="font-display text-lg leading-none">Teach a Stretchy</div>
            </Link>
            <Link href="/venue/offer" className="border-2 border-ink rounded-card p-4 bg-white">
              <div className="font-mono text-[9px] font-extrabold tracking-widest text-orange mb-1">HOST</div>
              <div className="font-display text-lg leading-none">Offer a space</div>
            </Link>
            <Link href="/gem/apply" className="border-2 border-ink rounded-card p-4 bg-white">
              <div className="font-mono text-[9px] font-extrabold tracking-widest" style={{ color: "#716F39" }}>GEM</div>
              <div className="font-display text-lg leading-none mt-1">Become a GEM</div>
            </Link>
            <Link href="/suggest" className="border-2 border-ink rounded-card p-4 bg-white">
              <div className="font-mono text-[9px] font-extrabold tracking-widest text-purple mb-1">SUGGEST</div>
              <div className="font-display text-lg leading-none">Suggest a Stretchy</div>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
