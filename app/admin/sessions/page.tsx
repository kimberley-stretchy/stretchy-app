"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import HQShell from "@/components/hq/HQShell";
import { calculatePrice } from "@/lib/pricing";
import { locationTheme } from "@/lib/locationColours";
import { byFirstName } from "@/lib/byFirstName";

const T = {
  ink:    "#14110F",
  cream:  "#F7F0E8",
  yellow: "#FCBB16",
  blue:   "#0000FF",
  olive:  "#716F39",
  orange: "#E96709",
  red:    "#C6362E",
  purple: "#902F8A",
  mono:   "'JetBrains Mono', monospace",
  body:   "'Space Grotesk', system-ui, sans-serif",
  display: "'BN Chubb', 'Space Grotesk', sans-serif",
};

// Stretchy locations HQ can filter the list by. A session belongs to a location
// when its title ("Herne Bay | Morning"), venue name or address mentions it.
const AREAS = ["Herne Bay", "Ponsonby", "St Heliers", "Orakei"];
const norm = (v?: string | null) => (v ?? "").toLowerCase().replace(/ō/g, "o").replace(/[.’']/g, "");
function areaOf(s: { title: string; location_name: string; location_address?: string | null }): string {
  const hay = norm(`${s.title} ${s.location_name} ${s.location_address ?? ""}`);
  // Title first, so "Ponsonby | Evening" held at a Herne Bay address still files under Ponsonby.
  const title = norm(s.title);
  return AREAS.find((a) => title.includes(norm(a))) ?? AREAS.find((a) => hay.includes(norm(a))) ?? "Other";
}

const STATE_LABELS: Record<string, string> = {
  open: "OPEN",
  confirmed: "GOING AHEAD",
  locked: "CHARGED",
  cancelled: "CANCELLED",
  completed: "DONE",
};

// The HQ look: ink outlines, no fills. `on` = the ink-filled "selected" state.
const pill = (on = false): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  padding: "7px 14px", borderRadius: 999, cursor: "pointer", textDecoration: "none",
  border: `2px solid ${T.ink}`, background: on ? T.ink : "transparent", color: on ? T.cream : T.ink,
  fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", whiteSpace: "nowrap",
});
const tag: React.CSSProperties = {
  fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em",
  padding: "3px 9px", borderRadius: 999, border: `1.5px solid ${T.ink}`, color: T.ink, flexShrink: 0, whiteSpace: "nowrap",
};

type Session = {
  id: string;
  title: string;
  movement_type: string;
  starts_at: string;
  duration_mins: number;
  location_name: string;
  location_address?: string | null;
  cost_base: number;
  revenue_target: number;
  min_attendees: number;
  max_attendees: number;
  current_holds: number;
  checked_in?: number;
  state: string;
  is_draft: boolean;
  keep_alive_at?: string | null;
};

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [testEmailSending, setTestEmailSending] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<string | null>(null);
  const [testEmailAddress, setTestEmailAddress] = useState("kimberleytorrie@gmail.com");
  const [testPushSending, setTestPushSending] = useState(false);
  const [testPushResult, setTestPushResult] = useState<string | null>(null);

  async function sendTestPush() {
    setTestPushSending(true);
    setTestPushResult(null);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setTestPushResult("Not logged in"); setTestPushSending(false); return; }
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Authorization": `Bearer ${session.access_token}` },
      });
      setTestPushResult(res.ok ? "✓ Push sent! Check your notifications" : "Error — are notifications enabled?");
    } catch { setTestPushResult("Error sending push"); }
    setTestPushSending(false);
  }

  async function sendTestEmail() {
    setTestEmailSending(true);
    setTestEmailResult(null);
    const allSessions = sessions;
    const firstSession = allSessions.find(s => s.state === "open") ?? allSessions[0];
    const res = await fetch("/api/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "hold_confirmed",
        to: testEmailAddress,
        name: testEmailAddress.split("@")[0],
        sessionTitle: firstSession?.title ?? "Sunday Slow Flow",
        date: firstSession ? new Date(firstSession.starts_at).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "long", day: "numeric", month: "long" }) + " at 9:00 AM" : "Sunday 6 July at 9:00 AM",
        price: "$28 incl. GST",
        venue: firstSession?.location_name ?? "Grey Lynn Community Centre",
        cancelUrl: `https://www.stretchyyoga.co.nz/hold/${firstSession?.id ?? ""}`,
        // The server fills in the real details (times, venue, dots, price) from this session.
        sessionId: firstSession?.id,
      }),
    });
    const data = await res.json();
    setTestEmailResult(res.ok ? `✓ Sent to ${testEmailAddress}` : `Error: ${data.error}`);
    setTestEmailSending(false);
  }

  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/sessions")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSessions(data);
        else setLoadError(data?.error ?? "Could not load sessions.");
        setLoading(false);
      })
      .catch(() => { setLoadError("Could not load sessions."); setLoading(false); });
  }, []);

  // Selecting past sessions to permanently delete.
  const [selectedPast, setSelectedPast] = useState<Set<string>>(new Set());
  const [deletingPast, setDeletingPast] = useState(false);
  const togglePast = (id: string) =>
    setSelectedPast((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  async function deleteSelectedPast() {
    const ids = Array.from(selectedPast);
    if (ids.length === 0 || deletingPast) return;
    if (!confirm(`Permanently delete ${ids.length} session${ids.length === 1 ? "" : "s"}? This removes the session and its records and can't be undone.`)) return;
    setDeletingPast(true);
    const deleted: string[] = [];
    for (const id of ids) {
      try {
        const res = await fetch(`/api/admin/sessions?id=${id}&hard=true`, { method: "DELETE" });
        if (res.ok) deleted.push(id);
      } catch { /* skip */ }
    }
    setSessions((prev) => prev.filter((s) => !deleted.includes(s.id)));
    setSelectedPast(new Set());
    setDeletingPast(false);
  }

  const [confirming, setConfirming] = useState<string | null>(null);

  // HQ "Keep alive": this session goes ahead at 36 hrs out whatever the numbers.
  // Nothing is sent when it's pressed — everyone hears at 36 hrs out as normal.
  // Pressing it again on a kept-alive session undoes it.
  async function keepAlive(id: string, title: string, holds: number, min: number) {
    const target = sessions.find((s) => s.id === id);
    const undo = !!target?.keep_alive_at;
    const msg = undo
      ? `Undo "Keep alive" for "${title}"? It will go back to needing ${min} people to go ahead.`
      : `Keep "${title}" alive with ${holds}/${min}? Nothing is sent now. At 36 hours out it's confirmed and everyone gets the "it's going ahead" email.`;
    if (!confirm(msg)) return;
    setConfirming(id);
    try {
      const res = await fetch(`/api/admin/sessions/${id}/confirm`, { method: undo ? "DELETE" : "POST" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Could not update this session.");
      } else if (undo) {
        setSessions((prev) => prev.map((s) => s.id === id ? { ...s, keep_alive_at: null } : s));
      } else if (data.keptAlive) {
        setSessions((prev) => prev.map((s) => s.id === id ? { ...s, keep_alive_at: data.keepAliveAt ?? new Date().toISOString() } : s));
      } else {
        // Already inside 36 hrs with the session still open: confirmed on the spot.
        setSessions((prev) => prev.map((s) => s.id === id ? { ...s, state: "confirmed" } : s));
      }
    } catch {
      alert("Could not update this session.");
    }
    setConfirming(null);
  }

  const [publishing, setPublishing] = useState<string | null>(null);

  async function publishSession(id: string) {
    setPublishing(id);
    const res = await fetch("/api/admin/sessions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_draft: false }),
    });
    if (res.ok) {
      setSessions((prev) => prev.map((s) => s.id === id ? { ...s, is_draft: false } : s));
    } else {
      alert("Could not publish this session.");
    }
    setPublishing(null);
  }

  const [requestingSub, setRequestingSub] = useState<string | null>(null);

  async function requestSub(id: string, title: string) {
    const roleInput = prompt(`Who's needed for "${title}"? Type "teacher" or "gem":`, "teacher");
    if (!roleInput) return;
    const role = roleInput.trim().toLowerCase();
    if (role !== "teacher" && role !== "gem") { alert('Type exactly "teacher" or "gem".'); return; }
    const note = prompt("Anything to add for whoever picks this up? (optional)") || "";

    setRequestingSub(id);
    const res = await fetch("/api/admin/substitute-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: id, role, note }),
    });
    const data = await res.json();
    setRequestingSub(null);
    if (res.ok) alert(`Sent to ${data.notified} eligible ${role}${data.notified === 1 ? "" : "s"}.`);
    else alert(data.error ?? "Could not send the request.");
  }

  // Past = already happened (date is behind us) OR cancelled — so sessions that
  // actually ran show here too, not just ones explicitly marked completed. Newest
  // past first. Upcoming = still to come and not cancelled.
  const nowMs = Date.now();
  const hasHappened = (s: Session) => new Date(s.starts_at).getTime() < nowMs || s.state === "cancelled";
  const [area, setArea] = useState<string>("All");
  const inArea = (s: Session) => area === "All" || areaOf(s) === area;
  const upcomingAll = sessions.filter((s) => !hasHappened(s));
  const areaTabs = ["All", ...AREAS, ...(upcomingAll.some((s) => areaOf(s) === "Other") ? ["Other"] : [])];
  const upcomingCount = (a: string) => (a === "All" ? upcomingAll.length : upcomingAll.filter((s) => areaOf(s) === a).length);
  const upcoming = upcomingAll.filter(inArea);
  const past     = sessions.filter(hasHappened).filter(inArea).sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

  return (
    <HQShell>
    <main style={{ background: T.cream, minHeight: "100vh", color: T.ink, fontFamily: T.body }}>
      <div style={{ maxWidth: 780, padding: "32px 32px 60px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 14 }}>
          <div>
            <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, color: "rgba(20,17,15,.5)", letterSpacing: "0.12em", marginBottom: 6 }}>
              SESSIONS
            </p>
            <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(32px,8vw,44px)", letterSpacing: "-0.02em", lineHeight: 1, textTransform: "uppercase", margin: 0 }}>
              {loading ? "Loading…" : `${upcoming.length} live.`}
            </h1>
          </div>
          <Link
            href="/admin/sessions/new"
            style={{ ...pill(), padding: "11px 20px", fontSize: 11 }}
          >
            + NEW SESSION
          </Link>
        </div>

        {loadError && (
          <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 12, background: "rgba(198,54,46,.10)", border: `1.5px solid ${T.red}`, color: T.red, fontSize: 13, fontWeight: 600 }}>
            {loadError}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: 60, color: "rgba(20,17,15,.35)", fontFamily: T.mono, fontSize: 12 }}>
            LOADING…
          </div>
        )}

        {/* Empty state */}
        {!loading && sessions.length === 0 && (
          <div style={{
            textAlign: "center", padding: 60,
            background: "#fff", borderRadius: 20,
            border: "2px dashed rgba(20,17,15,.25)",
          }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🧘</p>
            <p style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 800, color: "rgba(20,17,15,.4)", letterSpacing: "0.16em" }}>
              NO SESSIONS YET
            </p>
            <p style={{ fontSize: 14, color: "rgba(20,17,15,.5)", marginTop: 8, marginBottom: 24 }}>
              Create your first session to get things moving.
            </p>
            <Link
              href="/admin/sessions/new"
              style={{ ...pill(), padding: "12px 22px", fontSize: 11 }}
            >
              Create first session →
            </Link>
          </div>
        )}

        {/* Location filter — applies to both lists below */}
        {sessions.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
            {areaTabs.map((a) => {
              const on = area === a;
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => setArea(a)}
                  aria-pressed={on}
                  style={pill(on)}
                >
                  {a.toUpperCase()} · {upcomingCount(a)}
                </button>
              );
            })}
          </div>
        )}

        {area !== "All" && upcoming.length === 0 && (
          <p style={{ fontFamily: T.body, fontSize: 14, color: "rgba(20,17,15,.55)", margin: "0 0 28px" }}>
            No upcoming sessions in {area} yet.
          </p>
        )}

        {/* Upcoming sessions */}
        {upcoming.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: T.ink }}>
                UPCOMING · {upcoming.length}
              </span>
              <span style={{ flex: 1, height: 2, background: T.ink }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {upcoming.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  onRequestSub={requestSub}
                  requestingSub={requestingSub === s.id}
                  onPublish={publishSession}
                  publishing={publishing === s.id}
                  onConfirm={keepAlive}
                  confirming={confirming === s.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Past sessions — everything that already ran or was cancelled. Tick to
            permanently delete. */}
        {past.length > 0 && <WeeklyAttendance sessions={past} />}

        {past.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: T.ink }}>
                PAST · {past.length}
              </span>
              <span style={{ flex: 1, height: 2, background: T.ink }} />
              {selectedPast.size > 0 && (
                <button
                  onClick={deleteSelectedPast}
                  disabled={deletingPast}
                  style={{ ...pill(), padding: "5px 12px", color: T.red, borderColor: T.red }}
                >
                  {deletingPast ? "DELETING…" : `DELETE SELECTED (${selectedPast.size})`}
                </button>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {past.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  onRequestSub={requestSub}
                  requestingSub={requestingSub === s.id}
                  onPublish={publishSession}
                  publishing={publishing === s.id}
                  onConfirm={keepAlive}
                  confirming={confirming === s.id}
                  selectable
                  selected={selectedPast.has(s.id)}
                  onSelect={() => togglePast(s.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tests, folded away */}
        <details style={{ marginTop: 40, borderTop: `2px solid ${T.ink}`, paddingTop: 14 }}>
          <summary style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", cursor: "pointer" }}>TEST EMAIL &amp; PUSH</summary>
          <div style={{ marginTop: 14 }}>
        <div style={{ marginBottom: 14, padding: "16px 20px", borderRadius: 14, background: "#fff", border: `2px solid ${T.ink}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, color: "rgba(20,17,15,.45)", letterSpacing: "0.12em", marginBottom: 4 }}>PUSH NOTIFICATION TEST</p>
            <p style={{ fontSize: 13, color: "rgba(20,17,15,.65)" }}>Send a test push to yourself (must have notifications enabled on your device)</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {testPushResult && <span style={{ fontSize: 12, color: testPushResult.startsWith("✓") ? T.olive : T.red }}>{testPushResult}</span>}
            <button onClick={sendTestPush} disabled={testPushSending} style={{ padding: "10px 18px", borderRadius: 999, border: `2px solid ${T.ink}`, background: "transparent", color: T.ink, cursor: "pointer", fontFamily: T.mono, fontSize: 11, fontWeight: 800, letterSpacing: "0.1em" }}>
              {testPushSending ? "SENDING…" : "SEND TEST PUSH"}
            </button>
          </div>
        </div>

        {/* Test email button */}
        <div style={{ marginBottom: 24, padding: "16px 20px", borderRadius: 14, background: "#fff", border: `2px solid ${T.ink}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, color: "rgba(20,17,15,.45)", letterSpacing: "0.12em", marginBottom: 8 }}>TEST EMAIL — HOLD CONFIRMATION</p>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input
                value={testEmailAddress}
                onChange={e => setTestEmailAddress(e.target.value)}
                placeholder="email@example.com"
                style={{ padding: "9px 14px", borderRadius: 8, background: T.cream, border: "1.5px solid rgba(20,17,15,.2)", color: T.ink, fontFamily: T.body, fontSize: 14, outline: "none", minWidth: 220 }}
              />
              <button onClick={sendTestEmail} disabled={testEmailSending} style={{ padding: "9px 18px", borderRadius: 999, border: `2px solid ${T.ink}`, background: "transparent", color: T.ink, cursor: "pointer", fontFamily: T.mono, fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", flexShrink: 0 }}>
                {testEmailSending ? "SENDING…" : "SEND TEST"}
              </button>
              {testEmailResult && <span style={{ fontSize: 12, color: testEmailResult.startsWith("✓") ? T.olive : T.red }}>{testEmailResult}</span>}
            </div>
          </div>
        </div>

          </div>
        </details>
      </div>
    </main>
    </HQShell>
  );
}

type Attendee = {
  name: string; email: string; spots: number; heldAt: string;
  userId?: string; phone?: string | null; isComp?: boolean; checkedIn?: boolean;
  careNote?: string | null; careDuration?: string | null; firstTimer?: boolean; badge?: string | null;
};
type BookingError = { id: string; created_at: string; email: string | null; stage: string; message: string | null; code: string | null; quantity: number | null };
// What each stage means, in plain words, for HQ.
const BOOKING_STAGE: Record<string, string> = {
  start: "Couldn’t start the booking",
  details: "Name / mobile not saved",
  card: "Card details incomplete",
  bank: "Bank said no",
  save: "Booking not saved",
};
type EmailLogRow = { id: string; recipient: string; email_type: string; subject: string | null; status: string; error: string | null; created_at: string };

// Friendly names for the audit-log panel.
const EMAIL_LABELS: Record<string, string> = {
  hold_confirmed: "Booking held",
  almost_there: "38h nudge",
  session_going_ahead: "36h — it's happening",
  session_confirmed_open: "It's on (interested)",
  session_cancelled: "Cancelled",
  price_locked: "2h — final price charged",
  hold_cancelled: "Hold cancelled",
  comp_hold_confirmed: "Comp — on us",
  hq_digest: "HQ digest",
  host_confirmed_teacher: "Teacher — confirmed",
  host_confirmed_gem: "GEM — confirmed",
  host_recruit_teacher: "Teacher — nudge",
  host_recruit_gem: "GEM — nudge",
  host_scheduled_teacher: "Teacher — assigned",
  host_scheduled_gem: "GEM — assigned",
  host_cancelled_teacher: "Teacher — cancelled",
  host_cancelled_gem: "GEM — cancelled",
};

function SessionCard({
  session: s,
  onRequestSub,
  requestingSub,
  onPublish,
  publishing,
  onConfirm,
  confirming,
  selectable = false,
  selected = false,
  onSelect,
}: {
  session: Session;
  onRequestSub: (id: string, title: string) => void;
  requestingSub: boolean;
  onPublish: (id: string) => void;
  publishing: boolean;
  onConfirm: (id: string, title: string, holds: number, min: number) => void;
  confirming: boolean;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const dot = locationTheme(s).textAccent;
  const startDate = new Date(s.starts_at);
  const currentPrice = calculatePrice(s.cost_base, s.revenue_target, Math.max(s.current_holds, s.min_attendees));
  const needsMore = s.min_attendees - s.current_holds;
  // A session that's happened (not cancelled): show what it ended on.
  const ran = startDate.getTime() < Date.now() && s.state !== "cancelled";
  const live = s.state !== "cancelled" && s.state !== "completed";

  // One panel at a time under the card: the people (with the emails they've
  // been sent underneath), or the handful of less-used actions.
  const [panel, setPanel] = useState<"people" | "more" | null>(null);
  const [attendees, setAttendees] = useState<Attendee[] | null>(null);
  const [emails, setEmails] = useState<EmailLogRow[] | null>(null);
  const [hiccups, setHiccups] = useState<BookingError[]>([]);
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addMsg, setAddMsg] = useState<string | null>(null);

  async function loadPeople() {
    const [a, e, b] = await Promise.all([
      fetch(`/api/admin/sessions/${s.id}/attendees`).then((r) => (r.ok ? r.json() : { attendees: [] })).catch(() => ({ attendees: [] })),
      fetch(`/api/admin/sessions/${s.id}/emails`).then((r) => (r.ok ? r.json() : { emails: [] })).catch(() => ({ emails: [] })),
      fetch(`/api/admin/sessions/${s.id}/booking-errors`).then((r) => (r.ok ? r.json() : { errors: [] })).catch(() => ({ errors: [] })),
    ]);
    setAttendees(a.attendees ?? []);
    setEmails(e.emails ?? []);
    setHiccups(b.errors ?? []);
  }

  function toggle(p: "people" | "more") {
    const next = panel === p ? null : p;
    setPanel(next);
    if (next === "people" && attendees === null) loadPeople();
  }

  async function addComp() {
    if (!addEmail.trim() || adding) return;
    setAdding(true);
    setAddMsg(null);
    try {
      const res = await fetch(`/api/admin/sessions/${s.id}/attendees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addEmail.trim(), name: addName.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        setAddMsg(`✓ Added ${data.attendee?.name ?? addEmail}${data.newAccount ? " — new account, they'll get a set-up link" : ""}`);
        setAddEmail("");
        setAddName("");
        loadPeople();
      } else {
        setAddMsg(data.error ?? "Could not add.");
      }
    } catch {
      setAddMsg("Could not add.");
    }
    setAdding(false);
  }

  const field: React.CSSProperties = { padding: "8px 12px", borderRadius: 10, background: "#fff", border: `2px solid ${T.ink}`, color: T.ink, fontFamily: T.body, fontSize: 13, outline: "none" };
  const keyline = `1.5px solid ${T.ink}`;

  return (
    <div style={{ background: "#fff", border: `2px solid ${T.ink}`, borderRadius: 16, overflow: "hidden", opacity: live ? 1 : 0.75 }}>
      {/* What, when, where */}
      <div style={{ padding: "14px 18px", display: "flex", alignItems: "flex-start", gap: 12 }}>
        {selectable && (
          <input type="checkbox" checked={selected} onChange={onSelect} title="Select to permanently delete" style={{ width: 18, height: 18, marginTop: 2, flexShrink: 0, cursor: "pointer", accentColor: T.ink }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "rgba(20,17,15,.6)", margin: 0 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: dot, flexShrink: 0 }} />
            {startDate.toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "short", day: "numeric", month: "short" }).toUpperCase()} · {startDate.toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase()}
          </p>
          <p style={{ fontWeight: 700, fontSize: 16, margin: "4px 0 0", lineHeight: 1.2 }}>{s.title}</p>
          <p style={{ fontSize: 12.5, color: "rgba(20,17,15,.55)", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.location_name}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
          <span style={tag}>{STATE_LABELS[s.state] ?? s.state.toUpperCase()}</span>
          {s.is_draft && <span style={tag}>DRAFT · NOT LIVE</span>}
          {s.keep_alive_at && s.state === "open" && <span style={tag}>KEPT ALIVE</span>}
        </div>
      </div>

      {/* The numbers, on one line */}
      <div style={{ padding: "10px 18px", borderTop: keyline, display: "flex", gap: "6px 18px", flexWrap: "wrap", fontFamily: T.mono, fontSize: 12, fontWeight: 700 }}>
        <span>{s.current_holds} / {s.max_attendees} {ran ? "CAME" : "IN"}</span>
        {ran
          ? <span style={{ color: "rgba(20,17,15,.6)" }}>{s.checked_in ?? 0} CHECKED IN</span>
          : <span style={{ color: "rgba(20,17,15,.6)" }}>{needsMore > 0 && live ? `${needsMore} MORE TO GO AHEAD` : `MIN ${s.min_attendees}`}</span>}
        <span>{ran ? "FINAL" : "NOW"} ${currentPrice.toFixed(2)}</span>
        <span style={{ color: "rgba(20,17,15,.6)" }}>${s.cost_base} + ${s.revenue_target}</span>
      </div>

      {/* Main actions */}
      <div style={{ padding: "10px 18px 14px", borderTop: keyline, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {s.is_draft && (
          <button onClick={() => onPublish(s.id)} disabled={publishing} style={pill(true)}>{publishing ? "PUBLISHING…" : "PUBLISH"}</button>
        )}
        <button onClick={() => toggle("people")} style={pill(panel === "people")}>PEOPLE · {s.current_holds}</button>
        {s.state !== "cancelled" && <Link href={`/host/session/${s.id}/run-sheet`} style={pill()}>RUN SHEET</Link>}
        <Link href={`/sessions/${s.id}`} style={pill()}>VIEW</Link>
        {live && <Link href={`/admin/sessions/new?edit=${s.id}`} style={pill()}>EDIT</Link>}
        <button onClick={() => toggle("more")} style={pill(panel === "more")} aria-expanded={panel === "more"}>MORE {panel === "more" ? "▴" : "▾"}</button>
      </div>

      {/* More: the less-used actions */}
      {panel === "more" && (
        <div style={{ padding: "12px 18px 14px", borderTop: keyline, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href={`/admin/sessions/new?duplicate=${s.id}`} style={pill()}>DUPLICATE</Link>
          {(s.state === "open" || s.state === "confirmed") && (
            <button onClick={() => onRequestSub(s.id, s.title)} disabled={requestingSub} style={pill()}>{requestingSub ? "SENDING…" : "NEED A SUB"}</button>
          )}
          {s.state === "open" && (
            <button
              onClick={() => onConfirm(s.id, s.title, s.current_holds, s.min_attendees)}
              disabled={confirming}
              title={s.keep_alive_at ? "Kept alive: this goes ahead at 36 hours out whatever the numbers. Click to undo." : "Go ahead at 36 hours out even if it's under the minimum. Nothing is sent now — everyone is told at 36 hours out."}
              style={pill()}
            >
              {confirming ? "SAVING…" : s.keep_alive_at ? "UNDO KEEP ALIVE" : "KEEP ALIVE"}
            </button>
          )}
          {(s.state === "locked" || s.state === "completed") && <Link href={`/admin/sessions/${s.id}/money`} style={pill()}>MONEY</Link>}
          {live && <span style={{ fontSize: 12, color: "rgba(20,17,15,.55)", alignSelf: "center" }}>Cancel is in Edit.</span>}
        </div>
      )}

      {/* People: who's coming, add someone on us, and the emails sent */}
      {panel === "people" && (
        <div style={{ padding: "14px 18px", borderTop: keyline }}>
          {attendees === null ? (
            <p style={{ fontSize: 12, color: "rgba(20,17,15,.4)", fontFamily: T.mono, margin: 0 }}>LOADING…</p>
          ) : attendees.length === 0 ? (
            <p style={{ fontSize: 13, color: "rgba(20,17,15,.5)", margin: 0 }}>No one&rsquo;s holding a place yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "rgba(20,17,15,.6)" }}>
                {attendees.filter((a) => a.checkedIn).reduce((n, a) => n + a.spots, 0)} HERE · {attendees.filter((a) => !a.checkedIn).reduce((n, a) => n + a.spots, 0)} NOT YET · {attendees.filter((a) => a.careNote).length} MOVING WITH CARE
              </span>
              {[...attendees].sort(byFirstName).map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, paddingBottom: 10, borderBottom: "1px solid rgba(20,17,15,.12)" }}>
                  <button
                    type="button"
                    aria-label={a.checkedIn ? `Mark ${a.name} not here` : `Check in ${a.name}`}
                    onClick={async () => {
                      if (!a.userId) return;
                      const next = !a.checkedIn;
                      setAttendees((list) => (list ?? []).map((x) => (x.userId === a.userId ? { ...x, checkedIn: next } : x)));
                      await fetch(`/api/admin/sessions/${s.id}/attendees`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userId: a.userId, checkedIn: next }),
                      });
                    }}
                    style={{ width: 28, height: 28, minHeight: 28, borderRadius: "50%", flexShrink: 0, cursor: "pointer", background: a.checkedIn ? T.ink : "transparent", border: `2px solid ${T.ink}`, color: T.cream, fontWeight: 800, fontSize: 13, lineHeight: 1 }}
                  >
                    {a.checkedIn ? "✓" : ""}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700 }}>{a.name}</span>
                      {a.spots > 1 && <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800 }}>×{a.spots}</span>}
                      {a.badge && <span style={tag}>{a.badge}</span>}
                      {a.isComp && <span style={tag}>ON US</span>}
                    </div>
                    <div style={{ color: "rgba(20,17,15,.55)", wordBreak: "break-word" }}>
                      {a.email}{a.phone ? <> · <a href={`tel:${a.phone}`} style={{ color: "inherit" }}>{a.phone}</a></> : null}
                    </div>
                    {a.careNote && (
                      <div style={{ marginTop: 6, padding: "8px 10px", borderRadius: 10, border: `1.5px solid ${T.ink}`, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
                        <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", display: "block", marginBottom: 2 }}>MOVING WITH CARE{a.careDuration ? ` · ${a.careDuration.toUpperCase()}` : ""}</span>
                        {a.careNote}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comp someone in — Stretchy covers it, no charge. They get the full
              "you're in — on us" email + the 38h / 36h / 2h reminders. */}
          {live && (
            <div style={{ marginTop: 14 }}>
              <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, color: "rgba(20,17,15,.5)", letterSpacing: "0.1em", margin: "0 0 8px" }}>ADD SOMEONE · ON US</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="email@example.com" type="email" style={{ ...field, flex: "1 1 180px", minWidth: 160 }} />
                <input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Name (optional)" style={{ ...field, flex: "1 1 130px", minWidth: 120 }} />
                <button onClick={addComp} disabled={adding || !addEmail.trim()} style={{ ...pill(), opacity: adding || !addEmail.trim() ? 0.4 : 1 }}>{adding ? "ADDING…" : "ADD"}</button>
              </div>
              {addMsg && <p style={{ fontSize: 12, marginTop: 8, color: addMsg.startsWith("✓") ? T.ink : T.red }}>{addMsg}</p>}
            </div>
          )}

          {/* What the booking pop-up told people when booking didn't go smoothly. */}
          {hiccups.length > 0 && (
            <details style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(20,17,15,.12)" }}>
              <summary style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", cursor: "pointer" }}>
                BOOKING HICCUPS · {hiccups.length}
              </summary>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                {hiccups.map((h) => (
                  <div key={h.id} style={{ fontSize: 12.5, borderBottom: "1px solid rgba(20,17,15,.08)", paddingBottom: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                      <span><strong>{BOOKING_STAGE[h.stage] ?? h.stage}</strong>{h.email ? <span style={{ color: "rgba(20,17,15,.55)" }}> · {h.email}</span> : null}{h.quantity && h.quantity > 1 ? ` · ${h.quantity} places` : ""}</span>
                      <span style={{ fontFamily: T.mono, fontSize: 10, color: "rgba(20,17,15,.45)" }}>
                        {new Date(h.created_at).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })}
                      </span>
                    </div>
                    {h.message && <div style={{ color: "rgba(20,17,15,.7)", marginTop: 2 }}>&ldquo;{h.message}&rdquo;</div>}
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Every email sent for this session, who got it, and whether it landed. */}
          {emails && emails.length > 0 && (
            <details style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(20,17,15,.12)" }}>
              <summary style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", cursor: "pointer" }}>
                EMAILS SENT · {emails.length}{emails.some((e) => e.status === "error") ? ` · ${emails.filter((e) => e.status === "error").length} FAILED` : ""}
              </summary>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                {emails.map((e) => (
                  <div key={e.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, fontSize: 12.5, borderBottom: "1px solid rgba(20,17,15,.08)", paddingBottom: 5, flexWrap: "wrap" }}>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontWeight: 700 }}>{EMAIL_LABELS[e.email_type] ?? e.email_type}</span>
                      <span style={{ color: "rgba(20,17,15,.55)", marginLeft: 8, wordBreak: "break-all" }}>{e.recipient}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span style={{ fontFamily: T.mono, fontSize: 10, color: "rgba(20,17,15,.45)" }}>
                        {new Date(e.created_at).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })}
                      </span>
                      <span style={{ ...tag, color: e.status === "error" ? T.red : T.ink, borderColor: e.status === "error" ? T.red : T.ink }} title={e.error ?? undefined}>
                        {e.status === "error" ? "FAILED" : "SENT"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}
    </div>
  );
}


// Weekly attendance for sessions that ran (Mon–Sun weeks, NZ time), newest
// first: sessions, places booked and how many were checked in.
function WeeklyAttendance({ sessions }: { sessions: Session[] }) {
  const ran = sessions.filter((s) => s.state !== "cancelled" && new Date(s.starts_at).getTime() < Date.now());
  const weeks = new Map<string, { label: string; sessions: number; places: number; checkedIn: number }>();
  for (const s of ran) {
    const nz = new Date(new Date(s.starts_at).toLocaleString("en-US", { timeZone: "Pacific/Auckland" }));
    const monday = new Date(nz);
    monday.setDate(nz.getDate() - ((nz.getDay() + 6) % 7));
    const key = monday.toISOString().slice(0, 10);
    const w = weeks.get(key) ?? { label: `WEEK OF ${monday.toLocaleDateString("en-NZ", { day: "numeric", month: "short" }).toUpperCase()}`, sessions: 0, places: 0, checkedIn: 0 };
    w.sessions += 1;
    w.places += s.current_holds;
    w.checkedIn += s.checked_in ?? 0;
    weeks.set(key, w);
  }
  const rows = Array.from(weeks.entries()).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);
  if (rows.length === 0) return null;
  const cell: React.CSSProperties = { padding: "8px 10px", borderTop: "1px solid rgba(20,17,15,.12)", fontFamily: T.mono, fontSize: 12, fontWeight: 700 };
  const head: React.CSSProperties = { padding: "8px 10px", fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(20,17,15,.55)", textAlign: "left" };
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: T.ink }}>ATTENDANCE BY WEEK</span>
        <span style={{ flex: 1, height: 2, background: T.ink }} />
      </div>
      <div style={{ background: "#fff", border: `2px solid ${T.ink}`, borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><th style={head}>WEEK</th><th style={head}>SESSIONS</th><th style={head}>PLACES</th><th style={head}>CHECKED IN</th></tr></thead>
          <tbody>
            {rows.map(([k, w]) => (
              <tr key={k}><td style={cell}>{w.label}</td><td style={cell}>{w.sessions}</td><td style={cell}>{w.places}</td><td style={cell}>{w.checkedIn}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
