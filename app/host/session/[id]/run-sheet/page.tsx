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
  places?: number;
  movingWithCareNote: string | null;
  movingWithCareDuration: string | null;
  isFirstTimer: boolean;
  badge?: string | null;
};

type Notice = { id: string; author_name: string; message: string; created_at: string };

type TeamNotice = { id: string; message: string; created_at: string };

type RosterData = {
  role: "teacher" | "gem" | "hq";
  teamNotices?: TeamNotice[];
  session: {
    title: string;
    startsAt: string;
    locationName: string;
    spotifyPlaylistUrl: string | null;
  };
  roster: RosterAttendee[];
  notices: Notice[];
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export default function GemRunSheetPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [data, setData] = useState<RosterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "not-yet" | "care">("all");
  const [noticeText, setNoticeText] = useState("");
  const [addingNotice, setAddingNotice] = useState(false);
  const [showNoticeForm, setShowNoticeForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const [walkIns, setWalkIns] = useState(0);
  const [walkInNames, setWalkInNames] = useState("");
  const [dayNote, setDayNote] = useState("");

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
        router.push(`/host/login?next=/host/session/${params.id}/run-sheet`);
        return;
      }
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel !== "aal2") {
        router.push(`/mfa-setup?next=/host/session/${params.id}/run-sheet`);
        return;
      }
      setAccessToken(session.access_token);
      load(session.access_token);
    });
    return () => subscription.unsubscribe();
  }, [params.id, router, load]);

  async function toggleCheckIn(holdId: string, currentlyIn: boolean) {
    if (!accessToken || !data) return;
    setData({
      ...data,
      roster: data.roster.map((a) =>
        a.holdId === holdId ? { ...a, checkedInAt: currentlyIn ? null : new Date().toISOString() } : a
      ),
    });
    await fetch(`/api/host/session/${params.id}/roster`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ holdId, checkedIn: !currentlyIn }),
    });
  }

  async function addNotice() {
    if (!accessToken || !noticeText.trim()) return;
    setAddingNotice(true);
    const res = await fetch(`/api/host/session/${params.id}/notices`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ message: noticeText }),
    });
    if (res.ok) {
      const { notice } = await res.json();
      setData((prev) => (prev ? { ...prev, notices: [notice, ...prev.notices] } : prev));
      setNoticeText("");
      setShowNoticeForm(false);
    }
    setAddingNotice(false);
  }

  // "Submit today's check-in": HQ gets a snapshot of the day by email.
  async function sendRunSheet() {
    if (!accessToken || sending) return;
    setSending(true); setSendErr(null);
    try {
      const res = await fetch(`/api/host/session/${params.id}/send-run-sheet`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ walkIns, walkInNames, note: dayNote }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) setSent(`Sent to HQ ✓ ${d.total} on the mat today. Thank you!`);
      else setSendErr(d.error ?? "Couldn't send it. Try again in a moment.");
    } catch { setSendErr("Couldn't send it. Try again in a moment."); }
    setSending(false);
  }

  function sharePlaylist() {
    const url = data?.session.spotifyPlaylistUrl;
    if (!url) return;
    if (typeof navigator.share === "function") {
      navigator.share({ title: "Today's playlist", url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
    }
  }

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center bg-cream text-ink text-sm">Loading…</main>;
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-cream text-ink flex flex-col items-center justify-center px-6 text-center gap-3">
        <p className="text-3xl">🤷</p>
        <p className="font-display text-2xl">{error ?? "Not found."}</p>
        <Link href="/host/home" className="underline text-sm">
          Back to your home
        </Link>
      </main>
    );
  }

  const { session, roster, notices } = data;
  // Count PEOPLE, not bookings: one booking can be two or three places.
  const placesOf = (a: RosterAttendee) => a.places ?? 1;
  const totalPlaces = roster.reduce((n, a) => n + placesOf(a), 0);
  const hereCount = roster.filter((a) => a.checkedInAt).reduce((n, a) => n + placesOf(a), 0);
  const notYetCount = totalPlaces - hereCount;
  const teamNotices = data.teamNotices ?? [];
  const backHref = data.role === "hq" ? "/admin/sessions" : "/host/home";
  const careCount = roster.filter((a) => a.movingWithCareNote).length;
  const latestNotice = notices[0];

  const visible = roster.filter((a) => {
    if (filter === "not-yet") return !a.checkedInAt;
    if (filter === "care") return !!a.movingWithCareNote;
    return true;
  });

  const startDate = new Date(session.startsAt);
  const dayPill = startDate.toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "short", day: "numeric", month: "short" }).toUpperCase();
  const timePill = startDate.toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();

  return (
    <main className="min-h-screen bg-cream text-ink pb-16">
      {/* Header in the app's own style: cream, the S mark, date and time pills,
          a big ink headline — the same as the sessions pages. */}
      <div className="max-w-lg mx-auto px-5 pt-4">
        <nav className="flex items-center justify-between">
          <Link href={backHref} aria-label="Back" className="text-ink">
            <SMark size={32} />
          </Link>
          <Link
            href={backHref}
            className="px-4 py-2 rounded-pill font-mono text-xs font-bold uppercase tracking-widest text-ink border border-border"
          >
            ← {data.role === "hq" ? "HQ" : "Home"}
          </Link>
        </nav>

        <div className="flex items-center gap-2 flex-wrap mt-6">
          <span className="font-mono text-xs font-bold px-3 py-1.5 rounded-pill" style={{ backgroundColor: "#14110F", color: "#F7F0E8" }}>{dayPill}</span>
          <span className="font-mono text-xs font-semibold px-3 py-1.5 rounded-pill" style={{ backgroundColor: "#E1D5C6", color: "#6B6862" }}>{timePill}</span>
          <span className="font-mono text-xs font-bold px-3 py-1.5 rounded-pill" style={{ backgroundColor: "#716F39", color: "#F7F0E8" }}>
            {data.role === "teacher" ? "TEACHER" : data.role === "hq" ? "HQ" : "GEM"} RUN SHEET
          </span>
        </div>
        <h1 className="font-display font-bold text-ink mt-4" style={{ fontSize: "clamp(34px,10vw,46px)", letterSpacing: "-0.03em", lineHeight: 1 }}>
          {session.title}
        </h1>
        <p className="text-sm text-muted mt-2">
          {session.locationName} · {totalPlaces} booked
        </p>
      </div>

      <div className="max-w-lg mx-auto px-5 flex flex-col gap-5 mt-8">
        <div className="grid grid-cols-3 gap-2.5">
          <div className="border-2 border-ink rounded-2xl p-3 bg-white text-center">
            <div className="font-display text-2xl leading-none">{hereCount}</div>
            <div className="font-mono text-[9px] font-extrabold tracking-[0.08em] mt-1 text-ink/55">HERE</div>
          </div>
          <div className="border-2 border-ink rounded-2xl p-3 bg-white text-center">
            <div className="font-display text-2xl leading-none">{notYetCount}</div>
            <div className="font-mono text-[9px] font-extrabold tracking-[0.08em] mt-1 text-ink/55">NOT YET</div>
          </div>
          <div className="border-2 border-ink rounded-2xl p-3 text-center" style={{ background: "#FCBB16" }}>
            <div className="font-display text-2xl leading-none">{careCount}</div>
            <div className="font-mono text-[9px] font-extrabold tracking-[0.08em] mt-1" style={{ color: "rgba(20,17,15,.6)" }}>
              MOVING WITH CARE
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className="font-mono text-[11px] font-bold px-3.5 py-2 rounded-pill border-2 border-ink"
            style={filter === "all" ? { background: "#14110F", color: "#F7F0E8" } : { background: "transparent", color: "#14110F" }}
          >
            All {roster.length}
          </button>
          <button
            onClick={() => setFilter("not-yet")}
            className="font-mono text-[11px] font-bold px-3.5 py-2 rounded-pill border-2 border-ink"
            style={filter === "not-yet" ? { background: "#14110F", color: "#F7F0E8" } : { background: "transparent", color: "#14110F" }}
          >
            Not yet {notYetCount}
          </button>
          <button
            onClick={() => setFilter("care")}
            className="font-mono text-[11px] font-bold px-3.5 py-2 rounded-pill border-2 border-ink"
            style={{ background: "#FCBB16", color: "#14110F" }}
          >
            Care {careCount}
          </button>
        </div>

        {teamNotices.length > 0 && (
          <div className="border-2 border-ink rounded-2xl p-4" style={{ background: "#902F8A", color: "#F7F0E8" }}>
            <span className="font-mono text-[9px] font-extrabold tracking-[0.11em]">FROM STRETCHY HQ</span>
            <div className="flex flex-col gap-2.5 mt-2">
              {teamNotices.map((n) => (
                <p key={n.id} className="text-sm font-semibold leading-snug whitespace-pre-wrap">{n.message}</p>
              ))}
            </div>
          </div>
        )}

        <div className="border-2 border-ink rounded-2xl p-4" style={{ background: "#FCBB16" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[9px] font-extrabold tracking-[0.11em]">NOTICE FOR THE ROOM</span>
            {latestNotice && (
              <span className="font-mono text-[9px] text-ink/55">
                {new Date(latestNotice.created_at).toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit" })}
              </span>
            )}
          </div>
          {latestNotice ? (
            <p className="text-sm font-semibold leading-snug">{latestNotice.message}</p>
          ) : (
            <p className="text-sm text-ink/60">Nothing yet today. Add one if the team needs to know something on the day.</p>
          )}
          {showNoticeForm ? (
            <div className="mt-3 flex flex-col gap-2">
              <textarea
                value={noticeText}
                onChange={(e) => setNoticeText(e.target.value)}
                placeholder="e.g. Side door's stuck, use the front."
                className="w-full rounded-xl border-2 border-ink px-3 py-2 text-sm bg-white"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={addNotice}
                  disabled={addingNotice || !noticeText.trim()}
                  className="flex-1 h-9 rounded-pill text-xs font-bold border-2 border-ink disabled:opacity-50"
                  style={{ background: "#14110F", color: "#F7F0E8" }}
                >
                  {addingNotice ? "Adding…" : "Post notice"}
                </button>
                <button onClick={() => setShowNoticeForm(false)} className="h-9 px-3 rounded-pill text-xs font-bold border-2 border-ink">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowNoticeForm(true)} className="mt-3 h-9 px-4 rounded-pill text-xs font-bold border-2 border-ink">
              Add a notice for the room
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {visible.map((a) => {
            const care = !!a.movingWithCareNote;
            const isIn = !!a.checkedInAt;
            const avatarBg = isIn ? (care ? "#E96709" : "#716F39") : "#EFDEDB";
            return (
              <div key={a.holdId} className="border-2 border-ink rounded-2xl p-3 flex items-start gap-3 bg-white">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ background: avatarBg, color: isIn ? "#F7F0E8" : "#9A9590" }}
                >
                  {initials(a.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-bold text-sm">{a.name}</p>
                    {placesOf(a) > 1 && (
                      <span className="font-mono text-[8px] font-extrabold px-1.5 py-0.5 rounded-pill border border-ink">
                        {placesOf(a)} PLACES
                      </span>
                    )}
                    {care && (
                      <span
                        className="font-mono text-[8px] font-extrabold px-1.5 py-0.5 rounded-pill"
                        style={{ background: "#14110F", color: "#FCBB16" }}
                      >
                        CARE
                      </span>
                    )}
                    {a.badge && (
                      <span
                        className="font-mono text-[8px] font-extrabold px-1.5 py-0.5 rounded-pill"
                        style={{ background: "#FCBB16", color: "#14110F" }}
                      >
                        {a.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: isIn ? "rgba(20,17,15,.55)" : "#9A9590" }}>
                    {isIn ? "Checked in" : "Not here yet"}
                  </p>
                  {care && (
                    <p className="text-xs font-semibold text-ink/85 mt-1.5 leading-snug whitespace-pre-wrap rounded-lg px-2 py-1.5" style={{ background: "rgba(252,187,22,.28)" }}>
                      {a.movingWithCareNote}
                      {a.movingWithCareDuration && <span className="block font-mono text-[9px] font-extrabold tracking-[0.08em] text-ink/60 mt-1">{a.movingWithCareDuration.toUpperCase()}</span>}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => toggleCheckIn(a.holdId, isIn)}
                  className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: isIn ? "#716F39" : "transparent", border: isIn ? "none" : "2px solid #14110F" }}
                  aria-label={isIn ? "Mark not here" : "Check in"}
                >
                  {isIn && (
                    <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
                      <path d="M1 5L5 9L13 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Photo nudge: low-key shots HQ can use on socials. */}
        <div className="mt-4 border-2 border-dashed border-ink/40 rounded-2xl p-4">
          <p className="m-0 font-mono text-[10px] font-extrabold tracking-[0.12em] text-ink/60">📸 SNAP A FEW PHOTOS</p>
          <p className="m-0 mt-2 text-sm font-bold">Low-key, incognito vibes, please.</p>
          <ul className="m-0 mt-1.5 pl-4 text-[13px] text-ink/70 leading-relaxed list-disc">
            <li>During practice: people unrecognisable, from behind or far away</li>
            <li>At the Social Stretch: something larger and wider</li>
            <li>Yoga mats, the sounds, interesting viewpoints (an upside-down tree, anyone?)</li>
          </ul>
          <p className="m-0 mt-2 text-[13px] text-ink/70">
            Send them to Kimberley: <a href="mailto:kimberley@stretchyyoga.co.nz?subject=Photos%20from%20today" className="font-bold underline">kimberley@stretchyyoga.co.nz</a>
          </p>
        </div>

        {/* Submit today's check-in: walk-ins + notes, then a snapshot to HQ. */}
        <div className="mt-4 border-2 border-ink rounded-2xl p-4 flex flex-col gap-3">
          <p className="m-0 font-mono text-[10px] font-extrabold tracking-[0.12em] text-ink/60">SUBMIT TODAY&rsquo;S CHECK-IN</p>
          <p className="m-0 text-[13px] text-ink/70">Once everyone&rsquo;s ticked off, send HQ a snapshot of the day.</p>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold">Walk-ins (not booked)</span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setWalkIns((n) => Math.max(0, n - 1))} className="w-9 h-9 rounded-full border-2 border-ink font-bold" aria-label="One fewer walk-in">−</button>
              <span className="font-mono font-extrabold w-6 text-center">{walkIns}</span>
              <button type="button" onClick={() => setWalkIns((n) => n + 1)} className="w-9 h-9 rounded-full border-2 border-ink font-bold" aria-label="One more walk-in">+</button>
            </div>
          </div>
          {walkIns > 0 && (
            <input value={walkInNames} onChange={(e) => setWalkInNames(e.target.value)} placeholder="Their names / emails, so HQ can sort payment"
              className="w-full rounded-xl border-2 border-ink/20 px-3 py-2.5 text-base bg-white outline-none" />
          )}
          <textarea value={dayNote} onChange={(e) => setDayNote(e.target.value)} rows={3} placeholder="Anything HQ should know? (optional) How it went, the vibe, any issues."
            className="w-full rounded-xl border-2 border-ink/20 px-3 py-2.5 text-base bg-white outline-none resize-y" />
          <button
            onClick={sendRunSheet}
            disabled={sending}
            className="h-12 rounded-pill text-sm font-bold disabled:opacity-60"
            style={{ background: "#14110F", color: "#F7F0E8" }}
          >
            {sending ? "Sending…" : sent ? "Send again" : `Submit check-in to HQ · ${hereCount + walkIns} on the mat`}
          </button>
          {sent && <p className="m-0 text-[13px] font-bold" style={{ color: "#716F39" }}>{sent}</p>}
          {sendErr && <p className="m-0 text-[13px] font-bold" style={{ color: "#C6362E" }}>{sendErr}</p>}
        </div>

        <div className="flex flex-col gap-2.5 mt-4">
          <button
            onClick={sharePlaylist}
            disabled={!session.spotifyPlaylistUrl}
            className="h-12 rounded-pill text-sm font-bold border-2 border-ink disabled:opacity-40"
          >
            Share today&rsquo;s Spotify playlist
          </button>
          <Link
            href={`/host/feedback?session=${encodeURIComponent(session.title)}`}
            className="text-center text-xs font-semibold underline text-ink/55 mt-1"
          >
            Feedback to Stretchy about today
          </Link>
        </div>
      </div>
    </main>
  );
}
