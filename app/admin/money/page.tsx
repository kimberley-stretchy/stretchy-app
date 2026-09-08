"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import HQShell from "@/components/hq/HQShell";

const T = {
  ink: "#14110F",
  cream: "#F7F0E8",
  yellow: "#FCBB16",
  purple: "#902F8A",
  olive: "#716F39",
  mono: "'JetBrains Mono', monospace",
  body: "'Space Grotesk', system-ui, sans-serif",
  display: "'BN Chubb', 'Space Grotesk', sans-serif",
};

type Session = { id: string; title: string; starts_at: string; location_name: string; state: string; host_paid_at?: string | null };

export default function AdminMoneyPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/sessions")
      .then((r) => r.json())
      .then((data) => { setSessions(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const settleable = sessions.filter((s) => s.state === "locked" || s.state === "completed");

  return (
    <HQShell>
      <main style={{ background: T.cream, minHeight: "100vh", color: T.ink, fontFamily: T.body }}>
        <div style={{ maxWidth: 760, padding: "32px 32px 60px" }}>
          <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, color: T.purple, letterSpacing: "0.12em", marginBottom: 6 }}>MONEY</p>
          <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(32px,8vw,44px)", letterSpacing: "-0.02em", lineHeight: 1, textTransform: "uppercase", margin: "0 0 24px" }}>
            {loading ? "Loading…" : `${settleable.length} to settle.`}
          </h1>

          {!loading && settleable.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, background: "#fff", borderRadius: 20, border: "2px dashed rgba(20,17,15,.25)" }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>💸</p>
              <p style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 800, color: "rgba(20,17,15,.4)", letterSpacing: "0.16em" }}>NOTHING TO SETTLE YET</p>
              <p style={{ fontSize: 14, color: "rgba(20,17,15,.5)", marginTop: 8 }}>Locked or completed sessions will show up here.</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {settleable.map((s) => (
              <Link
                key={s.id}
                href={`/admin/sessions/${s.id}/money`}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "16px 20px", borderRadius: 14, textDecoration: "none",
                  background: "#fff", border: `2px solid ${T.ink}`,
                }}
              >
                <div>
                  <p style={{ fontWeight: 700, fontSize: 15, color: T.ink, margin: 0 }}>{s.title}</p>
                  <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, color: "rgba(20,17,15,.5)", letterSpacing: "0.08em", marginTop: 3 }}>
                    {new Date(s.starts_at).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "short", day: "numeric", month: "short" }).toUpperCase()} · {s.location_name}
                  </p>
                </div>
                <span style={{
                  fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em",
                  padding: "5px 10px", borderRadius: 999,
                  background: s.host_paid_at ? "rgba(113,111,57,.18)" : "rgba(252,187,22,.28)",
                  color: s.host_paid_at ? T.olive : T.ink,
                }}>
                  {s.host_paid_at ? "SETTLED" : "VIEW →"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </HQShell>
  );
}
