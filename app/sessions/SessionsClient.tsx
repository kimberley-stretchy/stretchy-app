"use client";

import { useState } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";
import HowToStretchy from "@/components/HowToStretchy";
import { MenuDrawer } from "@/components/MenuDrawer";

const STRETCHY_FEE = 23;
function calcPrice(target: number, spots: number) {
  return Math.round((target + STRETCHY_FEE) / Math.max(spots, 1));
}

const TYPE_COLORS: Record<string, string> = {
  yoga: "#A535C7", pilates: "#2A3FE0", breath: "#7A8330",
  sound: "#4FB8E0", flow: "#FF6B35", run: "#E63946", hiit: "#2C8FE0",
};
const TYPE_LABELS: Record<string, string> = {
  yoga: "YOGA", pilates: "PILATES", breath: "BREATH",
  sound: "SOUND", flow: "FLOW", run: "RUN", hiit: "HIIT",
};

type DBSession = {
  id: string;
  title: string;
  movement_type: string;
  starts_at: string;
  duration_mins: number;
  location_name: string;
  host_target: number;
  min_attendees: number;
  max_attendees: number;
  current_holds: number;
  state: string;
};

function getStatus(s: DBSession) {
  const holds = s.current_holds || 0;
  const confirmed = holds >= s.min_attendees || s.state === "confirmed";
  const currentPrice = confirmed
    ? calcPrice(s.host_target, Math.max(holds, s.min_attendees))
    : calcPrice(s.host_target, s.min_attendees);

  if (confirmed) {
    const fillPct = holds / s.max_attendees;
    if (fillPct >= 0.8) return { label: "⚡ ALMOST FULL", color: "#2C8FE0", price: currentPrice };
    return { label: "PRICE DROPPING", color: "#FFD166", price: currentPrice };
  }
  const need = s.min_attendees - holds;
  return { label: `${need} MORE TO CONFIRM`, color: "#FF6B35", price: currentPrice };
}

function SessionCard({ s }: { s: DBSession }) {
  const typeColor = TYPE_COLORS[s.movement_type] ?? "#888";
  const typeLabel = TYPE_LABELS[s.movement_type] ?? s.movement_type.toUpperCase();
  const initial   = s.movement_type.charAt(0).toUpperCase();
  const status    = getStatus(s);
  const holds     = s.current_holds || 0;
  const startDate = new Date(s.starts_at);
  const dayStr    = startDate.toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" }).toUpperCase();
  const timeStr   = startDate.toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
  const confirmed = holds >= s.min_attendees || s.state === "confirmed";

  return (
    <Link href={`/sessions/${s.id}`} className="block group">
      <div className="bg-white rounded-card shadow-card group-hover:shadow-card-hover transition-shadow duration-200 p-4"
        style={confirmed ? { outline: "2px solid #4CAF82" } : undefined}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-3 py-1.5 rounded-pill" style={{ backgroundColor: "#1A1A1A", color: "#F5EDE3" }}>{dayStr}</span>
            <span className="font-mono text-xs font-semibold px-3 py-1.5 rounded-pill" style={{ backgroundColor: "#E8D9C8", color: "#6B6B6B" }}>{timeStr}</span>
          </div>
          <div className="w-10 h-10 rounded-card flex items-center justify-center font-bold text-base text-white flex-shrink-0" style={{ backgroundColor: typeColor }}>
            {initial}
          </div>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="font-mono text-xs font-bold px-2.5 py-1.5 rounded-pill" style={{ backgroundColor: typeColor, color: "#fff" }}>{typeLabel}</span>
        </div>
        <h3 className="font-display font-bold text-ink leading-tight mb-1" style={{ fontSize: "22px" }}>{s.title}</h3>
        <p className="text-sm text-muted mb-3">{s.location_name}</p>
        <div className="flex gap-1.5 flex-wrap mb-3">
          {Array.from({ length: s.min_attendees }).map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: i < holds ? typeColor : "rgba(26,26,26,0.12)" }} />
          ))}
          {holds > s.min_attendees && <span className="font-mono text-xs font-bold" style={{ color: typeColor }}>+{holds - s.min_attendees}</span>}
        </div>
        <div className="flex items-center justify-between">
          <p className="font-mono text-xs font-bold uppercase tracking-wide" style={{ color: status.color }}>
            {holds}/{s.min_attendees} HELD · {status.label}
          </p>
          <div className="font-mono font-bold text-sm px-3 py-1.5 rounded-pill text-white flex-shrink-0 flex items-baseline gap-0.5" style={{ backgroundColor: typeColor }}>
            <span className="text-xs font-semibold">$</span><span>{status.price}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function SessionsClient({ sessions }: { sessions: DBSession[] }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-cream">
      <nav className="flex items-center justify-between px-5 py-4 max-w-lg mx-auto">
        <Link href="/" className="text-ink"><SMark size={32} /></Link>
        <button onClick={() => setMenuOpen(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-pill font-mono text-xs font-bold uppercase tracking-widest text-ink border border-border hover:bg-sand-dark transition-colors">
          ≡ MENU
        </button>
        <Link href="/notifications" className="flex items-center px-3 py-1.5 rounded-pill relative" style={{ backgroundColor: "#F5EDE3", border: "1px solid #D4CFC9" }} aria-label="My holds">
          <span className="text-base">🎟</span>
        </Link>
      </nav>

      <section className="px-5 pb-4 max-w-lg mx-auto">
        <h1 className="font-display font-bold text-ink" style={{ fontSize: "clamp(40px,11vw,54px)", letterSpacing: "-0.03em", lineHeight: "1.0" }}>
          Pick your<br />stretch.
        </h1>
        <p className="text-muted text-sm mt-2">
          {sessions.length === 0
            ? "No sessions yet — check back soon."
            : `${sessions.length} session${sessions.length !== 1 ? "s" : ""} coming up.`}
        </p>
      </section>

      <section className="px-4 pb-10 max-w-lg mx-auto space-y-3">
        {sessions.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-3xl mb-3">🧘</p>
            <p className="font-bold text-ink mb-2">Nothing on yet</p>
            <p className="text-muted text-sm">Sessions will appear here once they're listed. Check back soon!</p>
          </div>
        ) : (
          sessions.map(s => <SessionCard key={s.id} s={s} />)
        )}
      </section>

      <div className="px-4 pb-4 max-w-lg mx-auto"><HowToStretchy /></div>

      <div className="px-4 pb-12 max-w-lg mx-auto">
        <div className="card text-center py-6">
          <p className="text-muted text-sm mb-3">Don't see what you're after?</p>
          <Link href="/suggest" className="btn-ghost text-sm px-5 py-2.5">Suggest a Stretchy</Link>
        </div>
      </div>

      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </main>
  );
}
