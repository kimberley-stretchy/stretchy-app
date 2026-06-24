"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import SMark from "@/components/SMark";

type Session = {
  id: string;
  title: string;
  starts_at: string;
  location_name: string;
};

function CancelledContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/admin/sessions?id=${sessionId}`)
      .then(r => r.json())
      .then((data: Session[]) => {
        const found = Array.isArray(data) ? data.find(s => s.id === sessionId) : null;
        setSession(found ?? null);
      });
  }, [sessionId]);

  const title = session?.title ?? "Your session";
  const dateStr = session
    ? new Date(session.starts_at).toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" }).toUpperCase() + " · " +
      new Date(session.starts_at).toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase()
    : "";

  return (
    <main className="min-h-screen bg-cream pb-20">
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <Link href="/sessions" className="text-ink"><SMark size={28} /></Link>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">
          Notification · 36H Check
        </p>
        <Link href="/sessions" className="text-muted hover:text-ink text-2xl font-light transition-colors leading-none" aria-label="Dismiss">×</Link>
      </nav>

      <div className="px-4 max-w-lg mx-auto">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.20em] text-muted mb-3">
          Didn&apos;t hit the minimum this time
        </p>

        <h1 className="font-display font-bold text-ink mb-5" style={{ fontSize: "clamp(52px, 14vw, 68px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}>
          Not<br />this time.
        </h1>

        <p className="text-sm text-ink leading-relaxed mb-6">
          <strong>{title}</strong> didn&apos;t have enough people to go ahead.
          Your hold has been released. <strong>Nothing has been charged.</strong> We hope to see you at the next one.
        </p>

        {/* Receipt */}
        <div className="bg-white rounded-card shadow-card mb-4 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
            <span className="text-sm text-ink">{title}{dateStr ? ` · ${dateStr}` : ""}</span>
            <span className="font-mono text-xs font-bold text-muted tracking-wide">HOLD</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-muted">Charged to card</span>
            <span className="font-mono font-bold text-base" style={{ color: "#4CAF82" }}>$0.00</span>
          </div>
        </div>

        {/* Suggest */}
        <div className="rounded-card p-5 mb-4" style={{ backgroundColor: "#A535C7" }}>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] mb-2" style={{ color: "rgba(245,237,227,0.6)" }}>
            Want it to happen?
          </p>
          <h2 className="font-display font-bold mb-2" style={{ fontSize: "28px", letterSpacing: "-0.03em", color: "#F5EDE3" }}>
            Float it to the community.
          </h2>
          <p className="text-sm mb-4" style={{ color: "rgba(245,237,227,0.8)" }}>
            Add it to the suggestion list — if enough people vote, it gets picked up.
          </p>
          <Link href="/suggest" className="block text-center font-semibold rounded-pill py-3.5 transition-all hover:brightness-110 active:scale-[0.98]" style={{ backgroundColor: "#F5EDE3", color: "#1A1A1A", fontSize: "15px" }}>
            + Add to suggestions
          </Link>
        </div>

        <Link href="/sessions" className="block text-center font-semibold rounded-pill py-4 transition-all" style={{ backgroundColor: "#1A1A1A", color: "#F5EDE3", fontSize: "15px" }}>
          Browse what&apos;s still on →
        </Link>
      </div>
    </main>
  );
}

export default function CancelledPage() {
  return <Suspense><CancelledContent /></Suspense>;
}
