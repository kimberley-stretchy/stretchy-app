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

type Notice = { id: string; author_name: string; message: string; created_at: string };

type RosterData = {
  role: "teacher" | "gem";
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
  const [sent, setSent] = useState(false);

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

  async function sendRunSheet() {
    if (!accessToken) return;
    setSending(true);
    await fetch(`/api/host/session/${params.id}/send-run-sheet`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    setSending(false);
    setSent(true);
    setTimeout(() => setSent(false), 3000);
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
          Back to your dashboard
        </Link>
      </main>
    );
  }

  const { session, roster, notices } = data;
  const hereCount = roster.filter((a) => a.checkedInAt).length;
  const notYetCount = roster.length - hereCount;
  const careCount = roster.filter((a) => a.movingWithCareNote).length;
  const latestNotice = notices[0];

  const visible = roster.filter((a) => {
    if (filter === "not-yet") return !a.checkedInAt;
    if (filter === "care") return !!a.movingWithCareNote;
    return true;
  });

  const startDate = new Date(session.startsAt);
  const subtitle =
    startDate.toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" }).toUpperCase() +
    " · " +
    startDate.toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit", hour12: true }) +
    " · " +
    session.locationName.toUpperCase();

  return (
    <main className="min-h-screen bg-cream text-ink pb-16">
      <div style={{ background: "#716F39" }}>
        <div className="max-w-lg mx-auto px-6 pt-5 pb-6">
          <div className="flex items-center justify-between mb-5">
            <div style={{ color: "#F7F0E8" }}>
              <SMark size={30} />
            </div>
            <span
              className="font-mono text-[10px] font-extrabold tracking-[0.12em] px-2.5 py-1 rounded-pill"
              style={{ background: "#FCBB16", color: "#14110F" }}
            >
              LIVE
            </span>
          </div>
          <div className="font-mono text-[10px] font-extrabold tracking-[0.13em]" style={{ color: "rgba(247,240,232,0.7)" }}>
            GEM RUN SHEET
          </div>
          <h1 className="font-display text-[26px] leading-none mt-1.5" style={{ color: "#F7F0E8" }}>
            {session.title.toUpperCase()}
          </h1>
          <p className="font-mono text-xs mt-2" style={{ color: "rgba(247,240,232,0.75)" }}>
            {subtitle}
          </p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-6 -mt-3 flex flex-col gap-5 pt-3">
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

        <div className="border-2 border-ink rounded-2xl p-4" style={{ background: "#FCBB16" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[9px] font-extrabold tracking-[0.11em]">NOTICE FROM HQ</span>
            {latestNotice && (
              <span className="font-mono text-[9px] text-ink/55">
                {new Date(latestNotice.created_at).toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" })}
              </span>
            )}
          </div>
          {latestNotice ? (
            <p className="text-sm font-semibold leading-snug">{latestNotice.message}</p>
          ) : (
            <p className="text-sm text-ink/60">No notices yet today.</p>
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
              <div key={a.holdId} className="border-2 border-ink rounded-2xl p-3 flex items-center gap-3 bg-white">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
                  style={{ background: avatarBg, color: isIn ? "#F7F0E8" : "#9A9590" }}
                >
                  {initials(a.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-bold text-sm">{a.name}</p>
                    {care && (
                      <span
                        className="font-mono text-[8px] font-extrabold px-1.5 py-0.5 rounded-pill"
                        style={{ background: "#14110F", color: "#FCBB16" }}
                      >
                        CARE
                      </span>
                    )}
                    {a.isFirstTimer && (
                      <span
                        className="font-mono text-[8px] font-extrabold px-1.5 py-0.5 rounded-pill"
                        style={{ background: "#FCBB16", color: "#14110F" }}
                      >
                        FIRST ONE
                      </span>
                    )}
                  </div>
                  {care ? (
                    <p className="text-xs font-semibold text-ink/80 mt-0.5 truncate">{a.movingWithCareNote}</p>
                  ) : (
                    <p className="text-xs mt-0.5" style={{ color: isIn ? "rgba(20,17,15,.55)" : "#9A9590" }}>
                      {isIn ? "Checked in" : "Not here yet"}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => toggleCheckIn(a.holdId, isIn)}
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: isIn ? "#716F39" : "transparent", border: isIn ? "none" : "1.5px solid #D4CFC9" }}
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

        <div className="flex flex-col gap-2.5 mt-2">
          <button
            onClick={sendRunSheet}
            disabled={sending}
            className="h-12 rounded-pill text-sm font-bold disabled:opacity-60"
            style={{ background: "#14110F", color: "#F7F0E8" }}
          >
            {sent ? "Sent ✓" : sending ? "Sending…" : "Send the run sheet to HQ"}
          </button>
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
