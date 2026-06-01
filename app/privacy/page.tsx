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
          <p className="font-mono text-xs text-muted uppercase tracking-widest">NZ Privacy Act 2020 · Last updated June 2026</p>
        </div>

        <div className="bg-white rounded-card shadow-card p-5 space-y-4 text-sm text-ink leading-relaxed">
          <div>
            <h2 className="font-bold mb-2">What we collect</h2>
            <ul className="text-muted space-y-1 list-disc pl-4">
              <li>Name, email address, mobile number</li>
              <li>Neighbourhood and movement preferences</li>
              <li>Payment method (stored securely by Stripe — we never see your card number)</li>
              <li>Session holds, ratings, and notes you choose to share with hosts</li>
              <li>Usage data (which sessions you view, when you log in)</li>
            </ul>
          </div>

          <div>
            <h2 className="font-bold mb-2">Why we collect it</h2>
            <ul className="text-muted space-y-1 list-disc pl-4">
              <li>To match you with sessions in your area</li>
              <li>To process holds and payments</li>
              <li>To send you session confirmations, updates, and receipts</li>
              <li>To improve the platform and fix problems</li>
            </ul>
          </div>

          <div>
            <h2 className="font-bold mb-2">Who we share it with</h2>
            <ul className="text-muted space-y-1 list-disc pl-4">
              <li><strong>Stripe</strong> — payment processing (stripe.com/privacy)</li>
              <li><strong>Supabase</strong> — database hosting (supabase.com/privacy)</li>
              <li><strong>Resend</strong> — transactional email (resend.com/privacy)</li>
              <li><strong>Vercel</strong> — app hosting (vercel.com/legal/privacy-policy)</li>
              <li><strong>Session hosts</strong> — your first name and any notes you add when holding a place</li>
            </ul>
            <p className="text-muted mt-2">We do not sell your data. We do not use it for advertising.</p>
          </div>

          <div>
            <h2 className="font-bold mb-2">Your rights (NZ Privacy Act 2020)</h2>
            <p className="text-muted">You have the right to access, correct, or request deletion of your personal information at any time. To do any of these, email <a href="mailto:kimberley@stretchyyoga.co.nz" className="font-bold text-ink">kimberley@stretchyyoga.co.nz</a> and we'll sort it within 20 working days.</p>
          </div>

          <div>
            <h2 className="font-bold mb-2">Cookies</h2>
            <p className="text-muted">We use session cookies for login (via Supabase Auth) and localStorage to remember your saved sessions. No third-party tracking cookies.</p>
          </div>

          <div>
            <h2 className="font-bold mb-2">Contact</h2>
            <p className="text-muted">Privacy Officer: Kimberley Torrie<br />
            <a href="mailto:kimberley@stretchyyoga.co.nz" className="font-bold text-ink">kimberley@stretchyyoga.co.nz</a><br />
            stretchy.social</p>
          </div>
        </div>
      </div>
    </main>
  );
}
