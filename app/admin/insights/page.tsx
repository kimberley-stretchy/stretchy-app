"use client";

import { useEffect, useState } from "react";
import HQShell from "@/components/hq/HQShell";
import type { Insights } from "@/lib/insights";

// HQ → Insights: how many people come, who comes back, by month and location,
// and this year vs last. Built from every session that has run (lib/insights.ts).

const T = { ink: "#14110F", cream: "#F7F0E8", olive: "#716F39", mono: "'JetBrains Mono', monospace", display: "'BN Chubb', 'Space Grotesk', sans-serif" };
const card: React.CSSProperties = { background: "#fff", border: `2px solid ${T.ink}`, borderRadius: 16, overflow: "hidden" };
const head: React.CSSProperties = { padding: "8px 10px", fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(20,17,15,.55)", textAlign: "left", whiteSpace: "nowrap" };
const cell: React.CSSProperties = { padding: "8px 10px", borderTop: "1px solid rgba(20,17,15,.12)", fontFamily: T.mono, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" };
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–");

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: note ? 4 : 10 }}>
        <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: T.ink }}>{title}</span>
        <span style={{ flex: 1, height: 2, background: T.ink }} />
      </div>
      {note && <p style={{ margin: "0 0 10px", fontSize: 12.5, color: "rgba(20,17,15,.6)" }}>{note}</p>}
      {children}
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div style={{ border: `2px solid ${T.ink}`, borderRadius: 14, padding: "12px 14px", background: "#fff" }}>
      <div style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(20,17,15,.55)" }}>{label}</div>
      <div style={{ fontFamily: T.mono, fontSize: 26, fontWeight: 800, marginTop: 4 }}>{value}</div>
      {note && <div style={{ fontSize: 11.5, color: "rgba(20,17,15,.6)", marginTop: 2 }}>{note}</div>}
    </div>
  );
}

function Table({ cols, rows }: { cols: string[]; rows: (string | number)[][] }) {
  return (
    <div style={{ ...card, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr>{cols.map((c) => <th key={c} style={head}>{c}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} style={{ ...cell, ...(j === 0 ? { fontFamily: "inherit", fontSize: 13 } : {}) }}>{v}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export default function InsightsPage() {
  const [data, setData] = useState<Insights | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/insights").then(async (r) => {
      const d = await r.json();
      if (!r.ok) setErr(d.error ?? "Couldn't load insights."); else setData(d);
    }).catch(() => setErr("Couldn't load insights."));
  }, []);

  return (
    <HQShell>
      <div style={{ maxWidth: 980 }}>
        <h1 style={{ fontFamily: T.display, fontSize: 40, lineHeight: 0.95, margin: "0 0 6px", textTransform: "uppercase" }}>Insights</h1>
        <p style={{ margin: "0 0 22px", fontSize: 13.5, color: "rgba(20,17,15,.65)" }}>
          Every session that has run{data?.totals.firstSession ? ` since ${new Date(data.totals.firstSession).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "long", year: "numeric" })}` : ""}. Places include ones on us. A person is one account, so a booking for 3 is 3 places, 1 person. Cancelled, draft and test sessions are left out.
        </p>

        {err && <p style={{ color: "#C6362E" }}>{err}</p>}
        {!data && !err && <p style={{ color: "rgba(20,17,15,.55)" }}>Loading…</p>}

        {data && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 28 }}>
              <Stat label="SESSIONS RUN" value={String(data.totals.sessions)} />
              <Stat label="PLACES" value={String(data.totals.places)} note={`${data.totals.onUs} on us · ${data.totals.checkedIn} checked in`} />
              <Stat label="PEOPLE" value={String(data.totals.people)} note={`${data.retention.avgSessions} sessions each on average`} />
              <Stat label="REGULARS (3+)" value={String(data.retention.regulars)} note={pct(data.retention.regulars, data.retention.people) + " of people"} />
            </div>

            <Section title="COMING BACK" note="Of the people whose first Stretchy was long enough ago to tell, how many came again.">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                <Stat label="BACK WITHIN 4 WEEKS" value={pct(data.retention.back4w.came, data.retention.back4w.eligible)} note={`${data.retention.back4w.came} of ${data.retention.back4w.eligible} people (first Stretchy 4+ weeks ago)`} />
                <Stat label="BACK WITHIN 3 MONTHS" value={pct(data.retention.back3m.came, data.retention.back3m.eligible)} note={data.retention.back3m.eligible ? `${data.retention.back3m.came} of ${data.retention.back3m.eligible} people (first Stretchy 3+ months ago)` : "Shows once people's first Stretchy is 3+ months ago"} />
              </div>
            </Section>

            <Section title="BY MONTH" note="New = their first ever Stretchy that month. Returning = been before.">
              <Table
                cols={["MONTH", "SESSIONS", "PLACES", "PER SESSION", "PEOPLE", "NEW", "RETURNING", "CHECKED IN", "ON US"]}
                rows={data.months.map((m) => [m.label, m.sessions, m.places, m.sessions ? (Math.round((m.places / m.sessions) * 10) / 10).toString() : "–", m.people, m.newPeople, `${m.returning} (${pct(m.returning, m.people)})`, m.checkedIn, m.onUs])}
              />
            </Section>

            <Section title="BY LOCATION">
              <Table cols={["LOCATION", "SESSIONS", "PLACES", "PER SESSION", "PEOPLE"]} rows={data.locations.map((l) => [l.location, l.sessions, l.places, l.perSession, l.people])} />
            </Section>

            <Section title="YEAR ON YEAR" note={data.yearOnYear.years.length < 2 ? "Places per month. Last year's column appears once there's a second year to compare." : "Places per month, this year beside last year."}>
              <Table
                cols={["MONTH", ...data.yearOnYear.years.map(String)]}
                rows={data.yearOnYear.rows.map((r) => [r.month, ...data.yearOnYear.years.map((y) => r.places[y] || "–")])}
              />
            </Section>
          </>
        )}
      </div>
    </HQShell>
  );
}
