import type { Metadata } from "next";
import Link from "next/link";
import SMark from "@/components/SMark";

export const metadata: Metadata = {
  title: "FAQ — Stretchy",
  description: "How Stretchy's pricing, payment, cancellation and community work — answered plainly.",
  openGraph: {
    title: "FAQ — Stretchy",
    description: "How Stretchy's pricing, payment, cancellation and community work — answered plainly.",
  },
};

const FAQS = [
  {
    q: "How does Stretchy's pricing actually work?",
    a: "Every Stretchy needs a certain number of people to go ahead. Once we've got them, it's on, and everyone who joins after makes it cheaper for the whole room, including the people already holding a place. You're always shown the most you'll pay.",
  },
  {
    q: "When do I get charged?",
    a: "2 hours before the session, at the final price. When you hold your place we save your card; nothing is held or charged. Once it's going ahead (36 hours before), your bank may show a pending amount. That's a hold, not a payment.",
  },
  {
    q: "What if I need to cancel?",
    a: "Free up to 36 hours before. After that, the price stands. Something serious come up? Get in touch.",
  },
  {
    q: "Can I still join after 36 hours?",
    a: "Yes, up to 2 hours before, if there's room. It's already going ahead, so there's no free cancelling once you join.",
  },
  {
    q: "What if a session doesn't reach its minimum?",
    a: "It's called off at 36 hours before and you pay nothing.",
  },
  {
    q: "Why is there a pending amount on my bank?",
    a: "Once a session is going ahead (36 hours before), we place a temporary hold for the most you'll pay. It isn't a payment and the unused part drops off on its own. You're only charged the final price, 2 hours before.",
  },
  {
    q: "I'm holding more than one place. How does that work?",
    a: "Everything works the same, per place. You can change or cancel places for free up to 36 hours before.",
  },
  {
    q: "What's a Social Stretch?",
    a: "The half of Stretchy that isn't on the mat. Most sessions end with a Social Stretch at a nearby café, bar or park — a chance to make mates off the mat. It's optional, and you pay your own way.",
  },
  {
    q: "What does \"moving with care\" mean?",
    a: "It's an optional note you can add about an injury, pregnancy, surgery, or anything else you'd like your teacher and the GEM (Good Energy Manager) on the day to know before you start. It isn't medical advice, and it's only visible to the people running your session.",
  },
  {
    q: "Who's the GEM?",
    a: "Short for Good Energy Manager — the community host who runs the room. They check people in, look after anyone moving with care, and make sure nobody stands on their own.",
  },
  {
    q: "How do I become a teacher or GEM?",
    a: "Head to our Teach a Stretchy or Become a GEM pages and register your interest. No qualifications are needed to be a GEM — just good energy. Teachers are vetted before they can run sessions.",
  },
  {
    q: "Do I need experience to come to a Stretchy?",
    a: "No. Stretchy is for anyone who wants to move — first-timers and regulars alike. Every session page tells you the style and level before you book.",
  },
  {
    q: "Who designed and built Stretchy?",
    a: "Stretchy — the brand, the design, the UX, the copy, the whole idea — was imagined and built by Kimberley Torrie, trading as Studio Dawn. Get in touch at kimberley@stretchyyoga.co.nz, find Studio Dawn at studiodawn.org, or follow along on Instagram @studiodawn_nz.",
    jsx: (
      <>
        Stretchy — the brand, the design, the UX, the copy, the whole idea — was imagined and built by{" "}
        <strong className="text-ink">Kimberley Torrie</strong>, trading as{" "}
        <a href="https://www.studiodawn.org/" target="_blank" rel="noopener noreferrer" className="text-ink font-bold underline">Studio Dawn</a>.
        Get in touch at{" "}
        <a href="mailto:kimberley@stretchyyoga.co.nz" className="text-ink font-bold underline">kimberley@stretchyyoga.co.nz</a>, or find Studio Dawn on{" "}
        <a href="https://www.instagram.com/studiodawn_nz" target="_blank" rel="noopener noreferrer" className="text-ink font-bold underline">Instagram</a>.
      </>
    ),
  },
  {
    q: "Is Stretchy's brand and technology protected?",
    a: "Yes. Stretchy Yoga® and Stretching bodies minds & social circles® are registered trade marks in New Zealand, and our original creative work, technology and product thinking are protected by applicable intellectual property rights. We're open to licensing and partnership conversations — see The Stretchy World for the full picture.",
    jsx: (
      <>
        Yes. Stretchy Yoga® and Stretching bodies minds &amp; social circles® are registered trade marks in New Zealand, and our original creative work, technology and product thinking are protected by applicable intellectual property rights. We&rsquo;re open to licensing and partnership conversations — see{" "}
        <Link href="/vision" className="text-ink font-bold underline">The Stretchy World</Link> for the full picture.
      </>
    ),
  },
];

export default function FAQPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <main className="min-h-screen bg-cream pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <Link href="/" className="text-ink"><SMark size={28} /></Link>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">FAQ</p>
        <Link href="/" className="text-muted hover:text-ink text-lg transition-colors">×</Link>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="font-display font-bold text-ink mb-1" style={{ fontSize: "36px", letterSpacing: "-0.03em" }}>
            Questions, answered.
          </h1>
          <p className="text-sm text-muted">The short version of how Stretchy works.</p>
        </div>

        <div className="space-y-3">
          {FAQS.map((f) => (
            <div key={f.q} className="bg-white rounded-card border-2 border-ink p-5">
              <h2 className="font-bold text-ink text-sm mb-2">{f.q}</h2>
              <p className="text-sm text-muted leading-relaxed">{"jsx" in f ? f.jsx : f.a}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted text-center">
          Still have a question? Email <a href="mailto:kimberley@stretchyyoga.co.nz" className="font-bold text-ink">kimberley@stretchyyoga.co.nz</a>
        </p>
      </div>
    </main>
  );
}
