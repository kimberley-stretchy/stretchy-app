"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";

const T = {
  black:  "#1A1A1A",
  cream:  "#F5EDE3",
  yellow: "#FFD166",
  blue:   "#2C8FE0",
  green:  "#4CAF82",
  orange: "#FF6B35",
  red:    "#E63946",
  olive:  "#7A8330",
  purple: "#A535C7",
  mono:   "'JetBrains Mono', monospace",
  body:   "'Space Grotesk', system-ui, sans-serif",
};

const TYPE_COLORS: Record<string, string> = {
  yoga: "#A535C7", pilates: "#2A3FE0", breath: "#7A8330",
  sound: "#4FB8E0", flow: "#FF6B35", run: "#E63946", hiit: "#2C8FE0",
};

const STATE_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  open:      { bg: "rgba(255,209,102,0.15)", fg: T.yellow,  label: "OPEN" },
  confirmed: { bg: "rgba(76,175,130,0.15)",  fg: T.green,   label: "CONFIRMED" },
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
  host_target: number;
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

  async function sendTestEmail() {
    setTestEmailSending(true);
    setTestEmailResult(null);
    const res = await fetch("/api/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "hold_confirmed",
        to: "kimberleytorrie@gmail.com",
        name: "Kimberley",
        sessionTitle: "Sunday Slow Flow",
        date: "Sunday 6 July at 9:00 AM",
        price: "$32 incl. GST",
        venue: "Grey Lynn Community Centre",
        socialStretchVenue: "Little Bird Café next door",
        cancelUrl: "https://stretchy.social/hold/test",
      }),
    });
    const data = await res.json();
    setTestEmailResult(res.ok ? "✓ Test email sent! Check kimberleytorrie@gmail.com" : `Error: ${data.error}`);
    setTestEmailSending(false);
  }

  useEffect(() => {
    fetch("/api/admin/sessions")
      .then((r) => r.json())
      .then((data) => { setSessions(data); setLoading(false); })
      .catch(() => setLoading(false));
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

  const upcoming = sessions.filter((s) => s.state !== "cancelled" && s.state !== "completed");
  const past     = sessions.filter((s) => s.state === "completed" || s.state === "cancelled");

  return (
    <main style={{ background: T.black, minHeight: "100vh", color: T.cream, fontFamily: T.body }}>
      {/* Nav */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 20px", maxWidth: 720, margin: "0 auto",
      }}>
        <Link href="/admin">
          <SMark size={28} className="text-cream" />
        </Link>
        <div style={{
          display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
          borderRadius: 999, background: T.cream,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.blue }} />
          <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: T.black, letterSpacing: "0.18em" }}>
            STRETCHY HQ
          </span>
        </div>
        <Link href="/admin" style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: "rgba(245,237,227,0.5)", letterSpacing: "0.12em", textDecoration: "none" }}>
          ← BACK
        </Link>
      </nav>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 20px 60px" }}>
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

        {/* Test email button */}
        <div style={{ marginBottom: 24, padding: "16px 20px", borderRadius: 14, background: "rgba(245,237,227,0.06)", border: "1px solid rgba(245,237,227,0.10)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700, color: "rgba(245,237,227,0.4)", letterSpacing: "0.14em", marginBottom: 4 }}>EMAIL TESTING</p>
            <p style={{ fontSize: 13, color: "rgba(245,237,227,0.6)" }}>Send a test hold confirmation to kimberleytorrie@gmail.com</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {testEmailResult && <span style={{ fontSize: 12, color: testEmailResult.startsWith("✓") ? "#4CAF82" : "#E63946" }}>{testEmailResult}</span>}
            <button onClick={sendTestEmail} disabled={testEmailSending} style={{ padding: "10px 18px", borderRadius: 999, background: "rgba(245,237,227,0.15)", color: "#F5EDE3", border: "1px solid rgba(245,237,227,0.2)", cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em" }}>
              {testEmailSending ? "SENDING…" : "SEND TEST EMAIL"}
            </button>
          </div>
        </div>

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
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function SessionCard({
  session: s,
  onCancel,
  cancelling,
}: {
  session: Session;
  onCancel: (id: string, title: string) => void;
  cancelling: boolean;
}) {
  const typeColor = TYPE_COLORS[s.movement_type] || "#888";
  const stateInfo = STATE_COLORS[s.state] || STATE_COLORS.open;
  const startDate = new Date(s.starts_at);
  const STRETCHY_FEE = 23;
  const startingPrice = Math.round((s.host_target + STRETCHY_FEE) / s.min_attendees);
  const currentPrice  = s.current_holds >= s.min_attendees
    ? Math.round((s.host_target + STRETCHY_FEE) / s.current_holds)
    : startingPrice;

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
        <Stat label="PRICE NOW" value={`$${currentPrice}`} color={T.yellow} />
        <Stat label="HOST EARNS" value={`$${s.host_target}`} />
        <Stat label="MIN" value={`${s.min_attendees} needed`} color={isConfirmed ? T.green : needsMore > 0 ? "#FF6B35" : T.green} />

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
          {s.state === "open" && (
            <button
              onClick={() => onCancel(s.id, s.title)}
              disabled={cancelling}
              style={{
                padding: "7px 14px", borderRadius: 999, border: "none", cursor: "pointer",
                background: "rgba(230,57,70,0.15)", color: "#E63946",
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
      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: color || "#F5EDE3" }}>
        {value}
      </p>
    </div>
  );
}
