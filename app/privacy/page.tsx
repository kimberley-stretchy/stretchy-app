"use client";

import Link from "next/link";
import SMark from "@/components/SMark";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-cream pb-20">
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <Link href="/home" className="text-ink"><SMark size={28} /></Link>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">Privacy</p>
        <Link href="/home" className="text-muted hover:text-ink text-lg transition-colors">×</Link>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="font-display font-bold text-ink mb-1" style={{ fontSize: "36px", letterSpacing: "-0.03em" }}>
            Privacy policy
          </h1>
          <p className="font-mono text-xs text-muted uppercase tracking-widest">NZ Privacy Act 2020 · Last updated September 2026</p>
        </div>

        <div className="bg-white rounded-card border-2 border-ink p-5 space-y-4 text-sm text-ink leading-relaxed">
          <div>
            <h2 className="font-bold mb-2">What we collect</h2>
            <ul className="text-muted space-y-1 list-disc pl-4">
              <li>Name, email, mobile number</li>
              <li>Neighbourhood and movement preferences</li>
              <li>Payment method (held securely by Stripe — we never see or store your card number)</li>
              <li>Session holds, ratings, and photos/videos you choose to share</li>
              <li>Anything you tell us under &ldquo;moving with care&rdquo; — an optional note about an injury, pregnancy, surgery, or anything else you&rsquo;d like your teacher and GEM to know</li>
              <li>Usage data (which sessions you view, when you log in)</li>
              <li>If you teach or GEM for us: your qualifications, First Aid training status, availability, and banking details for payouts</li>
            </ul>
          </div>

          <div>
            <h2 className="font-bold mb-2">Why we collect it</h2>
            <ul className="text-muted space-y-1 list-disc pl-4">
              <li>To match you with sessions near you</li>
              <li>To process holds and payments</li>
              <li>To send confirmations, updates, and receipts</li>
              <li>To keep everyone moving with care — your teacher and the GEM on the day see your care note. Stretchy HQ can also see it, at our discretion — for example, to help sort out a safety concern</li>
              <li>To improve Stretchy and fix problems</li>
            </ul>
          </div>

          <div>
            <h2 className="font-bold mb-2">Who we share it with</h2>
            <ul className="text-muted space-y-1 list-disc pl-4">
              <li><strong>Stripe</strong> — payment processing (stripe.com/privacy)</li>
              <li><strong>Supabase</strong> — database hosting (supabase.com/privacy)</li>
              <li><strong>Resend</strong> — transactional email (resend.com/privacy)</li>
              <li><strong>Vercel</strong> — app hosting (vercel.com/legal/privacy-policy)</li>
              <li><strong>Google</strong> — if you choose to sign in with your Google account, or once Google Calendar sync is switched on for your sessions</li>
              <li><strong>Your teacher and GEM</strong> — your first name, and any care note, for sessions you hold a place in</li>
            </ul>
            <p className="text-muted mt-2">We do not knowingly sell your data, and we do not use it for advertising.</p>
            <p className="text-muted mt-2">Some of the services above store data outside New Zealand. We choose providers who meet strong privacy and security standards wherever they&rsquo;re based, in line with our obligations under the Privacy Act around sending information overseas.</p>
          </div>

          <div>
            <h2 className="font-bold mb-2">Care &amp; health notes</h2>
            <p className="text-muted">Anything you share with us under &ldquo;moving with care&rdquo; is treated as sensitive. It&rsquo;s visible to your teacher and the GEM running your session, and Stretchy HQ can also see it at our discretion — for example, to help resolve a safety concern. It&rsquo;s protected by database-level access controls, and you can edit or remove it at any time. We are not a medical service, and this note isn&rsquo;t medical advice. It&rsquo;s ultimately up to you to move within your own limits, and to seek professional medical, health or wellness advice where you need it.</p>
          </div>

          <div>
            <h2 className="font-bold mb-2">Photos &amp; videos</h2>
            <p className="text-muted">If you upload a photo or video after a session, you choose whether we can use it publicly. We review everything before it&rsquo;s posted. You can ask us to take something down at any time. If your photo or video includes other people, please make sure you have their express permission before sharing it.</p>
          </div>

          <div>
            <h2 className="font-bold mb-2">Cookies</h2>
            <p className="text-muted">We use session cookies to keep you logged in and local storage to remember your saved sessions. We don&rsquo;t currently use analytics or marketing cookies — if that changes, we&rsquo;ll update this section.</p>
          </div>

          <div>
            <h2 className="font-bold mb-2">Marketing emails</h2>
            <p className="text-muted">Booking confirmations, receipts, and session updates aren&rsquo;t marketing — we&rsquo;ll always send you those, they&rsquo;re part of running your booking, and they&rsquo;re not something you can opt out of while you have an upcoming session. If we send marketing emails (like newsletters or offers), that&rsquo;s separate: we&rsquo;ll only do that with your clear opt-in, and every marketing email has a one-click unsubscribe. We don&rsquo;t currently send SMS messages.</p>
          </div>

          <div>
            <h2 className="font-bold mb-2">How long we keep your information</h2>
            <ul className="text-muted space-y-1 list-disc pl-4">
              <li>Payment and financial records: 7 years, as required under New Zealand&rsquo;s tax record-keeping rules (Tax Administration Act 1994)</li>
              <li>Your account details: for as long as your account is active, and for a reasonable period afterwards in case you come back — we&rsquo;re working towards a fixed number here and will update this section once it&rsquo;s confirmed</li>
              <li>Care notes: kept only as long as they&rsquo;re useful for your safety in sessions, and removed sooner if you ask us to</li>
              <li>You can ask us to delete your information at any time, and we will, unless we&rsquo;re required to keep something (like financial records, for tax purposes)</li>
            </ul>
          </div>

          <div>
            <h2 className="font-bold mb-2">Your rights</h2>
            <p className="text-muted">You can ask to see, correct, or delete your personal information at any time — email <a href="mailto:kimberley@stretchyyoga.co.nz" className="font-bold text-ink">kimberley@stretchyyoga.co.nz</a> and we&rsquo;ll respond within 20 working days, as required under the NZ Privacy Act 2020. If you&rsquo;re not happy with our response, you can complain to New Zealand&rsquo;s Office of the Privacy Commissioner.</p>
          </div>

          <div>
            <h2 className="font-bold mb-2">If something goes wrong</h2>
            <p className="text-muted">If we ever have a privacy breach that&rsquo;s likely to cause you serious harm, we&rsquo;ll tell you and the Privacy Commissioner as soon as we reasonably can, as required by law.</p>
          </div>

          <div>
            <h2 className="font-bold mb-2">Under 18s</h2>
            <p className="text-muted">Stretchy is for adults 18 and over. If you&rsquo;re under 18, you can only join a Stretchy session if you&rsquo;re accompanied by a paying parent or legal guardian who attends the session with you — a guardian&rsquo;s permission alone isn&rsquo;t enough, they need to be there and to have paid for you. This doesn&rsquo;t apply to any session or event we specifically host for children or teens — those will always be clearly marketed as such, with their own age guidance. Some sessions are held at licensed venues (like bars or restaurants) — those venues have their own rules about where under-18s can go on the premises, even with a guardian present, and those rules apply on top of ours.</p>
          </div>

          <div>
            <h2 className="font-bold mb-2">Contact</h2>
            <p className="text-muted">Privacy Officer: Kimberley Torrie<br />
            <a href="mailto:kimberley@stretchyyoga.co.nz" className="font-bold text-ink">kimberley@stretchyyoga.co.nz</a><br />
            stretchyyoga.co.nz</p>
          </div>
        </div>
      </div>
    </main>
  );
}
