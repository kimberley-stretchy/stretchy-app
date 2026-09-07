"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import HQShell from "@/components/hq/HQShell";
import PeopleSection, { type Person } from "@/components/hq/PeopleSection";

const T = {
  cream: "#F7F0E8",
  ink: "#14110F",
  mono: "'JetBrains Mono', monospace",
};

type Data = { teachers: Person[]; gems: Person[]; venues: Person[] };

function PendingContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") === "gems" ? "gems" : "teachers";

  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/people").then((r) => r.json()).then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }
  useEffect(load, []);

  async function decide(hostId: string, vettingStatus: "approved" | "declined") {
    setBusyId(hostId);
    await fetch("/api/admin/people", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostId, vettingStatus }),
    });
    setBusyId(null);
    load();
  }

  const people = data ? (tab === "gems" ? data.gems : data.teachers) : [];
  const pending = people.filter((p) => p.status === "AWAITING REVIEW");

  return (
    <HQShell>
      <main style={{ background: T.cream, minHeight: "100vh", padding: 32, display: "flex", justifyContent: "center" }}>
        <div style={{ maxWidth: 460, width: "100%", alignSelf: "flex-start" }}>
          <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "#902F8A", marginBottom: 6 }}>
            {tab === "gems" ? "GEMS" : "TEACHERS"}
          </p>
          <h1 style={{ fontFamily: "'BN Chubb', 'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 32, letterSpacing: "-0.02em", lineHeight: 1, textTransform: "uppercase", color: T.ink, marginBottom: 24 }}>
            Pending &amp; applied
          </h1>

          {loading || !data ? (
            <p style={{ fontFamily: T.mono, fontSize: 12, color: "rgba(20,17,15,.4)" }}>LOADING…</p>
          ) : (
            <PeopleSection
              title={tab === "gems" ? "GEMS" : "TEACHERS"}
              people={pending}
              applyHref={
                tab === "gems"
                  ? `/gem/apply?from=${encodeURIComponent("/admin/people?tab=gems")}`
                  : `/host/apply?from=${encodeURIComponent("/admin/people?tab=teachers")}`
              }
              applyLabel={tab === "gems" ? "Add a GEM" : "Add a teacher"}
              onDecide={decide}
              busyId={busyId}
            />
          )}
        </div>
      </main>
    </HQShell>
  );
}

export default function AdminPeoplePage() {
  return (
    <Suspense>
      <PendingContent />
    </Suspense>
  );
}
