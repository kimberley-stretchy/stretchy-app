"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import SMark from "@/components/SMark";
import { calculatePrice } from "@/lib/pricing";

type Session = {
  id: string;
  title: string;
  starts_at: string;
  location_name: string;
  location_address: string;
  getting_there: string | null;
  cost_base: number;
  revenue_target: number;
  min_attendees: number;
  max_attendees: number;
  current_holds: number;
  social_stretch_venue: string | null;
  social_stretch_note: string | null;
};

function GoingAheadContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Session | null) => setSession(data));
  }, [sessionId]);

  const title = session?.title ?? "Your session";
  const holds = session?.current_holds ?? 0;
  const currentPrice = session ? calculatePrice(session.cost_base, session.revenue_target, Math.max(holds, session.min_attendees)) : 0;
  const startDate = session ? new Date(session.starts_at) : null;
  const dateStr = startDate
    ? startDate.toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" })
    : "";
  const timeStr = startDate
    ? startDate.toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase()
    : "";

  return (
    <main className="min-h-screen pb-20" style={{ backgroundColor: "#0000FF" }}>
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <Link href="/sessions"><SMark size={28} className="text-white" /></Link>
        <p className="font-mono text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.7)" }}>
          Notification · 36H Confirmed
        </p>
        <Link href="/sessions" className="text-2xl font-light leading-none" style={{ color: "rgba(255,255,255,0.7)" }} aria-label="Dismiss">×</Link>
      </nav>

      <div className="px-4 max-w-lg mx-auto">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.20em] mb-3" style={{ color: "rgba(255,255,255,0.6)" }}>
          It&apos;s happening
        </p>

        <h1 className="font-display font-bold mb-5 text-white" style={{ fontSize: "clamp(60px, 16vw, 76px)", letterSpacing: "-0.04em", lineHeight: "0.88" }}>
          Going<br />ahead.
        </h1>

        <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.85)" }}>
          <strong className="text-white">{title}</strong> is confirmed. The price can still drop as more people join — right up to 2 hours before. Your card is charged at that final price.
        </p>

        {/* Price card */}
        <div className="bg-white rounded-card border-2 border-ink p-5 mb-4">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-muted mb-1">Current price</p>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-display font-bold text-ink" style={{ fontSize: "52px", letterSpacing: "-0.03em" }}>${currentPrice.toFixed(2)}</span>
            <span className="font-mono text-sm font-bold text-muted">incl. GST</span>
          </div>
          <p className="text-xs text-muted">May still drop before 2h lock-in · {holds} people holding</p>
        </div>

        {/* Session details */}
        <div className="bg-white rounded-card border-2 border-ink p-5 mb-4 space-y-2">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-muted mb-3">Your session</p>
          <p className="font-bold text-ink">{title}</p>
          {dateStr && <p className="text-sm text-muted">{dateStr} · {timeStr}</p>}
          {session?.location_name && <p className="text-sm text-muted">{session.location_name}</p>}
          {session?.getting_there && <p className="text-xs text-muted mt-1">{session.getting_there}</p>}
        </div>

        {/* Social stretch */}
        {session?.social_stretch_venue && (
          <div className="rounded-card p-5 mb-4" style={{ backgroundColor: "#902F8A", border: "2px solid #14110F" }}>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] mb-2" style={{ color: "rgba(245,237,227,0.6)" }}>
              Social Stretch after 🤙
            </p>
            <p className="font-bold text-white">{session.social_stretch_venue}</p>
            {session.social_stretch_note && <p className="text-sm mt-1" style={{ color: "rgba(245,237,227,0.8)" }}>{session.social_stretch_note}</p>}
          </div>
        )}

        <Link href={`/sessions/${sessionId}`} className="block text-center font-semibold rounded-pill py-4 transition-all" style={{ backgroundColor: "#14110F", color: "#F7F0E8", fontSize: "15px" }}>
          View my booking →
        </Link>
      </div>
    </main>
  );
}

export default function GoingAheadPage() {
  return <Suspense><GoingAheadContent /></Suspense>;
}
