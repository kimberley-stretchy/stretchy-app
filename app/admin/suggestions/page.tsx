"use client";

import { useEffect, useState } from "react";
import HQShell from "@/components/hq/HQShell";

const T = {
  ink: "#14110F",
  cream: "#F7F0E8",
  yellow: "#FCBB16",
  purple: "#902F8A",
  mono: "'JetBrains Mono', monospace",
  body: "'Space Grotesk', system-ui, sans-serif",
  display: "'BN Chubb', 'Space Grotesk', sans-serif",
};

type Suggestion = {
  id: string;
  session_type: string;
  preferred_neighbourhood: string | null;
  preferred_time: string | null;
  notes: string | null;
  vote_count: number;
  created_at: string;
};

export default function AdminSuggestionsPage() {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Suggestions are anonymous by design (no host/attendee identity attached),
    // so this reuses the same public read the /suggest board itself uses.
    fetch("/api/suggestions")
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <HQShell>
      <main style={{ background: T.cream, minHeight: "100vh", color: T.ink, fontFamily: T.body }}>
        <div style={{ maxWidth: 760, padding: "32px 32px 60px" }}>
          <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, color: T.purple, letterSpacing: "0.12em", marginBottom: 6 }}>COMMUNITY</p>
          <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(32px,8vw,44px)", letterSpacing: "-0.02em", lineHeight: 1, textTransform: "uppercase", margin: "0 0 24px" }}>
            {loading ? "Loading…" : `${items.length} on the board.`}
          </h1>

          {!loading && items.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, background: "#fff", borderRadius: 20, border: "2px dashed rgba(20,17,15,.25)" }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>💡</p>
              <p style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 800, color: "rgba(20,17,15,.4)", letterSpacing: "0.16em" }}>NOTHING SUGGESTED YET</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((s) => (
              <div key={s.id} style={{ padding: "16px 20px", borderRadius: 14, background: "#fff", border: `2px solid ${T.ink}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", padding: "4px 10px", borderRadius: 999, background: T.yellow, color: T.ink }}>
                    {s.session_type.replace(/_/g, " ").toUpperCase()}
                  </span>
                  {s.preferred_neighbourhood && <span style={{ fontSize: 11, color: "rgba(20,17,15,.55)" }}>{s.preferred_neighbourhood}</span>}
                  {s.preferred_time && <span style={{ fontSize: 11, color: "rgba(20,17,15,.45)" }}>· {s.preferred_time}</span>}
                  <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 800, color: T.purple }}>{s.vote_count} {s.vote_count === 1 ? "vote" : "votes"}</span>
                  </span>
                </div>
                {s.notes && <p style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 8, color: T.ink }}>{s.notes}</p>}
                <p style={{ fontFamily: T.mono, fontSize: 10, color: "rgba(20,17,15,.4)" }}>
                  {new Date(s.created_at).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </HQShell>
  );
}
