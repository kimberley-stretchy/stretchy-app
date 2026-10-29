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
  blue: "#0000FF",
  red: "#C6362E",
  mono: "'JetBrains Mono', monospace",
  body: "'Space Grotesk', system-ui, sans-serif",
  display: "'BN Chubb', 'Space Grotesk', sans-serif",
};

type Row = { id: string; title: string; startsAt: string; locationName: string; state: string; collected: number; cardFees: number; paidOut: number; perPerson: number | null; settled: boolean };
type Totals = { totalCollected: number; cardFees: number; owedOutstanding: number; paidSettled: number; net: number };

const money = (n: number) => `$${n.toFixed(2)}`;

export default function AdminMoneyPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/money")
      .then((r) => r.json())
      .then((d) => { setRows(d.sessions ?? []); setTotals(d.totals ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <HQShell>
      <main style={{ background: T.cream, minHeight: "100vh", color: T.ink, fontFamily: T.body }}>
        <div style={{ maxWidth: 820, padding: "32px 32px 60px" }}>
          <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, color: "rgba(20,17,15,.5)", letterSpacing: "0.12em", marginBottom: 6 }}>MONEY</p>
          <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(32px,8vw,44px)", letterSpacing: "-0.02em", lineHeight: 1, textTransform: "uppercase", margin: "0 0 22px" }}>
            The books.
          </h1>

          {/* Totals */}
          {totals && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 24 }}>
              <Tile label="TOTAL INCOMING" value={money(totals.totalCollected)} />
              <Tile label="CARD FEES (STRIPE)" value={money(totals.cardFees)} />
              <Tile label="OWED (UNSETTLED)" value={money(totals.owedOutstanding)} />
              <Tile label="PAID OUT (SETTLED)" value={money(totals.paidSettled)} />
              <Tile label="NET" value={money(totals.net)} fg={totals.net < 0 ? T.red : T.ink} />
            </div>
          )}

          <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, color: "rgba(20,17,15,.45)", letterSpacing: "0.12em", margin: "0 0 10px" }}>PER SESSION</p>

          {loading ? (
            <p style={{ fontFamily: T.mono, fontSize: 12, color: "rgba(20,17,15,.4)" }}>LOADING…</p>
          ) : rows.length === 0 ? (
            <div style={{ textAlign: "center", padding: 50, background: "#fff", borderRadius: 20, border: "2px dashed rgba(20,17,15,.25)" }}>
              <p style={{ fontSize: 30, marginBottom: 10 }}>💸</p>
              <p style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 800, color: "rgba(20,17,15,.4)", letterSpacing: "0.14em" }}>NO MONEY MOVED YET</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {rows.map((s) => (
                <Link key={s.id} href={`/admin/sessions/${s.id}/money`} style={{ textDecoration: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 14, background: "#fff", border: `2px solid ${T.ink}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 15, color: T.ink, margin: 0 }}>{s.title}</p>
                      <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, color: "rgba(20,17,15,.5)", letterSpacing: "0.08em", marginTop: 3 }}>
                        {new Date(s.startsAt).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "short", day: "numeric", month: "short" }).toUpperCase()} · {s.locationName}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontFamily: T.mono, fontSize: 10, color: "rgba(20,17,15,.45)", margin: 0 }}>{s.perPerson != null ? `${money(s.perPerson)} PP · ` : ""}IN {money(s.collected)} · FEES {money(s.cardFees)} · OUT {money(s.paidOut)}</p>
                    </div>
                    <span style={{
                      fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
                      padding: "5px 10px", borderRadius: 999, width: 70, textAlign: "center", flexShrink: 0,
                      border: `1.5px solid ${T.ink}`, color: T.ink,
                    }}>
                      {s.settled ? "SETTLED" : "OWED"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </HQShell>
  );
}

function Tile({ label, value, fg = T.ink }: { label: string; value: string; fg?: string }) {
  return (
    <div style={{ padding: "14px 16px", borderRadius: 14, background: "transparent", color: fg, border: `2px solid ${T.ink}` }}>
      <p style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", margin: "0 0 4px", opacity: 0.85 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>{value}</p>
    </div>
  );
}
