"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";
import HowToStretchy from "@/components/HowToStretchy";
import { googleCalendarUrl, downloadIcs } from "@/lib/calendar";
import { createClient } from "@/lib/supabase/client";
import { calculatePrice } from "@/lib/pricing";

type Session = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  duration_mins: number;
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
  my_hold_quantity?: number;
};

export default function PlaceHeldPage({ params }: { params: { id: string } }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelState, setCancelState] = useState<"idle" | "confirm" | "cancelled">("idle");
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  function flashShareMsg(msg: string) {
    setShareMsg(msg);
    setTimeout(() => setShareMsg(null), 2500);
  }

  async function copyShareLink(url: string, msg = "Link copied!") {
    try {
      await navigator.clipboard.writeText(url);
      flashShareMsg(msg);
    } catch {
      flashShareMsg("Couldn't copy — long-press the link to copy it.");
    }
  }

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    function loadSession(showLoading: boolean) {
      if (showLoading) setLoading(true);
      supabase.auth.getSession().then(({ data: { session: authSession } }) => {
        fetch(`/api/sessions/${params.id}`, {
          cache: "no-store",
          headers: authSession ? { Authorization: `Bearer ${authSession.access_token}` } : {},
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((data: Session | null) => {
            if (cancelled) return;
            setSession(data);
            setLoading(false);
          })
          .catch(() => { if (!cancelled) setLoading(false); });
      });
    }

    loadSession(true);
    // Holds count and price change as others join — keep this live while
    // someone's actually looking at their held spot.
    const interval = setInterval(() => loadSession(false), 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [params.id]);

  const [cancelQty, setCancelQty] = useState(1);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMsg, setCancelMsg] = useState<string | null>(null);

  function startCancel() {
    setCancelQty(session?.my_hold_quantity ?? 1);
    setCancelState("confirm");
  }

  async function handleCancel() {
    const supabase = createClient();
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession) return;

    setCancelling(true);
    const res = await fetch(`/api/holds?sessionId=${params.id}&quantity=${cancelQty}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${authSession.access_token}` },
    });

    const data = await res.json();
    setCancelling(false);
    if (!res.ok) {
      alert(data.error ?? "Could not cancel. Please contact kimberley@stretchyyoga.co.nz");
      setCancelState("idle");
      return;
    }

    if (data.remainingSpots > 0) {
      // Partial cancel — still holding, just fewer spots. Refresh in place
      // rather than showing the full "cancelled" screen.
      setSession((prev) => prev ? {
        ...prev,
        my_hold_quantity: data.remainingSpots,
        current_holds: Math.max(0, prev.current_holds - cancelQty),
      } : prev);
      setCancelState("idle");
      setCancelMsg(`${cancelQty} spot${cancelQty === 1 ? "" : "s"} cancelled — you still have ${data.remainingSpots} held.`);
      setTimeout(() => setCancelMsg(null), 4000);
    } else {
      setCancelState("cancelled");
    }
  }

  if (cancelState === "cancelled") {
    return (
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
        <p className="text-4xl mb-4">👋</p>
        <h1 className="font-display font-bold text-ink mb-2" style={{ fontSize: "36px", letterSpacing: "-0.03em" }}>Hold cancelled.</h1>
        <p className="text-sm text-muted leading-relaxed mb-8">No charge has been made. Your spot has been released back to the group.</p>
        <Link href="/sessions" className="font-semibold text-cream rounded-pill px-8 py-4 transition-all" style={{ backgroundColor: "#14110F", fontSize: "15px" }}>Browse sessions →</Link>
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
  const dayStr    = startDate.toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "short" }).toUpperCase();
  const timeStr   = startDate.toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
  const fullDateStr = startDate.toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "long", day: "numeric", month: "long" });

  const holds = session.current_holds || 0;
  const effectiveSpots = Math.max(holds, session.min_attendees);
  const currentPrice = calculatePrice(session.cost_base, session.revenue_target, effectiveSpots);
  const myQty = session.my_hold_quantity ?? 1;

  const hoursUntil = (startDate.getTime() - Date.now()) / (1000 * 60 * 60);
  const canCancel = hoursUntil > 36;

  return (
    <main className="min-h-screen bg-cream pb-20">

      {/* Nav */}
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <Link href="/home" className="text-ink"><SMark size={28} /></Link>
        <Link href="/notifications" className="flex items-center px-3 py-1.5 rounded-pill relative" style={{ backgroundColor: "#F7F0E8", border: "1px solid #D4CFC9" }} aria-label="Notifications">
          <span className="text-base">🔔</span>
        </Link>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-4">

        {/* S-mark */}
        <div style={{ color: "#29ABE2" }}><SMark size={88} /></div>

        <p className="font-mono text-xs font-bold uppercase tracking-[0.22em] text-muted">Your hold</p>
        <h1 className="font-display font-bold text-ink" style={{ fontSize: "clamp(54px, 15vw, 70px)", letterSpacing: "-0.04em", lineHeight: "0.90" }}>
          Place<br />held.
        </h1>
        {myQty > 1 && (
          <p className="font-mono text-sm font-bold text-ink">
            You&rsquo;ve booked <span style={{ color: "#902F8A" }}>{myQty} spots</span>.
          </p>
        )}

        {/* Session summary */}
        <div className="bg-white rounded-card border-2 border-ink p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-mono text-xs font-semibold text-muted uppercase tracking-wide">{dayStr} · {timeStr}</p>
            <div className="text-right flex-shrink-0">
              <span className="font-mono font-bold text-sm px-3 py-1 rounded-pill text-ink inline-block" style={{ backgroundColor: "#FCBB16" }}>
                ${currentPrice.toFixed(2)} / spot
              </span>
              {myQty > 1 && (
                <p className="font-mono text-[10px] font-bold text-muted mt-1">
                  TOTAL ({myQty}): ${(currentPrice * myQty).toFixed(2)}
                </p>
              )}
            </div>
          </div>
          <h2 className="font-display font-bold text-ink leading-tight mb-0.5" style={{ fontSize: "24px" }}>{session.title}</h2>
          <p className="text-sm text-muted mb-3">{session.location_name}</p>
          <div className="flex items-center justify-between px-3 py-2.5 rounded-card" style={{ backgroundColor: "#E8F3FF", border: "2px solid #14110F" }}>
            <p className="text-sm leading-snug" style={{ color: "#1A4A80" }}>
              No charge yet — you can cancel any time up to 36 hrs out when the session is confirmed. The price can still get cheaper as more people join up to 2 hrs out. Your card is charged at that point, at that price.
            </p>
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-3">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: "#716F39" }} />
              <span className="font-mono text-xs font-bold tracking-wide" style={{ color: "#0000FF" }}>HOLDING</span>
            </div>
          </div>
        </div>

        {/* Bring a mate */}
        <div className="bg-white rounded-card border-2 border-ink p-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-lg flex-shrink-0" style={{ backgroundColor: "#0000FF" }}>+</div>
            <div>
              <p className="font-bold text-ink">Want it cheaper for everyone?</p>
              <p className="text-sm text-muted">Share — each mate drops the price.</p>
            </div>
          </div>
          {(() => {
            const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/sessions/${session.id}`;
            const shareText = `Join me at ${session.title} — the more of us who go, the cheaper it gets.`;
            const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);
            const smsHref = `sms:${isIOS ? "&" : "?"}body=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
            const mailHref = `mailto:?subject=${encodeURIComponent(`Join me at ${session.title}`)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
            const fbHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

            return (
              <>
                <button
                  className="w-full flex items-center justify-center gap-2 font-semibold text-cream rounded-pill transition-all active:scale-[0.98] hover:brightness-110"
                  style={{ backgroundColor: "#14110F", height: "50px", fontSize: "15px" }}
                  onClick={() => copyShareLink(shareUrl, "Link copied — send it to a mate!")}
                >
                  🔗 Copy invite link · live price ${currentPrice.toFixed(2)}
                </button>

                <div className="flex justify-between gap-2 mt-3">
                  {[
                    { label: "Text", icon: "💬", href: smsHref },
                    { label: "Email", icon: "✉️", href: mailHref },
                    { label: "Facebook", icon: "f", href: fbHref },
                  ].map((c) => (
                    <a
                      key={c.label}
                      href={c.href}
                      target={c.href.startsWith("http") ? "_blank" : undefined}
                      rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
                      className="flex-1 flex flex-col items-center gap-1 py-2 rounded-card hover:bg-sand-dark transition-colors"
                    >
                      <span className="w-10 h-10 rounded-full border-2 border-ink flex items-center justify-center text-base font-bold bg-white">{c.icon}</span>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted">{c.label}</span>
                    </a>
                  ))}
                  {[
                    { label: "Instagram", icon: "📸" },
                    { label: "TikTok", icon: "🎵" },
                  ].map((c) => (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => copyShareLink(shareUrl, `Link copied — paste it into your ${c.label} story!`)}
                      className="flex-1 flex flex-col items-center gap-1 py-2 rounded-card hover:bg-sand-dark transition-colors"
                    >
                      <span className="w-10 h-10 rounded-full border-2 border-ink flex items-center justify-center text-base font-bold bg-white">{c.icon}</span>
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-muted">{c.label}</span>
                    </button>
                  ))}
                </div>

                {shareMsg && (
                  <p className="text-center text-sm font-semibold text-ink mt-2">{shareMsg}</p>
                )}
              </>
            );
          })()}
        </div>

        {/* Good to know — directions, props, anything HQ flagged at session creation */}
        {session.getting_there && (
          <div className="bg-white rounded-card border-2 border-ink p-4">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-muted mb-2">Good to know</p>
            <p className="text-sm text-ink leading-relaxed whitespace-pre-line">{session.getting_there}</p>
          </div>
        )}

        {/* Social stretch */}
        {session.social_stretch_venue && (
          <div className="rounded-card p-4 relative overflow-hidden" style={{ backgroundColor: "#0000FF", border: "2px solid #14110F" }}>
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
        {cancelMsg && (
          <p className="text-center text-sm font-semibold text-ink">{cancelMsg}</p>
        )}
        {canCancel ? (
          cancelState === "confirm" ? (
            <div className="bg-white rounded-card border-2 border-ink p-5 space-y-3">
              <p className="font-bold text-ink text-sm">
                {myQty > 1 ? "How many spots do you want to cancel?" : "Are you sure you want to cancel?"}
              </p>
              {myQty > 1 && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCancelQty((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 rounded-full border-2 border-ink flex items-center justify-center font-bold"
                  >
                    −
                  </button>
                  <span className="font-mono text-lg font-bold min-w-[70px] text-center">{cancelQty} of {myQty}</span>
                  <button
                    type="button"
                    onClick={() => setCancelQty((q) => Math.min(myQty, q + 1))}
                    className="w-9 h-9 rounded-full border-2 border-ink flex items-center justify-center font-bold"
                  >
                    +
                  </button>
                </div>
              )}
              <p className="text-sm text-muted">
                {cancelQty >= myQty
                  ? "No charge will be made. Your spot goes back to the group."
                  : `You'll keep ${myQty - cancelQty} spot${myQty - cancelQty === 1 ? "" : "s"} held. Nothing extra is charged.`}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setCancelState("idle")} disabled={cancelling} className="flex-1 font-mono text-xs font-bold py-3 rounded-pill border border-border text-ink hover:bg-sand-dark transition-colors">Keep my hold</button>
                <button onClick={handleCancel} disabled={cancelling} className="flex-1 font-mono text-xs font-bold py-3 rounded-pill text-white transition-colors disabled:opacity-60" style={{ backgroundColor: "#C6362E" }}>
                  {cancelling ? "Cancelling…" : cancelQty >= myQty ? "Yes, cancel" : `Cancel ${cancelQty}`}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={startCancel} className="w-full font-mono text-xs font-bold py-3 rounded-pill border border-border text-muted hover:text-ink hover:bg-sand-dark transition-all">
              {myQty > 1 ? "Cancel some or all spots" : "Cancel hold"}
            </button>
          )
        ) : (
          <div className="bg-white rounded-card border-2 border-ink p-4">
            <p className="text-sm text-muted text-center">
              <span className="font-bold text-ink">Cancellations close 36 hours before the session.</span> You&apos;re locked in — see you there! 🤙
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
