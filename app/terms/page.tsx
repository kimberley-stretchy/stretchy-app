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
          <p className="font-mono text-xs text-muted uppercase tracking-widest">Last updated June 2026</p>
        </div>

        <div className="bg-white rounded-card shadow-card p-5 space-y-4 text-sm text-ink leading-relaxed">
          <div>
            <h2 className="font-bold mb-2">The short version</h2>
            <p className="text-muted">Stretchy connects people who want to move with people who teach. You hold a place, the price drops as the room fills, and everyone pays the same final price at lock-in. If a session doesn't reach its minimum, it doesn't go ahead and you're not charged.</p>
          </div>

          <div>
            <h2 className="font-bold mb-2">Holds &amp; payments</h2>
            <p className="text-muted">Placing a hold authorises a payment — your card isn't charged until 2 hours before the session (lock-in). If the session cancels before the 24hr check, your hold is released and you pay nothing. Refunds are processed within 5–10 business days depending on your bank.</p>
          </div>

          <div>
            <h2 className="font-bold mb-2">Cancellations</h2>
            <p className="text-muted">You can cancel your hold up to 24 hours before a session for a full release. Within 24 hours, cancellations are at the host's discretion. If Stretchy cancels a session for any reason, you receive a full refund.</p>
          </div>

          <div>
            <h2 className="font-bold mb-2">Host responsibilities</h2>
            <p className="text-muted">Hosts are vetted by Stretchy before they can create sessions. They're responsible for the safety, delivery, and quality of their sessions. Stretchy is the platform — hosts are independent practitioners.</p>
          </div>

          <div>
            <h2 className="font-bold mb-2">Your data</h2>
            <p className="text-muted">We collect only what we need to run the platform. See our <Link href="/privacy" className="font-bold text-ink underline">Privacy Policy</Link> for the full picture.</p>
          </div>

          <div>
            <h2 className="font-bold mb-2">Questions?</h2>
            <p className="text-muted">Email us at <a href="mailto:kimberley@stretchyyoga.co.nz" className="font-bold text-ink">kimberley@stretchyyoga.co.nz</a> — we're a small team and we actually reply.</p>
          </div>
        </div>

        <p className="text-xs text-muted text-center">Full legal terms coming soon. This page is a summary.</p>
      </div>
    </main>
  );
}
