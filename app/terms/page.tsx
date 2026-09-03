"use client";

import Link from "next/link";
import SMark from "@/components/SMark";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-cream pb-20">
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <Link href="/home" className="text-ink"><SMark size={28} /></Link>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">Terms</p>
        <Link href="/home" className="text-muted hover:text-ink text-lg transition-colors">×</Link>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="font-display font-bold text-ink mb-1" style={{ fontSize: "36px", letterSpacing: "-0.03em" }}>
            Terms &amp; conditions
          </h1>
          <p className="font-mono text-xs text-muted uppercase tracking-widest">Last updated September 2026</p>
        </div>

        <div className="bg-white rounded-card border-2 border-ink p-5 space-y-4 text-sm text-ink leading-relaxed">
          <div>
            <h2 className="font-bold mb-2">The short version</h2>
            <p className="text-muted">Stretchy connects people who want to move with people who teach. You hold a place, the price drops as the room fills, and everyone pays the same final price once it&rsquo;s locked in at the 36-hour mark. If a session doesn&rsquo;t reach its minimum, it doesn&rsquo;t go ahead, and you&rsquo;re not charged.</p>
          </div>

          <div>
            <h2 className="font-bold mb-2">Payment &amp; cancellation</h2>
            <p className="text-muted mb-2">Every Stretchy is priced by the community, not against it — the more people who come together, the lower the price gets for everyone. Here&rsquo;s exactly how payment and cancellation work.</p>
            <ul className="text-muted space-y-1.5 list-disc pl-4">
              <li>You add a card at booking. Nothing is charged yet. You&rsquo;re holding a spot at the current starting price — the most you could ever pay for this session.</li>
              <li>36 hours before the session, your spot locks in. If the minimum number of people needed has been reached, the session is confirmed and your card is committed. The price you see at this point is your ceiling — it can still drop from here, never rise.</li>
              <li>2 hours before the session, the final price is set and your card is charged. Whatever the price has dropped to by then is what you pay. You&rsquo;ll get a receipt.</li>
              <li>If you cancel before the 36-hour lock-in, it&rsquo;s free — no charge, no questions.</li>
              <li>If you cancel after the 36-hour lock-in because you simply can&rsquo;t make it, the price stands. We don&rsquo;t refund change-of-mind cancellations after this point — by then we&rsquo;ve committed to your teacher, your GEM, and your venue, and this is what keeps the pricing fair and workable for everyone who does show up. (This doesn&rsquo;t affect your legal rights — see below.)</li>
              <li>If Stretchy, your teacher, or your venue has to cancel after lock-in, you&rsquo;re refunded in full, automatically or via Stretchy HQ. Every time, no exceptions. Refunds are processed back through Stripe, to the card you paid with.</li>
              <li>If something genuinely comes up — illness, an emergency, life — flick us a message. We look at these case by case; we&rsquo;re a community, not a vending machine.</li>
            </ul>
          </div>

          <div>
            <h2 className="font-bold mb-2">Where your money goes</h2>
            <p className="text-muted">Every Stretchy price is built from real costs — your teacher, your GEM (the person who makes sure everything runs smoothly on the day), the space we&rsquo;ve hired, a contribution to Stretchy&rsquo;s community fund (currently supporting the Yoga in Prisons Trust), and what it takes to run the tech, the platform, and the team behind it all. Nothing hidden, nothing padded.</p>
          </div>

          <div>
            <h2 className="font-bold mb-2">Your rights</h2>
            <p className="text-muted">This cancellation policy applies only when you decide not to attend. It doesn&rsquo;t limit or override your rights under New Zealand consumer law (including the Consumer Guarantees Act) if a session is materially different from what was described, or doesn&rsquo;t go ahead for reasons within Stretchy&rsquo;s control — those situations are covered above, not by this policy.</p>
          </div>

          <div>
            <h2 className="font-bold mb-2">Health, safety &amp; &ldquo;moving with care&rdquo;</h2>
            <p className="text-muted">Stretchy is a movement community, not a medical service. Sharing a care note helps your teacher and GEM look after you, but it isn&rsquo;t medical advice and we&rsquo;re not responsible for assessing your fitness to take part — that&rsquo;s between you and your own judgement (and your doctor, if it&rsquo;s a serious call). Many of our teachers and GEMs hold a current First Aid qualification, and we&rsquo;re working towards this for everyone running sessions. If you&rsquo;re injured by accident during a Stretchy session in New Zealand, you may be covered by ACC (New Zealand&rsquo;s no-fault accident compensation scheme) — ACC&rsquo;s own rules determine what&rsquo;s actually covered, and this isn&rsquo;t a guarantee of cover.</p>
          </div>

          <div>
            <h2 className="font-bold mb-2">Host &amp; GEM responsibilities</h2>
            <p className="text-muted">Teachers and GEMs are vetted by Stretchy before they can run sessions. They&rsquo;re responsible for the safety, delivery and quality of their sessions. Stretchy is the platform; hosts are independent practitioners, not Stretchy employees.</p>
          </div>

          <div>
            <h2 className="font-bold mb-2">Your data</h2>
            <p className="text-muted">We only collect what we need to run Stretchy. See our <Link href="/privacy" className="font-bold text-ink underline">Privacy Policy</Link> for the full picture.</p>
          </div>

          <div>
            <h2 className="font-bold mb-2">Governing law</h2>
            <p className="text-muted">These terms are governed by the laws of New Zealand.</p>
          </div>

          <div>
            <h2 className="font-bold mb-2">Questions?</h2>
            <p className="text-muted">Email us at <a href="mailto:kimberley@stretchyyoga.co.nz" className="font-bold text-ink">kimberley@stretchyyoga.co.nz</a> — we&rsquo;re a small team and we actually reply.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
