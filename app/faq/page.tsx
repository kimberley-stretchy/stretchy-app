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
    a: "Every session sets a minimum number of mats. Once that minimum is reached, the session is going ahead, and every extra person who joins lowers the price for everyone in the room — including the people who already booked. The price only ever moves down, never up.",
  },
  {
    q: "When do I get charged?",
    a: "You add a card when you hold your place, but nothing is charged yet. 36 hours before the session, if the minimum has been met, your spot locks in — the price at that point is the most you'll ever pay. 2 hours before the session, we charge your card the final price, which is often lower than you started at and never higher.",
  },
  {
    q: "What if I need to cancel?",
    a: "Free any time before the 36-hour lock-in — no charge, no questions. After that, the price stands, because by then we've committed to your teacher, your GEM, and your venue. If something genuinely comes up, message us — we look at these case by case.",
  },
  {
    q: "What happens if a session doesn't reach its minimum?",
    a: "It doesn't go ahead, and nobody is charged. If Stretchy ever has to cancel a session after lock-in for any other reason, you're refunded in full, automatically.",
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
              <p className="text-sm text-muted leading-relaxed">{f.a}</p>
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
