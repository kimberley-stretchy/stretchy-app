"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SMark from "@/components/SMark";
import { createClient } from "@/lib/supabase/client";

type Host = { id: string; name: string; roles: string[]; neighbourhood: string; vetting_status: string };
type MySession = {
  id: string; title: string; style: string | null; startsAt: string; endsAt: string; locationName: string;
  socialStretchVenue: string | null; state: string; asTeacher: boolean; asGem: boolean;
  teacherName: string | null; gemName: string | null;
  held: number; min: number; max: number; priceNow: number; priceFull: number;
};
type SubRequest = {
  id: string; role: "teacher" | "gem"; created_at: string;
  sessions: { title: string; starts_at: string; location_name: string } | null;
};

const ROLE_LABELS: Record<string, string> = { teacher: "Teacher", gem: "Good Energy Manager" };

export default function HostHomePage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [host, setHost] = useState<Host | null>(null);
  const [sessions, setSessions] = useState<MySession[]>([]);
  const [openRequests, setOpenRequests] = useState<SubRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (!session) {
        router.push("/host/login");
        return;
      }

      // /host/login is worded as covering "HQ" too, but it always sends
      // people here regardless of role. An admin landing here (e.g. via
      // that link) belongs in the actual admin panel, not the host flow.
      if (session.user?.user_metadata?.role === "admin") {
        router.push("/admin");
        return;
      }

      setAccessToken(session.access_token);

      const hostRes = await fetch("/api/host/onboarding", { headers: { Authorization: `Bearer ${session.access_token}` } });
      const hostData = await hostRes.json();
      if (!hostData.host) {
        router.push("/host/create-profile");
        return;
      }
      setHost(hostData.host);

      if (hostData.host.vetting_status === "approved") {
        const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal?.currentLevel !== "aal2") {
          router.push("/mfa-setup?next=/host/home");
          return;
        }
      }

      const [mineRes, reqRes] = await Promise.all([
        fetch("/api/host/my-sessions", { headers: { Authorization: `Bearer ${session.access_token}` } }),
        fetch("/api/host/substitute-requests", { headers: { Authorization: `Bearer ${session.access_token}` } }),
      ]);
      const mine = await mineRes.json().catch(() => ({}));
      setSessions(mine.sessions ?? []);
      const reqData = await reqRes.json();
      setOpenRequests(reqData.requests ?? []);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/host/login");
  }

  if (loading || !host) {
    return <main className="min-h-screen flex items-center justify-center bg-cream text-ink text-sm">Loading…</main>;
  }

  if (host.vetting_status !== "approved") {
    return (
      <main className="min-h-screen bg-cream text-ink flex flex-col items-center justify-center px-6 text-center gap-3">
        <div className="text-purple mb-2"><SMark size={32} /></div>
        <p className="text-3xl">👀</p>
        <h1 className="font-display text-[28px] leading-none">
          {host.vetting_status === "declined" ? "Not this time." : "Reviewing your application."}
        </h1>
        <p className="text-sm text-ink/65 max-w-xs">
          {host.vetting_status === "declined"
            ? "Get in touch if you think this isn't right — kimberley@stretchyyoga.co.nz."
            : "Stretchy HQ checks every teacher and GEM before they can see sessions. We'll email you the second you're approved."}
        </p>
        <button onClick={handleSignOut} className="text-xs underline text-ink/55 mt-3">Sign out</button>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream text-ink pb-16">
      <div className="max-w-lg mx-auto px-6 pt-5 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="text-purple"><SMark size={32} /></div>
          <button onClick={handleSignOut} className="text-xs underline text-ink/55">Sign out</button>
        </div>

        <div>
          <div className="font-mono text-[10px] font-extrabold tracking-[0.13em] text-ink/45">
            {host.roles.map((r) => ROLE_LABELS[r] ?? r).join(" & ").toUpperCase()}
          </div>
          <h1 className="font-display text-[32px] leading-none mt-2">Kia ora, {host.name.split(" ")[0]}.</h1>
        </div>

        <Link
          href="/host/portal"
          className="flex items-center gap-3 border-2 border-ink rounded-2xl p-4 bg-white"
        >
          <span className="text-2xl flex-shrink-0">🗝</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight">Team portal</p>
            <p className="text-xs text-ink/65 mt-0.5">Your venues, contacts, access codes &amp; weekly run info.</p>
          </div>
          <span className="text-lg flex-shrink-0">→</span>
        </Link>

        <Link
          href="/host/feedback"
          className="flex items-center gap-3 border-2 border-ink rounded-2xl p-4"
          style={{ background: "#902F8A", color: "#F7F0E8" }}
        >
          <span className="text-2xl flex-shrink-0">💬</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-tight">Got feedback for Stretchy?</p>
            <p className="text-xs opacity-80 mt-0.5">Bugs, ideas, what worked, what didn&rsquo;t — anytime.</p>
          </div>
          <span className="text-lg flex-shrink-0">→</span>
        </Link>

        {openRequests.length > 0 && (
          <div>
            <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2" style={{ color: "#902F8A" }}>NEEDS COVER — YOU COULD TAKE THIS</div>
            <div className="flex flex-col gap-2.5">
              {openRequests.map((r) => (
                <Link
                  key={r.id}
                  href={`/host/substitute/${r.id}`}
                  className="block border-2 border-ink rounded-2xl p-4"
                  style={{ background: "#FCBB16" }}
                >
                  <div className="font-mono text-[9px] font-extrabold tracking-[0.11em] mb-1.5">{ROLE_LABELS[r.role].toUpperCase()} NEEDED</div>
                  <div className="font-display text-lg leading-none">{r.sessions?.title}</div>
                  {r.sessions && (
                    <p className="text-xs text-ink/70 mt-1.5">
                      {new Date(r.sessions.starts_at).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "short", day: "numeric", month: "short" })} · {r.sessions.location_name}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2 text-ink/45">YOUR UPCOMING SESSIONS</div>
          {sessions.length === 0 ? (
            <div className="border-2 border-dashed border-ink/30 rounded-2xl p-6 text-center text-sm text-ink/55">
              Nothing on the books yet.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {sessions.map((s) => {
                const { asTeacher, asGem } = s;
                const going = s.held >= s.min;
                const when = new Date(s.startsAt);
                const day = when.toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "short", day: "numeric", month: "short" });
                const t = (iso: string) => new Date(iso).toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s/g, "").toLowerCase();
                return (
                  <div key={s.id} className="border-2 border-ink rounded-2xl p-4 bg-white">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {asTeacher && <span className="font-mono text-[9px] font-extrabold px-2 py-1 rounded-pill" style={{ background: "#0000FF", color: "#F7F0E8" }}>TEACHING</span>}
                      {asGem && <span className="font-mono text-[9px] font-extrabold px-2 py-1 rounded-pill" style={{ background: "#716F39", color: "#F7F0E8" }}>GEM</span>}
                      {going && <span className="font-mono text-[9px] font-extrabold px-2 py-1 rounded-pill" style={{ background: "#FCBB16", color: "#14110F" }}>GOING AHEAD</span>}
                    </div>
                    <div className="font-display text-lg leading-none">{s.title}</div>
                    <p className="text-xs text-ink/65 mt-1.5">
                      {day} · {t(s.startsAt)}–{t(s.endsAt)} · {s.locationName}
                    </p>
                    <div className="mt-3 text-xs text-ink/75 flex flex-col gap-1">
                      {!asTeacher && <p>🧘 Teacher: <strong>{s.teacherName ?? "To be confirmed"}</strong></p>}
                      {!asGem && <p>✨ GEM: <strong>{s.gemName ?? "GEM to come"}</strong></p>}
                      {s.socialStretchVenue && <p>🌞 Social Stretch: {s.socialStretchVenue}</p>}
                    </div>
                    <div className="mt-3 rounded-xl p-3" style={{ background: "#F7F0E8" }}>
                      <div className="flex items-baseline justify-between">
                        <span className="font-mono text-[10px] font-extrabold tracking-[0.08em]">
                          {s.held} BOOKED · {going ? `${s.max - s.held} SPOTS LEFT` : `${s.min - s.held} MORE TO GO AHEAD`}
                        </span>
                        <span className="font-mono text-[10px] text-ink/55">MIN {s.min} · MAX {s.max}</span>
                      </div>
                      <div className="h-2 rounded-full mt-2 overflow-hidden" style={{ background: "rgba(20,17,15,.1)" }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.min(100, (s.held / s.max) * 100)}%`, background: going ? "#716F39" : "#E96709" }} />
                      </div>
                      <p className="text-xs text-ink/70 mt-2">
                        Price each now <strong>${s.priceNow.toFixed(2)}</strong> · full room <strong>${s.priceFull.toFixed(2)}</strong>
                      </p>
                    </div>
                    <div className="flex gap-2 mt-3">
                      {asTeacher && (
                        <Link
                          href={`/host/session/${s.id}/before-you-start`}
                          className="flex-1 text-center font-mono text-[10px] font-extrabold tracking-[0.08em] h-9 flex items-center justify-center rounded-pill border-2 border-ink"
                          style={{ background: "#E96709", color: "#F7F0E8" }}
                        >
                          BEFORE YOU START
                        </Link>
                      )}
                      {asGem && (
                        <Link
                          href={`/host/session/${s.id}/run-sheet`}
                          className="flex-1 text-center font-mono text-[10px] font-extrabold tracking-[0.08em] h-9 flex items-center justify-center rounded-pill border-2 border-ink"
                          style={{ background: "#716F39", color: "#F7F0E8" }}
                        >
                          RUN SHEET
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <Link
          href="/host/create-profile"
          className="inline-flex items-center justify-center h-11 rounded-pill text-sm font-bold border-2 border-ink"
        >
          Edit profile
        </Link>
      </div>
    </main>
  );
}
