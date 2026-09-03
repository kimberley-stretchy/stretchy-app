"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import HQShell from "@/components/hq/HQShell";

const T = {
  cream: "#F7F0E8",
  ink: "#14110F",
  mono: "'JetBrains Mono', monospace",
};

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  FREE: { bg: "rgba(113,111,57,0.18)", fg: "#716F39" },
  PENDING: { bg: "rgba(252,187,22,0.35)", fg: "#14110F" },
  BOOKED: { bg: "rgba(20,17,15,0.10)", fg: "#14110F" },
  CONFIRMED: { bg: "rgba(41,171,226,0.18)", fg: "#0000FF" },
  NEW: { bg: "rgba(233,103,9,0.18)", fg: "#E96709" },
};

type Person = { id: string; name: string; meta: string; status: string; note?: string | null };
type Data = { teachers: Person[]; gems: Person[]; venues: Person[] };

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export default function AdminPeoplePage() {
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

  return (
    <HQShell>
      <main style={{ background: T.cream, minHeight: "100vh", padding: 32, display: "flex", justifyContent: "center" }}>
        <div style={{ maxWidth: 460, width: "100%", alignSelf: "flex-start" }}>
          <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "#902F8A", marginBottom: 6 }}>
            TEACHERS, GEMS &amp; VENUES
          </p>
          <h1 style={{ fontFamily: "'BN Chubb', 'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 32, letterSpacing: "-0.02em", lineHeight: 1, textTransform: "uppercase", color: T.ink, marginBottom: 24 }}>
            Who&rsquo;s available
          </h1>

          {loading || !data ? (
            <p style={{ fontFamily: T.mono, fontSize: 12, color: "rgba(20,17,15,.4)" }}>LOADING…</p>
          ) : (
            <>
              <PeopleSection title="TEACHERS" people={data.teachers} applyHref="/host/apply" applyLabel="Add a teacher" onDecide={decide} busyId={busyId} />
              <PeopleSection title="GEMS" people={data.gems} applyHref="/gem/apply" applyLabel="Add a GEM" onDecide={decide} busyId={busyId} />
              <PeopleSection title="VENUES & SOCIAL SPOTS" people={data.venues} applyHref="/venue/offer" applyLabel="Add a venue" />
            </>
          )}
        </div>
      </main>
    </HQShell>
  );
}

function PeopleSection({ title, people, applyHref, applyLabel, onDecide, busyId }: {
  title: string; people: Person[]; applyHref: string; applyLabel: string;
  onDecide?: (hostId: string, status: "approved" | "declined") => void; busyId?: string | null;
}) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: T.ink }}>
          {title} · {people.length}
        </span>
        <span style={{ flex: 1, height: 1, background: "rgba(20,17,15,.15)" }} />
      </div>

      {people.length === 0 ? (
        <div style={{ border: "2px dashed rgba(20,17,15,.2)", borderRadius: 14, padding: 16, fontSize: 13, color: "rgba(20,17,15,.5)", marginBottom: 10 }}>
          Nobody yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
          {people.map((p) => {
            const c = STATUS_COLORS[p.status] ?? STATUS_COLORS.PENDING;
            const isPending = p.status === "PENDING" && !!onDecide;
            const busy = busyId === p.id;
            return (
              <div key={p.id} style={{ display: "flex", flexDirection: "column", gap: 10, background: "#fff", border: `2px solid ${T.ink}`, borderRadius: 14, padding: "10px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#EFDEDB", color: T.ink, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                    {initials(p.name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: T.ink, margin: 0 }}>{p.name}</p>
                    {p.meta && <p style={{ fontSize: 12, color: "rgba(20,17,15,.55)", margin: "1px 0 0" }}>{p.meta}</p>}
                  </div>
                  <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", padding: "4px 9px", borderRadius: 999, background: c.bg, color: c.fg, flexShrink: 0 }}>
                    {p.status}
                  </span>
                </div>
                {isPending && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => onDecide!(p.id, "approved")}
                      disabled={busy}
                      style={{ flex: 1, height: 34, borderRadius: 999, border: "none", cursor: "pointer", background: "#716F39", color: "#F7F0E8", fontSize: 12, fontWeight: 700, opacity: busy ? 0.6 : 1 }}
                    >
                      {busy ? "…" : "Approve"}
                    </button>
                    <button
                      onClick={() => onDecide!(p.id, "declined")}
                      disabled={busy}
                      style={{ flex: 1, height: 34, borderRadius: 999, border: `1.5px solid ${T.ink}`, cursor: "pointer", background: "transparent", color: T.ink, fontSize: 12, fontWeight: 700, opacity: busy ? 0.6 : 1 }}
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Link
        href={applyHref}
        style={{ display: "inline-block", fontSize: 13, fontWeight: 700, color: T.ink, textDecoration: "none", border: `2px solid ${T.ink}`, borderRadius: 999, padding: "8px 16px" }}
      >
        + {applyLabel}
      </Link>
    </div>
  );
}
