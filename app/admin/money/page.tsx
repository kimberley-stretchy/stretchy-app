"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import HQShell from "@/components/hq/HQShell";

const T = {
  black: "#14110F",
  cream: "#F7F0E8",
  yellow: "#FCBB16",
  mono: "'JetBrains Mono', monospace",
  body: "'Space Grotesk', system-ui, sans-serif",
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
      <main style={{ background: T.black, minHeight: "100vh", color: T.cream, fontFamily: T.body }}>
        <div style={{ maxWidth: 760, padding: "32px 32px 60px" }}>
          <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "rgba(245,237,227,0.4)", letterSpacing: "0.2em", marginBottom: 6 }}>MONEY</p>
          <h1 style={{ fontSize: "clamp(36px,8vw,48px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 0.92, margin: "0 0 28px" }}>
            {loading ? "Loading…" : `${settleable.length} to settle.`}
          </h1>

          {!loading && settleable.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, background: "rgba(245,237,227,0.04)", borderRadius: 20, border: "1px dashed rgba(245,237,227,0.12)" }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>💸</p>
              <p style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: "rgba(245,237,227,0.4)", letterSpacing: "0.16em" }}>NOTHING TO SETTLE YET</p>
              <p style={{ fontSize: 14, color: "rgba(245,237,227,0.5)", marginTop: 8 }}>Locked or completed sessions will show up here.</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {settleable.map((s) => (
              <Link
                key={s.id}
                href={`/admin/sessions/${s.id}/money`}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "16px 20px", borderRadius: 16, textDecoration: "none",
                  background: "rgba(245,237,227,0.05)", border: "1px solid rgba(245,237,227,0.10)",
                }}
              >
                <div>
                  <p style={{ fontWeight: 700, fontSize: 15, color: T.cream, margin: 0 }}>{s.title}</p>
                  <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "rgba(245,237,227,0.45)", letterSpacing: "0.1em", marginTop: 3 }}>
                    {new Date(s.starts_at).toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" }).toUpperCase()} · {s.location_name}
                  </p>
                </div>
                <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: T.yellow, letterSpacing: "0.1em" }}>
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
