"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";
import HowToStretchy from "@/components/HowToStretchy";
import { googleCalendarUrl, downloadIcs } from "@/lib/calendar";
import { createClient } from "@/lib/supabase/client";

const STRETCHY_FEE = 23;
function calcPrice(target: number, spots: number) {
  return Math.round((target + STRETCHY_FEE) / Math.max(spots, 1));
}

type Session = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  duration_mins: number;
  location_name: string;
  location_address: string;
  getting_there: string | null;
  host_target: number;
  min_attendees: number;
  max_attendees: number;
  current_holds: number;
  social_stretch_venue: string | null;
  social_stretch_note: string | null;
};

export default function PlaceHeldPage({ params }: { params: { id: string } }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelState, setCancelState] = useState<"idle" | "confirm" | "cancelled">("idle");

  useEffect(() => {
    fetch(`/api/admin/sessions?id=${params.id}`)
      .then(r => r.json())
      .then((data: Session[]) => {
        const found = Array.isArray(data) ? data.find(s => s.id === params.id) : null;
        setSession(found ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.id]);

  async function handleCancel() {
    if (cancelState !== "confirm") { setCancelState("confirm"); return; }
    const supabase = createClient();
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession) return;

    const res = await fetch(`/api/holds?sessionId=${params.id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${authSession.access_token}` },
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Could not cancel. Please contact kimberley@stretchyyoga.co.nz");
      setCancelState("idle");
      return;
    }
    setCancelState("cancelled");
  }

  if (cancelState === "cancelled") {
    return (
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
        <p className="text-4xl mb-4">👋</p>
        <h1 className="font-display font-bold text-ink mb-2" style={{ fontSize: "36px", letterSpacing: "-0.03em" }}>Hold cancelled.</h1>
        <p className="text-sm text-muted leading-relaxed mb-8">No charge has been made. Your spot has been released back to the group.</p>
        <Link href="/sessions" className="font-semibold text-cream rounded-pill px-8 py-4 transition-all" style={{ backgroundColor: "#1A1A1A", fontSize: "15px" }}>Browse sessions →</Link>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center">
        <p className="font-mono text-xs text-muted">Loading…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
        <p className="text-muted mb-4">Session not found.</p>
        <Link href="/sessions" className="font-semibold text-ink">← Browse sessions</Link>
      </main>
    );
  }

  const startDate = new Date(session.starts_at);
  const endDate   = new Date(session.ends_at);
  const dayStr    = startDate.toLocaleDateString("en-NZ", { weekday: "short" }).toUpperCase();
  const timeStr   = startDate.toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
  const fullDateStr = startDate.toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" });

  const holds = session.current_holds || 0;
  const effectiveSpots = Math.max(holds, session.min_attendees);
  const currentPrice = calcPrice(session.host_target, effectiveSpots);

  const hoursUntil = (startDate.getTime() - Date.now()) / (1000 * 60 * 60);
  const canCancel = hoursUntil > 36;

  return (
    <main className="min-h-screen bg-cream pb-20">

      {/* Nav */}
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/home" className="text-ink"><SMark size={28} /></Link>
          <Link href={`/sessions/${params.id}`} className="text-muted hover:text-ink text-lg transition-colors" aria-label="Back">←</Link>
        </div>
        <Link href="/notifications" className="flex items-center px-3 py-1.5 rounded-pill relative" style={{ backgroundColor: "#F5EDE3", border: "1px solid #D4CFC9" }} aria-label="Notifications">
          <span className="text-base">🔔</span>
        </Link>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-4">

        {/* S-mark */}
        <div style={{ color: "#4FB8E0" }}><SMark size={88} /></div>

        <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-muted">Your hold</p>
        <h1 className="font-display font-bold text-ink" style={{ fontSize: "clamp(54px, 15vw, 70px)", letterSpacing: "-0.04em", lineHeight: "0.90" }}>
          Place<br />held.
        </h1>

        {/* Session summary */}
        <div className="bg-white rounded-card shadow-card p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-mono text-xs font-semibold text-muted uppercase tracking-wide">{dayStr} · {timeStr}</p>
            <span className="font-mono font-bold text-sm px-3 py-1 rounded-pill text-ink flex-shrink-0" style={{ backgroundColor: "#FFD166" }}>
              ${currentPrice}
            </span>
          </div>
          <h2 className="font-display font-bold text-ink leading-tight mb-0.5" style={{ fontSize: "24px" }}>{session.title}</h2>
          <p className="text-sm text-muted mb-3">{session.location_name}</p>
          <div className="flex items-center justify-between px-3 py-2.5 rounded-card" style={{ backgroundColor: "#E8F3FF" }}>
            <p className="text-sm leading-snug" style={{ color: "#1A4A80" }}>
              No charge yet — you can cancel any time up to 36 hrs out when the session is confirmed. The price can still get cheaper as more people join up to 2 hrs out. Your card is charged at that point, at that price.
            </p>
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#4CAF82" }} />
              <span className="font-mono text-xs font-bold tracking-wide" style={{ color: "#2C8FE0" }}>HOLDING</span>
            </div>
          </div>
        </div>

        {/* Bring a mate */}
        <div className="bg-white rounded-card shadow-card p-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-lg flex-shrink-0" style={{ backgroundColor: "#2C8FE0" }}>+</div>
            <div>
              <p className="font-bold text-ink">Want it cheaper for everyone?</p>
              <p className="text-sm text-muted">Share — each mate drops the price.</p>
            </div>
          </div>
          <button
            className="w-full flex items-center justify-center gap-2 font-semibold text-cream rounded-pill transition-all active:scale-[0.98] hover:brightness-110"
            style={{ backgroundColor: "#1A1A1A", height: "50px", fontSize: "15px" }}
            onClick={() => navigator.share?.({ title: `Join me at ${session.title}`, url: `${window.location.origin}/sessions/${session.id}` })}
          >
            ▶ Bring a mate · live price ${currentPrice}
          </button>
        </div>

        {/* Social stretch */}
        {session.social_stretch_venue && (
          <div className="rounded-card p-4 relative overflow-hidden" style={{ backgroundColor: "#2C8FE0" }}>
            <div className="absolute right-[-16px] top-[-12px] opacity-10" style={{ color: "#fff" }}>
              <SMark size={100} />
            </div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] mb-2" style={{ color: "rgba(255,255,255,0.65)" }}>Social Stretch 🤙</p>
            <p className="text-white font-semibold leading-snug mb-1" style={{ fontSize: "15px" }}>
              {session.social_stretch_venue}
            </p>
            {session.social_stretch_note && (
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.60)" }}>{session.social_stretch_note}</p>
            )}
          </div>
        )}

        {/* Calendar buttons */}
        <div className="flex gap-3">
          <a
            href={googleCalendarUrl({
              title: `Stretchy — ${session.title}`,
              startISO: session.starts_at,
              endISO: session.ends_at,
              location: session.location_address || session.location_name,
              description: `Your Stretchy session at ${session.location_name}.${session.social_stretch_venue ? ` Social Stretch after at ${session.social_stretch_venue}.` : ""}`,
            })}
            target="_blank" rel="noopener noreferrer"
            className="flex-1 text-center font-mono text-xs font-bold text-ink rounded-pill border border-border py-3 transition-all hover:bg-sand-dark active:scale-[0.98]"
          >
            + Google Cal
          </a>
          <button
            onClick={() => downloadIcs({
              title: `Stretchy — ${session.title}`,
              startISO: session.starts_at,
              endISO: session.ends_at,
              location: session.location_address || session.location_name,
              description: `Your Stretchy session at ${session.location_name}.`,
            })}
            className="flex-1 font-mono text-xs font-bold text-ink rounded-pill border border-border py-3 transition-all hover:bg-sand-dark active:scale-[0.98]"
          >
            + Apple Cal
          </button>
        </div>

        <HowToStretchy />

        {/* Cancel */}
        {canCancel ? (
          cancelState === "confirm" ? (
            <div className="bg-white rounded-card shadow-card p-5 space-y-3">
              <p className="font-bold text-ink text-sm">Are you sure you want to cancel?</p>
              <p className="text-sm text-muted">No charge will be made. Your spot goes back to the group.</p>
              <div className="flex gap-3">
                <button onClick={() => setCancelState("idle")} className="flex-1 font-mono text-xs font-bold py-3 rounded-pill border border-border text-ink hover:bg-sand-dark transition-colors">Keep my hold</button>
                <button onClick={handleCancel} className="flex-1 font-mono text-xs font-bold py-3 rounded-pill text-white transition-colors" style={{ backgroundColor: "#E63946" }}>Yes, cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={handleCancel} className="w-full font-mono text-xs font-bold py-3 rounded-pill border border-border text-muted hover:text-ink hover:bg-sand-dark transition-all">
              Cancel hold
            </button>
          )
        ) : (
          <div className="bg-white rounded-card shadow-card p-4">
            <p className="text-sm text-muted text-center">
              <span className="font-bold text-ink">Cancellations close 36 hours before the session.</span> You&apos;re locked in — see you there! 🤙
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
