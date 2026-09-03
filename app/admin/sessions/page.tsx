"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import HQShell from "@/components/hq/HQShell";
import { calculatePrice } from "@/lib/pricing";

const T = {
  black:  "#14110F",
  cream:  "#F7F0E8",
  yellow: "#FCBB16",
  blue:   "#0000FF",
  green:  "#716F39",
  orange: "#E96709",
  red:    "#C6362E",
  olive:  "#716F39",
  purple: "#902F8A",
  mono:   "'JetBrains Mono', monospace",
  body:   "'Space Grotesk', system-ui, sans-serif",
};

const TYPE_COLORS: Record<string, string> = {
  yoga: "#902F8A", pilates: "#0000FF", breath: "#29ABE2",
  sound: "#716F39", flow: "#FCBB16", run: "#E96709", hiit: "#902F8A",
};

const STATE_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  open:      { bg: "rgba(255,209,102,0.15)", fg: T.yellow,  label: "OPEN" },
  confirmed: { bg: "rgba(76,175,130,0.15)",  fg: T.green,   label: "CONFIRMED" },
  locked:    { bg: "rgba(44,143,224,0.15)",  fg: T.blue,    label: "LOCKED" },
  cancelled: { bg: "rgba(26,26,26,0.3)",     fg: "#888",    label: "CANCELLED" },
  completed: { bg: "rgba(76,175,130,0.10)",  fg: "#888",    label: "DONE" },
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
    // Use real session ID if available
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
        date: firstSession ? new Date(firstSession.starts_at).toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" }) + " at 9:00 AM" : "Sunday 6 July at 9:00 AM",
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
    <main style={{ background: T.black, minHeight: "100vh", color: T.cream, fontFamily: T.body }}>
      <div style={{ maxWidth: 760, padding: "32px 32px 60px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "rgba(245,237,227,0.4)", letterSpacing: "0.2em", marginBottom: 6 }}>
              SESSIONS
            </p>
            <h1 style={{ fontSize: "clamp(36px,10vw,52px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 0.92, margin: 0 }}>
              {loading ? "Loading…" : `${upcoming.length} live.`}
            </h1>
          </div>
          <Link
            href="/admin/sessions/new"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "12px 20px", borderRadius: 999,
              background: T.cream, color: T.black,
              fontFamily: T.body, fontSize: 14, fontWeight: 700,
              textDecoration: "none", flexShrink: 0,
            }}
          >
            + New session
          </Link>
        </div>

        {/* Test push notification */}
        <div style={{ marginBottom: 16, padding: "16px 20px", borderRadius: 14, background: "rgba(245,237,227,0.06)", border: "1px solid rgba(245,237,227,0.10)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: "rgba(245,237,227,0.4)", letterSpacing: "0.14em", marginBottom: 4 }}>PUSH NOTIFICATION TEST</p>
            <p style={{ fontSize: 13, color: "rgba(245,237,227,0.6)" }}>Send a test push to yourself (must have notifications enabled on your device)</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {testPushResult && <span style={{ fontSize: 12, color: testPushResult.startsWith("✓") ? "#716F39" : "#C6362E" }}>{testPushResult}</span>}
            <button onClick={sendTestPush} disabled={testPushSending} style={{ padding: "10px 18px", borderRadius: 999, background: "rgba(245,237,227,0.15)", color: "#F7F0E8", border: "1px solid rgba(245,237,227,0.2)", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em" }}>
              {testPushSending ? "SENDING…" : "SEND TEST PUSH"}
            </button>
          </div>
        </div>

        {/* Test email button */}
        <div style={{ marginBottom: 24, padding: "16px 20px", borderRadius: 14, background: "rgba(245,237,227,0.06)", border: "1px solid rgba(245,237,227,0.10)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: "rgba(245,237,227,0.4)", letterSpacing: "0.14em", marginBottom: 8 }}>TEST EMAIL — HOLD CONFIRMATION</p>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <input
                value={testEmailAddress}
                onChange={e => setTestEmailAddress(e.target.value)}
                placeholder="email@example.com"
                style={{ padding: "8px 14px", borderRadius: 8, background: "rgba(245,237,227,0.08)", border: "1px solid rgba(245,237,227,0.15)", color: "#F7F0E8", fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, outline: "none", minWidth: 220 }}
              />
              <button onClick={sendTestEmail} disabled={testEmailSending} style={{ padding: "9px 18px", borderRadius: 999, background: "rgba(245,237,227,0.15)", color: "#F7F0E8", border: "1px solid rgba(245,237,227,0.2)", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", flexShrink: 0 }}>
                {testEmailSending ? "SENDING…" : "SEND TEST"}
              </button>
              {testEmailResult && <span style={{ fontSize: 12, color: testEmailResult.startsWith("✓") ? "#716F39" : "#C6362E" }}>{testEmailResult}</span>}
            </div>
          </div>
        </div>

        {loadError && (
          <div style={{ marginBottom: 20, padding: "14px 18px", borderRadius: 12, background: "rgba(230,57,70,0.15)", border: "1px solid rgba(230,57,70,0.3)", color: "#C6362E", fontSize: 13, fontWeight: 600 }}>
            {loadError}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: 60, color: "rgba(245,237,227,0.3)", fontFamily: T.mono, fontSize: 12 }}>
            LOADING…
          </div>
        )}

        {/* Empty state */}
        {!loading && sessions.length === 0 && (
          <div style={{
            textAlign: "center", padding: 60,
            background: "rgba(245,237,227,0.04)", borderRadius: 20,
            border: "1px dashed rgba(245,237,227,0.12)",
          }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>🧘</p>
            <p style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: "rgba(245,237,227,0.4)", letterSpacing: "0.16em" }}>
              NO SESSIONS YET
            </p>
            <p style={{ fontSize: 14, color: "rgba(245,237,227,0.5)", marginTop: 8, marginBottom: 24 }}>
              Create your first session to get things moving.
            </p>
            <Link
              href="/admin/sessions/new"
              style={{
                display: "inline-block", padding: "14px 24px", borderRadius: 999,
                background: T.cream, color: T.black, textDecoration: "none",
                fontFamily: T.body, fontSize: 15, fontWeight: 700,
              }}
            >
              Create first session →
            </Link>
          </div>
        )}

        {/* Upcoming sessions */}
        {upcoming.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "rgba(245,237,227,0.4)", letterSpacing: "0.18em", marginBottom: 14 }}>
              UPCOMING
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {upcoming.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  onCancel={cancelSession}
                  cancelling={cancelling === s.id}
                  onRequestSub={requestSub}
                  requestingSub={requestingSub === s.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Past sessions */}
        {past.length > 0 && (
          <div>
            <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "rgba(245,237,227,0.4)", letterSpacing: "0.18em", marginBottom: 14 }}>
              PAST
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {past.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  onCancel={cancelSession}
                  cancelling={cancelling === s.id}
                  onRequestSub={requestSub}
                  requestingSub={requestingSub === s.id}
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

function SessionCard({
  session: s,
  onCancel,
  cancelling,
  onRequestSub,
  requestingSub,
}: {
  session: Session;
  onCancel: (id: string, title: string) => void;
  cancelling: boolean;
  onRequestSub: (id: string, title: string) => void;
  requestingSub: boolean;
}) {
  const typeColor = TYPE_COLORS[s.movement_type] || "#888";
  const stateInfo = STATE_COLORS[s.state] || STATE_COLORS.open;
  const startDate = new Date(s.starts_at);
  const currentPrice = calculatePrice(s.cost_base, s.revenue_target, Math.max(s.current_holds, s.min_attendees));

  const needsMore = s.min_attendees - s.current_holds;
  const isConfirmed = s.current_holds >= s.min_attendees;

  return (
    <div style={{
      background: "rgba(245,237,227,0.05)", borderRadius: 16,
      border: "1px solid rgba(245,237,227,0.10)", overflow: "hidden",
    }}>
      {/* Top row */}
      <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
        {/* Type dot */}
        <div style={{
          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
          background: typeColor + "22", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, color: typeColor }}>
            {s.movement_type.charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Title + location */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 700, fontSize: 15, margin: 0, lineHeight: 1.2 }}>{s.title}</p>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: "rgba(245,237,227,0.45)", letterSpacing: "0.1em", marginTop: 3 }}>
            {startDate.toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" }).toUpperCase()} · {startDate.toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase()}
          </p>
          <p style={{ fontSize: 12, color: "rgba(245,237,227,0.45)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {s.location_name}
          </p>
        </div>

        {/* State badge */}
        <div style={{
          padding: "5px 10px", borderRadius: 999,
          background: stateInfo.bg, color: stateInfo.fg,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
          flexShrink: 0,
        }}>
          {stateInfo.label}
        </div>
      </div>

      {/* Stats row */}
      <div style={{
        padding: "12px 20px", display: "flex", gap: 24, alignItems: "center",
        borderTop: "1px solid rgba(245,237,227,0.06)",
        background: "rgba(0,0,0,0.2)",
      }}>
        <Stat label="HOLDS" value={`${s.current_holds} / ${s.max_attendees}`} />
        <Stat label="PRICE NOW" value={`$${currentPrice.toFixed(2)}`} color={T.yellow} />
        <Stat label="COSTS + TARGET" value={`$${s.cost_base} + $${s.revenue_target}`} />
        <Stat label="MIN" value={`${s.min_attendees} needed`} color={isConfirmed ? T.green : needsMore > 0 ? "#E96709" : T.green} />

        {/* Actions */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <Link
            href={`/sessions/${s.id}`}
            style={{
              padding: "7px 14px", borderRadius: 999, textDecoration: "none",
              background: "rgba(245,237,227,0.10)", color: T.cream,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
            }}
          >
            VIEW
          </Link>
          <Link
            href={`/admin/sessions/new?duplicate=${s.id}`}
            style={{
              padding: "7px 14px", borderRadius: 999, textDecoration: "none",
              background: "rgba(245,237,227,0.10)", color: T.cream,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
            }}
          >
            DUPLICATE
          </Link>
          {(s.state === "locked" || s.state === "completed") && (
            <Link
              href={`/admin/sessions/${s.id}/money`}
              style={{
                padding: "7px 14px", borderRadius: 999, textDecoration: "none",
                background: "rgba(252,187,22,0.18)", color: T.yellow,
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
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
                background: "rgba(252,187,22,0.18)", color: T.yellow,
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
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
                background: "rgba(230,57,70,0.15)", color: "#C6362E",
                fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em",
              }}
            >
              {cancelling ? "…" : "CANCEL"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, color: "rgba(245,237,227,0.35)", letterSpacing: "0.14em", marginBottom: 2 }}>
        {label}
      </p>
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: color || "#F7F0E8" }}>
        {value}
      </p>
    </div>
  );
}
