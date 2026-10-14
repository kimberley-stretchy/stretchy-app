"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import SMark from "@/components/SMark";
import { createClient } from "@/lib/supabase/client";

type RosterAttendee = {
  holdId: string;
  name: string;
  checkedInAt: string | null;
  movingWithCareNote: string | null;
  movingWithCareDuration: string | null;
  isFirstTimer: boolean;
};

type RosterData = {
  role: "teacher" | "gem";
  session: {
    startsAt: string;
    locationName: string;
    socialStretchVenue: string | null;
    gemName: string | null;
  };
  roster: RosterAttendee[];
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export default function BeforeYouStartPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<RosterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);

  const load = useCallback(
    async (token: string) => {
      const res = await fetch(`/api/host/session/${params.id}/roster`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Could not load this session.");
        setLoading(false);
        return;
      }
      setData(await res.json());
      setLoading(false);
    },
    [params.id]
  );

  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (!session) {
        router.push(`/host/login?next=/host/session/${params.id}/before-you-start`);
        return;
      }
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel !== "aal2") {
        router.push(`/mfa-setup?next=/host/session/${params.id}/before-you-start`);
        return;
      }
      load(session.access_token);
    });
    return () => subscription.unsubscribe();
  }, [params.id, router, load]);

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center bg-cream text-ink text-sm">Loading…</main>;
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-cream text-ink flex flex-col items-center justify-center px-6 text-center gap-3">
        <p className="text-3xl">🤷</p>
        <p className="font-display text-2xl">{error ?? "Not found."}</p>
        <Link href="/host/home" className="underline text-sm">
          Back to your dashboard
        </Link>
      </main>
    );
  }

  const { session, roster } = data;
  const careNotes = roster.filter((a) => a.movingWithCareNote);
  const checkedIn = roster.filter((a) => a.checkedInAt).length;
  const firstTimers = roster.filter((a) => a.isFirstTimer).length;

  if (started) {
    return (
      <main className="min-h-screen bg-cream text-ink flex flex-col items-center justify-center px-6 text-center gap-3">
        <p className="text-3xl">🧘</p>
        <h1 className="font-display text-[28px] leading-none">You&rsquo;re set — mats down.</h1>
        <p className="text-sm text-ink/65">Have a beautiful one.</p>
        <Link href="/host/home" className="underline text-sm font-semibold mt-3">
          Back to your dashboard →
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream text-ink pb-16">
      <div className="max-w-lg mx-auto px-5 pt-4 pb-6">
        <nav className="flex items-center justify-between">
          <Link href="/host/home" aria-label="Back to your home" className="text-ink">
            <SMark size={32} />
          </Link>
          <Link href="/host/home" className="px-4 py-2 rounded-pill font-mono text-xs font-bold uppercase tracking-widest text-ink border border-border">
            ← Home
          </Link>
        </nav>
        <div className="flex items-center gap-2 flex-wrap mt-6">
          <span className="font-mono text-xs font-bold px-3 py-1.5 rounded-pill" style={{ backgroundColor: "#E96709", color: "#F7F0E8" }}>
            MOVING WITH CARE · {careNotes.length} {careNotes.length === 1 ? "PERSON" : "PEOPLE"}
          </span>
        </div>
        <h1 className="font-display font-bold text-ink mt-4" style={{ fontSize: "clamp(34px,10vw,46px)", letterSpacing: "-0.03em", lineHeight: 1 }}>
          Before you start
        </h1>
        <p className="text-sm text-muted leading-relaxed mt-2">
          What people told us they&rsquo;re working around. Not medical advice — just what they&rsquo;d like you to know.
        </p>
      </div>

      <div className="max-w-lg mx-auto px-6 flex flex-col gap-5 pt-5">
        {careNotes.length === 0 ? (
          <div className="border-2 border-dashed border-ink/30 rounded-2xl p-6 text-center text-sm text-ink/55">
            Nobody&rsquo;s flagged anything today. Business as usual.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {careNotes.map((a) => (
              <div key={a.holdId} className="border-2 border-ink rounded-2xl p-4 bg-white">
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ background: "#E96709", color: "#F7F0E8" }}
                  >
                    {initials(a.name)}
                  </div>
                  <p className="font-bold text-sm">{a.name}</p>
                </div>
                <p className="text-sm leading-relaxed text-ink/85">{a.movingWithCareNote}</p>
                {a.movingWithCareDuration && (
                  <p className="font-mono text-[10px] font-bold tracking-[0.08em] text-ink/45 mt-2">
                    {a.movingWithCareDuration.toUpperCase()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <div>
          <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2 text-ink/45">THE ROOM</div>
          <div className="border-2 border-ink rounded-2xl bg-white divide-y divide-border">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-ink/55">Checked in</span>
              <span className="font-mono text-sm font-bold">
                {checkedIn} of {roster.length}
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-ink/55">First-timers</span>
              <span className="font-mono text-sm font-bold">{firstTimers}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-ink/55">GEM on the day</span>
              <span className="font-mono text-sm font-bold">{session.gemName ?? "GEM to come"}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-ink/55">Social Stretch</span>
              <span className="font-mono text-sm font-bold">{session.socialStretchVenue ?? "—"}</span>
            </div>
          </div>
        </div>

        {firstTimers > 0 && (
          <div className="rounded-2xl p-4" style={{ background: "#EFDEDB" }}>
            <p className="font-display text-xl leading-none mb-2">
              {firstTimers} first-timer{firstTimers === 1 ? "" : "s"} today.
            </p>
            <p className="text-sm leading-relaxed text-ink/75">
              A quick welcome goes a long way. If there&rsquo;s a Social Stretch after, name it early — it&rsquo;s an easier
              ask once they already know it&rsquo;s coming.
            </p>
          </div>
        )}

        <button
          onClick={() => setStarted(true)}
          className="h-[52px] rounded-pill text-[15px] font-bold mt-2"
          style={{ background: "#902F8A", color: "#F7F0E8" }}
        >
          Start the session
        </button>
        <Link href="/host/feedback" className="text-center text-xs font-semibold underline text-ink/55">
          Feedback to Stretchy about today
        </Link>
      </div>
    </main>
  );
}
