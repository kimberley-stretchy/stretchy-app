"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import SMark from "@/components/SMark";
import { createClient } from "@/lib/supabase/client";

type RequestDetail = {
  id: string;
  role: "teacher" | "gem";
  status: string;
  note: string | null;
  sessions: { id: string; title: string; movement_type: string; starts_at: string; location_name: string } | null;
};

export default function SubstituteClaimPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [detail, setDetail] = useState<RequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (!session) {
        router.push(`/host/login?next=/host/substitute/${params.id}`);
        return;
      }
      setAccessToken(session.access_token);

      try {
        const res = await fetch(`/api/host/substitute-requests/${params.id}`);
        if (res.ok) {
          const { request } = await res.json();
          setDetail(request as RequestDetail);
        }
      } catch {
        // leave detail null — falls through to the "not found" state below
      } finally {
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [params.id, router]);

  async function handleClaim() {
    if (!accessToken) return;
    setClaiming(true);
    setError(null);

    const supabase = createClient();
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel !== "aal2") {
      router.push(`/mfa-setup?next=/host/substitute/${params.id}`);
      return;
    }

    const res = await fetch(`/api/host/substitute-requests/${params.id}/claim`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not claim this one.");
      setClaiming(false);
      return;
    }
    setClaimed(true);
    setClaiming(false);
  }

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center bg-cream text-ink text-sm">Loading…</main>;
  }

  if (!detail || !detail.sessions) {
    return (
      <main className="min-h-screen bg-cream text-ink flex flex-col items-center justify-center px-6 text-center gap-3">
        <p className="text-3xl">🤷</p>
        <p className="font-display text-2xl">Not found.</p>
        <Link href="/host/home" className="underline text-sm">Back to your dashboard</Link>
      </main>
    );
  }

  const s = detail.sessions;
  const startDate = new Date(s.starts_at);
  const dateStr = startDate.toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "long", day: "numeric", month: "long" }) +
    " at " + startDate.toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit", hour12: true });
  const roleLabel = detail.role === "teacher" ? "Teacher" : "Good Energy Manager";
  const alreadyFilled = detail.status !== "open" && !claimed;

  return (
    <main className="min-h-screen bg-cream text-ink">
      <div className="max-w-lg mx-auto px-6 pt-5 pb-16 flex flex-col gap-5">
        <Link href="/host/home" aria-label="Back to your dashboard" className="text-purple"><SMark size={32} /></Link>

        {claimed ? (
          <div className="py-16 text-center">
            <p className="text-3xl mb-3">🙌</p>
            <h1 className="font-display text-[28px] leading-none mb-2">It&rsquo;s yours.</h1>
            <p className="text-sm leading-[1.5] mb-6">You&rsquo;re now the {roleLabel.toLowerCase()} for {s.title}. See you there.</p>
            <Link href="/host/home" className="underline text-sm font-semibold">Go to your dashboard →</Link>
          </div>
        ) : alreadyFilled ? (
          <div className="py-16 text-center">
            <p className="text-3xl mb-3">💨</p>
            <h1 className="font-display text-[28px] leading-none mb-2">Someone beat you to it.</h1>
            <p className="text-sm leading-[1.5] mb-6">This one&rsquo;s already covered — thanks for offering.</p>
            <Link href="/host/home" className="underline text-sm font-semibold">Back to your dashboard →</Link>
          </div>
        ) : (
          <>
            <div className="font-mono text-[10px] font-extrabold tracking-[0.13em]" style={{ color: "#902F8A" }}>COVER NEEDED · {roleLabel.toUpperCase()}</div>
            <h1 className="font-display text-[30px] leading-none">Can you take this one?</h1>

            <div className="border-2 border-ink rounded-2xl p-5">
              <div className="font-display text-[22px] leading-none mb-2">{s.title}</div>
              <p className="text-sm text-ink/65">{dateStr}</p>
              <p className="text-sm text-ink/65">{s.location_name}</p>
              {detail.note && <p className="text-sm mt-3 pt-3 border-t border-border">{detail.note}</p>}
            </div>

            {error && <p className="text-xs font-semibold" style={{ color: "#C6362E" }}>{error}</p>}

            <button
              onClick={handleClaim}
              disabled={claiming}
              className="h-[52px] rounded-pill text-[15px] font-bold disabled:opacity-60"
              style={{ background: "#14110F", color: "#F7F0E8" }}
            >
              {claiming ? "Claiming…" : "I'll take it"}
            </button>
            <p className="text-xs text-center text-ink/55">First to claim it gets it.</p>
          </>
        )}
      </div>
    </main>
  );
}
