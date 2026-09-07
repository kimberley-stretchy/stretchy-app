"use client";

import { useEffect, useState } from "react";
import HQShell from "@/components/hq/HQShell";
import PeopleSection, { type Person } from "@/components/hq/PeopleSection";

const T = {
  cream: "#F7F0E8",
  ink: "#14110F",
  mono: "'JetBrains Mono', monospace",
};

type Data = { teachers: Person[]; gems: Person[]; venues: Person[] };

export default function AdminVenuesPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/people").then((r) => r.json()).then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <HQShell>
      <main style={{ background: T.cream, minHeight: "100vh", padding: 32, display: "flex", justifyContent: "center" }}>
        <div style={{ maxWidth: 460, width: "100%", alignSelf: "flex-start" }}>
          <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "#902F8A", marginBottom: 6 }}>
            VENUES &amp; SOCIAL SPOTS
          </p>
          <h1 style={{ fontFamily: "'BN Chubb', 'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 32, letterSpacing: "-0.02em", lineHeight: 1, textTransform: "uppercase", color: T.ink, marginBottom: 24 }}>
            Venues
          </h1>

          {loading || !data ? (
            <p style={{ fontFamily: T.mono, fontSize: 12, color: "rgba(20,17,15,.4)" }}>LOADING…</p>
          ) : (
            <PeopleSection title="VENUES & SOCIAL SPOTS" people={data.venues} applyHref="/venue/offer" applyLabel="Add a venue" />
          )}
        </div>
      </main>
    </HQShell>
  );
}
