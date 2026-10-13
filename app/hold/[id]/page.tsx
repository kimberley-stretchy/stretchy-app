"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BookingView, { type BookingSession, BOOKING_INK, BOOKING_YELLOW, bookingButton } from "@/components/sessions/BookingView";
import { createClient } from "@/lib/supabase/client";
import { sessionTimes } from "@/lib/sessionTimes";
import { cancelLabel } from "@/lib/places";

type Session = BookingSession;

export default function PlaceHeldPage({ params }: { params: { id: string } }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelState, setCancelState] = useState<"idle" | "confirm" | "cancelled">("idle");
  const router = useRouter();

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

    // Returning to this tab/page (including restoration from the browser's
    // back-forward cache, common on mobile Safari, which otherwise doesn't
    // re-run effects at all) shouldn't wait out the rest of the 15s window.
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

  // This page is only for someone holding a place. If the signed-in person has
  // no active hold here (never booked, or cancelled), send them to the session
  // page rather than showing "holding 0".
  const notHolding = !loading && !!session && session.state !== "cancelled" && cancelState !== "cancelled" && (session.my_hold_quantity ?? 0) < 1;
  useEffect(() => {
    if (notHolding) router.replace(`/sessions/${params.id}`);
  }, [notHolding, router, params.id]);

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
      setCancelMsg(`${cancelQty === 1 ? "1 place" : `${cancelQty} places`} cancelled. You still have ${data.remainingSpots === 1 ? "1 place" : `${data.remainingSpots} places`} held.`);
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
        <p className="text-sm text-muted leading-relaxed mb-8">Done. Nothing charged, and your place has gone back to the group. If your bank shows a pending amount, it&rsquo;ll drop off in a few days.</p>
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

  if (session.state === "cancelled") {
    return (
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
        <p className="text-4xl mb-4">😔</p>
        <h1 className="font-display font-bold text-ink mb-2" style={{ fontSize: "36px", letterSpacing: "-0.03em" }}>This one&rsquo;s not going ahead.</h1>
        <p className="text-sm text-muted leading-relaxed mb-8">{session.title} has been called off. You pay nothing. If your bank shows a pending amount, it&rsquo;ll drop off in a few days.</p>
        <Link href="/sessions" className="font-semibold text-cream rounded-pill px-8 py-4 transition-all" style={{ backgroundColor: "#14110F", fontSize: "15px" }}>Browse other sessions →</Link>
      </main>
    );
  }

  if (notHolding) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center">
        <p className="font-mono text-xs text-muted">Loading…</p>
      </main>
    );
  }

  const myQty = Math.max(1, session.my_hold_quantity ?? 1);
  // Free cancelling runs until exactly 36 hrs out; after that the button is hidden.
  const canCancel = sessionTimes(session).phase === "before36";
  const INK = BOOKING_INK;
  const YELLOW = BOOKING_YELLOW;
  const filledBtn = bookingButton;

  const cancelArea = (
    <>
        {session.my_card_failed && (
          <div className="border-2 rounded-[22px] p-4 flex flex-col gap-3" style={{ borderColor: INK, background: "#FFFFFF" }}>
            <p className="m-0 font-bold text-sm">We couldn&rsquo;t confirm your card.</p>
            <p className="m-0 text-sm" style={{ color: "rgba(20,17,15,.7)" }}>
              Nothing has been charged. Update your card to keep {myQty === 1 ? "your place" : "your places"}. We&rsquo;ve emailed you the details.
            </p>
            <Link href={`/hold/${params.id}/card`} className="rounded-pill py-3 font-bold text-sm text-center" style={{ background: INK, color: YELLOW }}>
              Update my card
            </Link>
          </div>
        )}
        {cancelMsg && <p className="m-0 text-center text-sm font-bold">{cancelMsg}</p>}

        {canCancel && (
          cancelState === "confirm" ? (
            <div className="border-2 border-dashed rounded-[22px] p-4 flex flex-col gap-3" style={{ borderColor: INK }}>
              <p className="m-0 font-bold text-sm">
                {myQty > 1 ? "How many places do you want to cancel?" : "Cancel your hold?"}
              </p>
              {myQty > 1 && (
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setCancelQty((q) => Math.max(1, q - 1))} className="w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold" style={{ borderColor: INK }} aria-label="One fewer">−</button>
                  <span className="font-mono text-lg font-bold min-w-[70px] text-center">{cancelQty} of {myQty}</span>
                  <button type="button" onClick={() => setCancelQty((q) => Math.min(myQty, q + 1))} className="w-9 h-9 rounded-full border-2 flex items-center justify-center font-bold" style={{ borderColor: INK }} aria-label="One more">+</button>
                </div>
              )}
              <p className="m-0 text-sm" style={{ color: "rgba(20,17,15,.7)" }}>
                {cancelQty >= myQty
                  ? "Nothing is charged, and your place goes back to the group."
                  : `You’ll keep ${myQty - cancelQty === 1 ? "1 place" : `${myQty - cancelQty} places`}. Nothing extra is charged.`}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setCancelState("idle")} disabled={cancelling} className="flex-1 rounded-pill py-3 font-bold text-sm" style={{ background: INK, color: YELLOW }}>
                  Keep {myQty > 1 ? "my places" : "my place"}
                </button>
                <button onClick={handleCancel} disabled={cancelling} className="flex-1 rounded-pill py-3 font-bold text-sm border-2 border-dashed disabled:opacity-60" style={{ borderColor: INK }}>
                  {cancelling ? "Cancelling…" : cancelQty >= myQty ? "Yes, cancel" : `Cancel ${cancelQty}`}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={startCancel}
              className={`${filledBtn} border-2 border-dashed`}
              style={{ background: "transparent", borderColor: INK, color: INK }}
            >
              {cancelLabel(myQty)}
            </button>
          )
        )}
    </>
  );

  return <BookingView session={session} myQty={myQty} cancelArea={cancelArea} />;
}
