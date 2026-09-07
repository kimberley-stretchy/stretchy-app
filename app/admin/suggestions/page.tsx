"use client";

import { useEffect, useState } from "react";
import HQShell from "@/components/hq/HQShell";

const T = { black: "#14110F", cream: "#F7F0E8", yellow: "#FCBB16", purple: "#902F8A", mono: "'JetBrains Mono', monospace", body: "'Space Grotesk', system-ui, sans-serif" };

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
      <main style={{ background: T.black, minHeight: "100vh", color: T.cream, fontFamily: T.body }}>
        <div style={{ maxWidth: 760, padding: "32px 32px 60px" }}>
          <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "rgba(245,237,227,0.4)", letterSpacing: "0.2em", marginBottom: 6 }}>COMMUNITY</p>
          <h1 style={{ fontFamily: "'BN Chubb', sans-serif", fontSize: "clamp(36px,8vw,48px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 0.92, margin: "0 0 28px", textTransform: "uppercase" }}>
            {loading ? "Loading…" : `${items.length} on the board.`}
          </h1>

          {!loading && items.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, background: "rgba(245,237,227,0.04)", borderRadius: 20, border: "1px dashed rgba(245,237,227,0.12)" }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>💡</p>
              <p style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: "rgba(245,237,227,0.4)", letterSpacing: "0.16em" }}>NOTHING SUGGESTED YET</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((s) => (
              <div key={s.id} style={{ padding: "16px 20px", borderRadius: 16, background: "rgba(245,237,227,0.05)", border: "1px solid rgba(245,237,227,0.10)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", padding: "4px 10px", borderRadius: 999, background: T.yellow, color: T.black }}>
                    {s.session_type.replace(/_/g, " ").toUpperCase()}
                  </span>
                  {s.preferred_neighbourhood && <span style={{ fontSize: 11, color: "rgba(245,237,227,0.5)" }}>{s.preferred_neighbourhood}</span>}
                  {s.preferred_time && <span style={{ fontSize: 11, color: "rgba(245,237,227,0.4)" }}>· {s.preferred_time}</span>}
                  <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 800, color: T.purple }}>{s.vote_count} {s.vote_count === 1 ? "vote" : "votes"}</span>
                  </span>
                </div>
                {s.notes && <p style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 8 }}>{s.notes}</p>}
                <p style={{ fontFamily: T.mono, fontSize: 10, color: "rgba(245,237,227,0.35)" }}>
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
