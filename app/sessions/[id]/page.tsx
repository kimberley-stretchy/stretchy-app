"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import SMark from "@/components/SMark";
import HoldModal from "@/components/HoldModal";
import SessionView, { sessionStatus } from "@/components/sessions/SessionView";
import { createClient } from "@/lib/supabase/client";

type Session = {
  id: string;
  title: string;
  description: string | null;
  movement_type: string;
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
  state: string;
  social_stretch_venue: string | null;
  social_stretch_note: string | null;
  what_to_bring: string[] | null;
  my_hold_quantity?: number;
  im_interested?: boolean;
  teacherName?: string | null;
  teacherStyle?: string | null;
  gemName?: string | null;
  teacherHandle?: string | null;
  gemHandle?: string | null;
  venueHandle?: string | null;
  socialVenueHandle?: string | null;
};

export default function SessionDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [holding, setHolding] = useState(false);
  const [held, setHeld] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [interested, setInterested] = useState(false);
  const [interestBusy, setInterestBusy] = useState(false);
  const didInitInterest = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // A ref, not a dependency — Supabase fires onAuthStateChange periodically
  // (token refresh, tab focus) even when the user hasn't actually changed;
  // depending on accessToken directly tore down and rebuilt the poll timer
  // on every one of those, and re-triggered the full loading spinner.
  const accessTokenRef = useRef<string | null>(null);
  accessTokenRef.current = accessToken;

  useEffect(() => {
    if (!params.id) return;

    let cancelled = false;
    function loadSession(showLoading: boolean) {
      if (showLoading) setLoading(true);
      fetch(`/api/sessions/${params.id}`, {
        cache: "no-store",
        headers: accessTokenRef.current ? { Authorization: `Bearer ${accessTokenRef.current}` } : {},
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: Session | null) => {
          if (cancelled) return;
          setSession(data);
          setLoading(false);
        })
        .catch(() => { if (!cancelled) setLoading(false); });
    }

    loadSession(true);
    // Price and spots-to-go depend on live hold counts — keep this in sync
    // while someone's actually looking at the page, not just on next visit.
    const interval = setInterval(() => loadSession(false), 15000);

    // Coming back to this tab/page shouldn't wait out the rest of the 15s
    // window — and a page restored from the browser's back-forward cache
    // (common on mobile Safari) doesn't re-run effects at all otherwise,
    // so without this it can sit frozen on whatever it showed when the
    // visitor navigated away.
    function refreshOnReturn() {
      if (document.visibilityState === "visible") loadSession(false);
    }
    document.addEventListener("visibilitychange", refreshOnReturn);
    window.addEventListener("pageshow", refreshOnReturn);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refreshOnReturn);
      window.removeEventListener("pageshow", refreshOnReturn);
    };
  }, [params.id]);

  // Seed the "interested" toggle from the server once the session loads. Only
  // once, so a background refetch can't clobber a tap the visitor just made.
  useEffect(() => {
    if (session && !didInitInterest.current) {
      setInterested(!!session.im_interested);
      didInitInterest.current = true;
    }
  }, [session]);

  function handleHold() {
    if (!accessToken) {
      router.push(`/login?next=/sessions/${params.id}`);
      return;
    }
    setShowHoldModal(true);
  }

  async function toggleInterest() {
    if (!accessToken) {
      router.push(`/login?next=/sessions/${params.id}`);
      return;
    }
    if (interestBusy) return;
    const next = !interested;
    setInterested(next);
    setInterestBusy(true);
    try {
      const res = await fetch(`/api/sessions/${params.id}/interest`, {
        method: next ? "POST" : "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) setInterested(!next);
    } catch {
      setInterested(!next);
    }
    setInterestBusy(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center">
        <p className="font-mono text-xs text-muted">LOADING…</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-cream px-6 pt-6">
        <Link href="/sessions" className="font-mono text-xs font-bold uppercase tracking-widest text-muted">← Back</Link>
        <p className="mt-10 text-center text-muted text-sm">Session not found.</p>
      </main>
    );
  }

  if (session.state === "cancelled") {
    return (
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
        <p className="text-4xl mb-4">😔</p>
        <h1 className="font-display font-bold text-ink mb-2" style={{ fontSize: "36px", letterSpacing: "-0.03em" }}>
          This one&rsquo;s not going ahead.
        </h1>
        <p className="text-sm text-muted leading-relaxed mb-8">{session.title} has been called off. If you were holding a place, you pay nothing, and you&rsquo;ll have had an email.</p>
        <Link href="/sessions" className="font-semibold text-cream rounded-pill px-8 py-4 transition-all" style={{ backgroundColor: "#14110F", fontSize: "15px" }}>
          Browse other sessions →
        </Link>
      </main>
    );
  }

  const s = session;
  const { joiningClosed, full } = sessionStatus(s);
  const myPlaces = s.my_hold_quantity ?? 0;

  const action = (
    <>
          {myPlaces > 0 ? (
            <Link
              href={`/hold/${params.id}`}
              className="block w-full text-center rounded-pill py-[13px] px-[18px] font-bold text-[15px]"
              style={{ background: "#716F39", color: "#F7F0E8" }}
            >
              {myPlaces === 1 ? "Your place is held" : `Your ${myPlaces} places are held`} · Manage my booking
            </Link>
          ) : joiningClosed ? (
            <p className="m-0 w-full text-center rounded-pill py-[13px] px-[18px] font-bold text-[15px] border-2 border-ink/40 text-ink/60">
              Joining has closed for this one
            </p>
          ) : full ? (
            <p className="m-0 w-full text-center rounded-pill py-[13px] px-[18px] font-bold text-[15px] border-2 border-ink/40 text-ink/60">
              This one&rsquo;s full
            </p>
          ) : !accessToken ? (
            <Link
              href={`/login?next=/sessions/${params.id}`}
              className="block w-full text-center rounded-pill py-[13px] px-[18px] font-bold text-[15px]"
              style={{ background: "#14110F", color: "#F7F0E8" }}
            >
              Hold my place
            </Link>
          ) : (
            <button
              onClick={handleHold}
              disabled={holding || held}
              className="block w-full rounded-pill py-[13px] px-[18px] font-bold text-[15px] disabled:opacity-60"
              style={{ background: "#14110F", color: "#F7F0E8" }}
            >
              {holding ? "Holding your place…" : held ? "Held ✓" : "Hold my place"}
            </button>
          )}
    </>
  );

  return (
    <main className="min-h-screen bg-cream pb-16 max-w-lg mx-auto">
      <nav className="flex items-center justify-between px-[18px] py-4">
        <Link href="/sessions" className="text-ink" aria-label="Back to What's on"><SMark size={28} /></Link>
        <button
          onClick={toggleInterest}
          disabled={interestBusy}
          aria-pressed={interested}
          title={interested ? "You're interested — tap to remove" : "I'm interested — tell me about this one"}
          className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-base transition-colors"
          style={interested
            ? { background: "#902F8A", color: "#F7F0E8", borderColor: "#902F8A" }
            : { borderColor: "#14110F", color: "#14110F", background: "transparent" }}
        >
          {interested ? "♥" : "♡"}
        </button>
      </nav>

      <SessionView s={s} action={action} />

      {showHoldModal && session && accessToken && (
        <HoldModal
          sessionId={session.id}
          sessionTitle={session.title}
          accessToken={accessToken}
          onClose={() => setShowHoldModal(false)}
        />
      )}
    </main>
  );
}
