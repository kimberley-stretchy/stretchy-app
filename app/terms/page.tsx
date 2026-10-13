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
          <p className="font-mono text-xs text-muted uppercase tracking-widest">Last updated October 2026</p>
        </div>

        <div className="bg-white rounded-card border-2 border-ink p-5 space-y-4 text-sm text-ink leading-relaxed">
          <div>
            <h2 className="font-bold mb-2">The short version</h2>
            <p className="text-muted">Stretchy connects people who want to move with people who teach. You hold a place, the price drops as the room fills, and everyone pays the same final price, charged 2 hours before the session. If a session doesn&rsquo;t reach its minimum by 36 hours before, it&rsquo;s called off and you pay nothing.</p>
          </div>

          {/* Every "Cancellation policy ↗" link on the site and in emails lands here.
              Wording matches the site and emails (STRETCHY_WORDS.md). The policy
              itself is unchanged; point 7 (was 6), the new point 4 (confirming your card,
              added Oct 2026) and "Your rights" still need a lawyer's review. */}
          <div id="cancellation" className="scroll-mt-6">
            <h2 className="font-bold mb-2">Payment &amp; cancellation</h2>
            <p className="text-muted mb-2">Every Stretchy is priced by the community, not against it. The more people who come together, the lower the price gets for everyone. Here&rsquo;s exactly how payment and cancellation work.</p>
            <ol className="text-muted space-y-1.5 list-decimal pl-5">
              <li><strong className="text-ink">Hold your place.</strong> We save your card and show you the most you&rsquo;ll pay. Nothing is charged yet. Your bank may show a pending amount for a few days. That&rsquo;s a hold, not a payment.</li>
              <li><strong className="text-ink">Up to 36 hours before: free to cancel.</strong> No charge, no questions.</li>
              <li><strong className="text-ink">36 hours before: going ahead, or not.</strong> If we have the minimum number of people, we&rsquo;re on. If not, it&rsquo;s called off and you pay nothing. Free cancelling ends here.</li>
              <li><strong className="text-ink">36 hours before: we confirm your card.</strong> If it doesn&rsquo;t go through, we&rsquo;ll email you. If we still don&rsquo;t have a working card 12 hours before, your place goes back to the group.</li>
              <li><strong className="text-ink">36 to 2 hours before: still room to join.</strong> More people can join and the price keeps dropping for everyone. If you join in this window, it&rsquo;s already going ahead, so there&rsquo;s no free cancelling.</li>
              <li><strong className="text-ink">2 hours before: final price charged.</strong> Joining closes and we charge your card the final price. It&rsquo;s never more than the max price shown. You&rsquo;ll get a receipt.</li>
              <li><strong className="text-ink">Can&rsquo;t make it after 36 hours?</strong> The price stands. We don&rsquo;t refund change-of-mind cancellations after this point, because by then we&rsquo;ve committed to your teacher, your GEM and your venue. That&rsquo;s what keeps the pricing fair for everyone who shows up. (This doesn&rsquo;t affect your legal rights. See below.)</li>
              <li><strong className="text-ink">If we cancel, you don&rsquo;t pay.</strong> If you&rsquo;ve already been charged, we refund you in full, back to the card you paid with.</li>
              <li><strong className="text-ink">Something serious come up?</strong> Illness, an emergency, life. Get in touch and we&rsquo;ll look at it case by case.</li>
            </ol>
          </div>

          <div>
            <h2 className="font-bold mb-2">Where your money goes</h2>
            <p className="text-muted">Every Stretchy price is built from real costs — your teacher, your GEM (the person who makes sure everything runs smoothly on the day), the space we&rsquo;ve hired, a $10 Stretchy donation (currently going to Cancer Support NZ), and what it takes to run the tech, the platform, and the team behind it all. Nothing hidden, nothing padded.</p>
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
