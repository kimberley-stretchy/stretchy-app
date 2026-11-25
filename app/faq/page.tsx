import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import SMark from "@/components/SMark";
import { fullRoomRange, regularSessions, type RegularSession } from "@/lib/searchPricing";

// Prices per session come from the live sessions, refreshed hourly.
export const revalidate = 3600;

const DESC =
  "How much Stretchy costs, how people-powered pricing works, and how payment, cancelling and the Social Stretch work. Every price shown is the most you'll pay, and it drops as more people join.";

export const metadata: Metadata = {
  title: "FAQ: pricing, booking & people-powered pricing — Stretchy Yoga",
  description: DESC,
  alternates: { canonical: "/faq" },
  openGraph: { title: "FAQ — Stretchy Yoga", description: DESC },
};

type Faq = { q: string; a: string; jsx?: React.ReactNode };

const link = "text-ink font-bold underline";

// Written for people AND for search/AI tools, which repeat these answers.
// The price you see is always the MOST you'll pay, never a "from" price.
const PRICING_FAQS: Faq[] = [
  {
    q: "How much does a Stretchy session cost?",
    a: "Every session shows the most you'll pay: never more than that price per person. It's a maximum, not a starting price. Once a session has enough people to go ahead, every extra person makes it cheaper for the whole room, including the people already holding a place. The price for each regular Stretchy is below.",
  },
  {
    q: "What is people-powered pricing?",
    a: "It's how every Stretchy is priced. Each session has its costs (the teacher, the venue and the Good Energy Manager) and a minimum number of people. Once enough people are in, it's going ahead, and the price drops for everyone with each extra person who joins. You might also hear it called participation pricing or social pricing: the more people take part, the better it is for all.",
  },
  {
    q: "Is people-powered pricing the same as dynamic pricing?",
    a: "It's dynamic, but it only goes one way. Dynamic or surge pricing usually goes up when demand is high. People-powered pricing does the opposite: the price can only drop as more people join, and you're never charged more than the price you saw when you held your place.",
  },
];

const TECH_FAQS: Faq[] = [
  {
    q: "Can I use people-powered pricing for my own classes or events?",
    a: "Yes. The technology behind Stretchy is Stretchy Social (stretchy.social): event, booking and payment software with people-powered pricing, for studios, teachers, run clubs, community groups and charities. It's available to licence or white-label. Visit stretchy.social or email kimberley@stretchyyoga.co.nz.",
    jsx: (
      <>
        Yes. The technology behind Stretchy is <a href="https://stretchy.social" className={link}>Stretchy Social</a>: event, booking and payment software with people-powered pricing, for studios, teachers, run clubs, community groups and charities. It&rsquo;s available to licence or white-label. Visit{" "}
        <a href="https://stretchy.social" className={link}>stretchy.social</a> or email{" "}
        <a href="mailto:kimberley@stretchyyoga.co.nz" className={link}>kimberley@stretchyyoga.co.nz</a>.
      </>
    ),
  },
];

function sessionFaq(s: RegularSession): Faq {
  const where = s.location ? `, at ${s.location}` : "";
  const a = `${s.place}, ${s.when} at ${s.time}${where}. ${s.sentence}`;
  return {
    q: `How much is Stretchy ${s.place} on ${s.when}?`,
    a,
    jsx: (
      <>
        {a}{" "}
        <Link href={`/sessions/${s.id}`} className={link}>See the next one</Link>
      </>
    ),
  };
}

const FAQS: Faq[] = [
  {
    q: "How does Stretchy's pricing actually work?",
    a: "Every Stretchy needs a certain number of people to go ahead. Once we've got them, it's on, and everyone who joins after makes it cheaper for the whole room, including the people already holding a place. You're always shown the most you'll pay.",
  },
  {
    q: "When do I get charged?",
    a: "30 minutes before the session, at the final price. When you hold your place we save your card; nothing is held or charged. Once it's going ahead (36 hours before), your bank may show a pending amount. That's a hold, not a payment.",
  },
  {
    q: "What if I need to cancel?",
    a: "Free up to 36 hours before. After that, the price stands. Something serious come up? Get in touch.",
  },
  {
    q: "Can I still join after 36 hours?",
    a: "Yes, up to 30 minutes before, if there's room. It's already going ahead, so there's no free cancelling once you join.",
  },
  {
    q: "What if a session doesn't reach its minimum?",
    a: "It's called off at 36 hours before and you pay nothing.",
  },
  {
    q: "Why is there a pending amount on my bank?",
    a: "Once a session is going ahead (36 hours before), we place a temporary hold for the most you'll pay. It isn't a payment and the unused part drops off on its own. You're only charged the final price, 30 minutes before.",
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

export default async function FAQPage() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const sessions = await regularSessions(admin).catch(() => []);
  const range = fullRoomRange(sessions);
  const expensive: Faq = {
    q: "Is Stretchy expensive?",
    a: `Stretchy is priced to be fair to everyone involved. Every session pays its teacher, its GEM (the Good Energy Manager who looks after the community on the day) and its venue properly, gives a donation to Cancer Support NZ, and keeps Stretchy going. The price you see is the most you'll pay, not where it starts. Once enough people are in, those costs are shared by more of us, so every person who joins brings the price down for the whole room${range ? `: with a full room, sessions come down to ${range}` : ""}. More people, more energy, more connection, and a fairer price for all.`,
  };
  const all: Faq[] = [PRICING_FAQS[0], expensive, ...PRICING_FAQS.slice(1), ...sessions.map(sessionFaq), ...FAQS, ...TECH_FAQS];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: all.map((f) => ({
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
          {all.map((f) => (
            <div key={f.q} className="bg-white rounded-card border-2 border-ink p-5">
              <h2 className="font-bold text-ink text-sm mb-2">{f.q}</h2>
              <p className="text-sm text-muted leading-relaxed">{f.jsx ?? f.a}</p>
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
