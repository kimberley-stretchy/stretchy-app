"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import SMark from "@/components/SMark";

type Session = {
  id: string;
  title: string;
  starts_at: string;
  duration_mins: number;
  location_name: string;
  social_stretch_venue: string | null;
  social_stretch_note: string | null;
};

export default function SocialStretchPage() {
  const params = useParams<{ id: string }>();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    fetch(`/api/admin/sessions?id=${params.id}`)
      .then(r => r.json())
      .then((data: Session[]) => {
        const found = Array.isArray(data) ? data.find(s => s.id === params.id) : null;
        setSession(found ?? null);
      });
  }, [params.id]);

  const title = session?.title ?? "Your session";
  const venue = session?.social_stretch_venue ?? "nearby";
  const note = session?.social_stretch_note ?? "Pay your own way — coffee & food. Everyone welcome.";

  return (
    <main className="min-h-screen bg-cream pb-20">
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <Link href="/sessions" className="text-ink"><SMark size={28} /></Link>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">Just finished</p>
        <div />
      </nav>

      <div className="px-4 max-w-lg mx-auto">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.20em] text-muted mb-2">
          {title} · Done
        </p>

        <h1 className="font-display font-bold text-ink mb-6" style={{ fontSize: "clamp(48px, 13vw, 64px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}>
          Social<br />stretch?
        </h1>

        {/* Where */}
        <div className="rounded-card p-5 mb-4" style={{ backgroundColor: "#0000FF", border: "2px solid #14110F" }}>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
            Host is heading to
          </p>
          <h2 className="font-bold text-white mb-2" style={{ fontSize: "24px", letterSpacing: "-0.02em" }}>
            {venue}
          </h2>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>{note}</p>
          <div className="flex gap-3 mt-4">
            <button className="flex-1 font-semibold rounded-pill py-3 text-sm transition-all" style={{ backgroundColor: "#14110F", color: "#F7F0E8" }}>
              ↗ Follow along
            </button>
            <Link href="/sessions" className="flex-1 text-center font-semibold rounded-pill py-3 text-sm transition-all" style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "#fff" }}>
              Maybe next time
            </Link>
          </div>
        </div>

        {/* Rate it prompt */}
        <div className="bg-white rounded-card border-2 border-ink p-5 mb-4">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-muted mb-3">How was it?</p>
          <p className="text-sm text-muted mb-4">Take 30 seconds to rate — it helps future sessions get better.</p>
          <Link href={`/rate/${params.id}`} className="block text-center font-semibold rounded-pill py-4 transition-all hover:brightness-110" style={{ backgroundColor: "#14110F", color: "#F7F0E8", fontSize: "15px" }}>
            Rate {title} →
          </Link>
        </div>
      </div>
    </main>
  );
}
