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

type Row = { id: string; title: string; startsAt: string; locationName: string; state: string; collected: number; paidOut: number; settled: boolean };
type Totals = { totalCollected: number; owedOutstanding: number; paidSettled: number; net: number };

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
          <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, color: T.purple, letterSpacing: "0.12em", marginBottom: 6 }}>MONEY</p>
          <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(32px,8vw,44px)", letterSpacing: "-0.02em", lineHeight: 1, textTransform: "uppercase", margin: "0 0 22px" }}>
            The books.
          </h1>

          {/* Totals */}
          {totals && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 24 }}>
              <Tile label="TOTAL INCOMING" value={money(totals.totalCollected)} bg={T.olive} fg={T.cream} />
              <Tile label="OWED (UNSETTLED)" value={money(totals.owedOutstanding)} bg={T.yellow} fg={T.ink} />
              <Tile label="PAID OUT (SETTLED)" value={money(totals.paidSettled)} bg="#fff" fg={T.ink} border />
              <Tile label="NET" value={money(totals.net)} bg={totals.net < 0 ? "rgba(198,54,46,.12)" : "rgba(113,111,57,.14)"} fg={totals.net < 0 ? T.red : T.olive} border />
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
                      <p style={{ fontFamily: T.mono, fontSize: 10, color: "rgba(20,17,15,.45)", margin: 0 }}>IN {money(s.collected)} · OUT {money(s.paidOut)}</p>
                    </div>
                    <span style={{
                      fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
                      padding: "5px 10px", borderRadius: 999, width: 70, textAlign: "center", flexShrink: 0,
                      background: s.settled ? "rgba(113,111,57,.18)" : "rgba(252,187,22,.28)",
                      color: s.settled ? T.olive : T.ink,
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

function Tile({ label, value, bg, fg, border }: { label: string; value: string; bg: string; fg: string; border?: boolean }) {
  return (
    <div style={{ padding: "14px 16px", borderRadius: 14, background: bg, color: fg, border: border ? `2px solid ${T.ink}` : "none" }}>
      <p style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", margin: "0 0 4px", opacity: 0.85 }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>{value}</p>
    </div>
  );
}
