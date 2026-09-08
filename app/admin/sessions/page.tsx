"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import HQShell from "@/components/hq/HQShell";
import { calculatePrice } from "@/lib/pricing";

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

const TYPE_COLORS: Record<string, string> = {
  yoga: "#902F8A", pilates: "#0000FF", breath: "#29ABE2",
  sound: "#716F39", flow: "#FCBB16", run: "#E96709", hiit: "#902F8A",
};

const STATE_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  open:      { bg: "rgba(252,187,22,.28)",  fg: T.ink,    label: "OPEN" },
  confirmed: { bg: "rgba(113,111,57,.18)",  fg: T.olive,  label: "CONFIRMED" },
  locked:    { bg: "rgba(41,171,226,.18)",  fg: T.blue,   label: "LOCKED" },
  cancelled: { bg: "rgba(20,17,15,.08)",    fg: "rgba(20,17,15,.5)", label: "CANCELLED" },
  completed: { bg: "rgba(20,17,15,.06)",    fg: "rgba(20,17,15,.4)", label: "DONE" },
};

type Session = {
  id: string;
  title: string;
  movement_type: string;
  starts_at: string;
  duration_mins: number;
  location_name: string;
  cost_base: number;
  revenue_target: number;
  min_attendees: number;
  max_attendees: number;
  current_holds: number;
  state: string;
  is_draft: boolean;
};

export default function AdminSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
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
        socialStretchVenue: "nearby",
        cancelUrl: `https://stretchyyoga.co.nz/hold/${firstSession?.id ?? ""}`,
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

  async function cancelSession(id: string, title: string) {
    if (!confirm(`Cancel "${title}"? This will release all holds.`)) return;
    setCancelling(id);
    await fetch(`/api/admin/sessions?id=${id}`, { method: "DELETE" });
    setSessions((prev) =>
      prev.map((s) => s.id === id ? { ...s, state: "cancelled" } : s)
    );
    setCancelling(null);
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

  const upcoming = sessions.filter((s) => s.state !== "cancelled" && s.state !== "completed");
  const past     = sessions.filter((s) => s.state === "completed" || s.state === "cancelled");

  return (
    <HQShell>
    <main style={{ background: T.cream, minHeight: "100vh", color: T.ink, fontFamily: T.body }}>
      <div style={{ maxWidth: 780, padding: "32px 32px 60px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 14 }}>
          <div>
            <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, color: T.purple, letterSpacing: "0.12em", marginBottom: 6 }}>
              SESSIONS
            </p>
            <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(32px,8vw,44px)", letterSpacing: "-0.02em", lineHeight: 1, textTransform: "uppercase", margin: 0 }}>
              {loading ? "Loading…" : `${upcoming.length} live.`}
            </h1>
          </div>
          <Link
            href="/admin/sessions/new"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "12px 22px", borderRadius: 999,
              background: T.ink, color: T.cream,
              fontFamily: T.body, fontSize: 14, fontWeight: 700,
              textDecoration: "none", flexShrink: 0,
            }}
          >
            + New session
          </Link>
        </div>

        {/* Test push notification */}
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
              style={{
                display: "inline-block", padding: "14px 24px", borderRadius: 999,
                background: T.ink, color: T.cream, textDecoration: "none",
                fontFamily: T.body, fontSize: 15, fontWeight: 700,
              }}
            >
              Create first session →
            </Link>
          </div>
        )}

        {/* Upcoming sessions */}
        {upcoming.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: T.ink }}>
                UPCOMING · {upcoming.length}
              </span>
              <span style={{ flex: 1, height: 1, background: "rgba(20,17,15,.15)" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {upcoming.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  onCancel={cancelSession}
                  cancelling={cancelling === s.id}
                  onRequestSub={requestSub}
                  requestingSub={requestingSub === s.id}
                  onPublish={publishSession}
                  publishing={publishing === s.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Past sessions */}
        {past.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: T.ink }}>
                PAST · {past.length}
              </span>
              <span style={{ flex: 1, height: 1, background: "rgba(20,17,15,.15)" }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {past.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  onCancel={cancelSession}
                  cancelling={cancelling === s.id}
                  onRequestSub={requestSub}
                  requestingSub={requestingSub === s.id}
                  onPublish={publishSession}
                  publishing={publishing === s.id}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
    </HQShell>
  );
}

type Attendee = { name: string; email: string; spots: number; heldAt: string };

function SessionCard({
  session: s,
  onCancel,
  cancelling,
  onRequestSub,
  requestingSub,
  onPublish,
  publishing,
}: {
  session: Session;
  onCancel: (id: string, title: string) => void;
  cancelling: boolean;
  onRequestSub: (id: string, title: string) => void;
  requestingSub: boolean;
  onPublish: (id: string) => void;
  publishing: boolean;
}) {
  const typeColor = TYPE_COLORS[s.movement_type] || "#888";
  const stateInfo = STATE_COLORS[s.state] || STATE_COLORS.open;
  const startDate = new Date(s.starts_at);
  const currentPrice = calculatePrice(s.cost_base, s.revenue_target, Math.max(s.current_holds, s.min_attendees));

  const needsMore = s.min_attendees - s.current_holds;
  const isConfirmed = s.current_holds >= s.min_attendees;

  const [showAttendees, setShowAttendees] = useState(false);
  const [attendees, setAttendees] = useState<Attendee[] | null>(null);
  const [loadingAttendees, setLoadingAttendees] = useState(false);

  async function toggleAttendees() {
    if (showAttendees) { setShowAttendees(false); return; }
    setShowAttendees(true);
    if (attendees !== null) return;
    setLoadingAttendees(true);
    try {
      const res = await fetch(`/api/admin/sessions/${s.id}/attendees`);
      const data = await res.json();
      setAttendees(res.ok ? data.attendees : []);
    } catch {
      setAttendees([]);
    }
    setLoadingAttendees(false);
  }

  return (
    <div style={{ background: "#fff", border: `2px solid ${T.ink}`, borderRadius: 14, overflow: "hidden" }}>
      {/* Top row */}
      <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
        {/* Type dot */}
        <div style={{
          width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
          background: typeColor + "22", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 800, color: typeColor }}>
            {s.movement_type.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Title + location */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: 15, margin: 0, lineHeight: 1.2, color: T.ink }}>{s.title}</p>
          <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, color: "rgba(20,17,15,.5)", letterSpacing: "0.08em", marginTop: 3 }}>
            {startDate.toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "short", day: "numeric", month: "short" }).toUpperCase()} · {startDate.toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase()}
          </p>
          <p style={{ fontSize: 12, color: "rgba(20,17,15,.5)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {s.location_name}
          </p>
        </div>

        {/* Draft / state badge — is_draft is a separate flag from state, so a
            draft session still shows state "open" underneath; flag it clearly
            since a draft is invisible on the public site regardless of state. */}
        {s.is_draft && (
          <span style={{
            fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em",
            padding: "4px 10px", borderRadius: 999, flexShrink: 0,
            background: "rgba(252,187,22,.35)", color: T.ink,
          }}>
            DRAFT — NOT LIVE
          </span>
        )}
        <span style={{
          fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em",
          padding: "4px 10px", borderRadius: 999, flexShrink: 0,
          background: stateInfo.bg, color: stateInfo.fg,
        }}>
          {stateInfo.label}
        </span>
      </div>

      {/* Stats row */}
      <div style={{
        padding: "12px 18px", display: "flex", gap: 22, alignItems: "center", flexWrap: "wrap",
        borderTop: "1px solid rgba(20,17,15,.10)",
        background: T.cream,
      }}>
        <Stat label="HOLDS" value={`${s.current_holds} / ${s.max_attendees}`} />
        <Stat label="PRICE NOW" value={`$${currentPrice.toFixed(2)}`} color={T.purple} />
        <Stat label="COSTS + TARGET" value={`$${s.cost_base} + $${s.revenue_target}`} />
        <Stat label="MIN" value={`${s.min_attendees} needed`} color={isConfirmed ? T.olive : needsMore > 0 ? T.orange : T.olive} />

        {/* Actions */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          {s.is_draft && (
            <button
              onClick={() => onPublish(s.id)}
              disabled={publishing}
              style={{
                padding: "7px 14px", borderRadius: 999, border: "none", cursor: "pointer",
                background: T.yellow, color: T.ink,
                fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
              }}
            >
              {publishing ? "PUBLISHING…" : "PUBLISH"}
            </button>
          )}
          <button
            onClick={toggleAttendees}
            style={{
              padding: "7px 14px", borderRadius: 999, cursor: "pointer",
              border: `1.5px solid ${T.ink}`,
              background: showAttendees ? T.ink : "transparent",
              color: showAttendees ? T.cream : T.ink,
              fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
            }}
          >
            ATTENDEES ({s.current_holds})
          </button>
          <Link
            href={`/sessions/${s.id}`}
            style={{
              padding: "7px 14px", borderRadius: 999, textDecoration: "none",
              border: `1.5px solid ${T.ink}`, background: "transparent", color: T.ink,
              fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
            }}
          >
            VIEW
          </Link>
          <Link
            href={`/admin/sessions/new?duplicate=${s.id}`}
            style={{
              padding: "7px 14px", borderRadius: 999, textDecoration: "none",
              border: `1.5px solid ${T.ink}`, background: "transparent", color: T.ink,
              fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
            }}
          >
            DUPLICATE
          </Link>
          {(s.state === "locked" || s.state === "completed") && (
            <Link
              href={`/admin/sessions/${s.id}/money`}
              style={{
                padding: "7px 14px", borderRadius: 999, textDecoration: "none",
                background: T.yellow, color: T.ink,
                fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
              }}
            >
              MONEY
            </Link>
          )}
          {(s.state === "open" || s.state === "confirmed") && (
            <button
              onClick={() => onRequestSub(s.id, s.title)}
              disabled={requestingSub}
              style={{
                padding: "7px 14px", borderRadius: 999, border: "none", cursor: "pointer",
                background: "rgba(233,103,9,.18)", color: T.orange,
                fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
              }}
            >
              {requestingSub ? "SENDING…" : "NEED SUB"}
            </button>
          )}
          {s.state === "open" && (
            <button
              onClick={() => onCancel(s.id, s.title)}
              disabled={cancelling}
              style={{
                padding: "7px 14px", borderRadius: 999, border: "none", cursor: "pointer",
                background: T.red, color: T.cream,
                fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em",
              }}
            >
              {cancelling ? "…" : "CANCEL"}
            </button>
          )}
        </div>
      </div>

      {/* Attendee roster */}
      {showAttendees && (
        <div style={{ padding: "14px 18px", borderTop: "1px solid rgba(20,17,15,.10)" }}>
          {loadingAttendees ? (
            <p style={{ fontSize: 12, color: "rgba(20,17,15,.4)", fontFamily: T.mono }}>LOADING…</p>
          ) : !attendees || attendees.length === 0 ? (
            <p style={{ fontSize: 13, color: "rgba(20,17,15,.45)" }}>No one&rsquo;s holding a spot yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {attendees.map((a, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                  <div>
                    <span style={{ fontWeight: 700, color: T.ink }}>{a.name}</span>
                    <span style={{ color: "rgba(20,17,15,.5)", marginLeft: 8 }}>{a.email}</span>
                  </div>
                  {a.spots > 1 && (
                    <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 800, color: T.purple }}>×{a.spots}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 800, color: "rgba(20,17,15,.4)", letterSpacing: "0.1em", marginBottom: 2 }}>
        {label}
      </p>
      <p style={{ fontFamily: T.mono, fontSize: 13, fontWeight: 800, color: color || T.ink }}>
        {value}
      </p>
    </div>
  );
}
