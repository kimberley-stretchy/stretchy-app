"use client";

import { useEffect, useState } from "react";
import HQShell from "@/components/hq/HQShell";

const T = {
  ink: "#14110F",
  cream: "#F7F0E8",
  olive: "#716F39",
  red: "#C6362E",
  purple: "#902F8A",
  mono: "'JetBrains Mono', monospace",
  body: "'Space Grotesk', system-ui, sans-serif",
};

type Customer = {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
  marketingConsent: boolean;
  spotsHeld: number;
  hasAccount: boolean;
};
type Counts = { total: number; accounts: number; optedIn: number; newsletterOnly: number };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/customers")
      .then((r) => r.json())
      .then((d) => {
        setCustomers(d.customers ?? []);
        setCounts(d.counts ?? null);
        setConfigured(d.marketingConfigured ?? false);
      })
      .finally(() => setLoading(false));
  }, []);

  async function syncMarketing() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/admin/marketing/sync", { method: "POST" });
      const d = await res.json();
      setSyncResult(res.ok ? `✓ ${d.synced}/${d.total} synced · ${d.optedIn} opted in${d.failed ? ` · ${d.failed} failed` : ""}` : `Error: ${d.error}`);
    } catch {
      setSyncResult("Error: could not sync.");
    }
    setSyncing(false);
  }

  const filtered = customers.filter((c) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (c.name ?? "").toLowerCase().includes(s) || (c.email ?? "").toLowerCase().includes(s);
  });

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short", year: "numeric" });

  return (
    <HQShell>
      <main style={{ background: T.cream, minHeight: "100vh", color: T.ink, fontFamily: T.body }}>
        <div style={{ maxWidth: 900, padding: "32px 32px 60px" }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 4px" }}>Customers / Accounts</h1>
          <p style={{ fontSize: 14, color: "rgba(20,17,15,.6)", margin: "0 0 20px" }}>
            Everyone with a Stretchy account, plus newsletter-only signups. Marketing opt-in status shown; only opted-in people are in the newsletter Audience.
          </p>

          {/* Counts */}
          {counts && (
            <div style={{ display: "flex", gap: 22, flexWrap: "wrap", marginBottom: 18 }}>
              <Stat label="TOTAL" value={String(counts.total)} />
              <Stat label="ACCOUNTS" value={String(counts.accounts)} />
              <Stat label="OPTED IN" value={String(counts.optedIn)} color={T.olive} />
              <Stat label="NEWSLETTER-ONLY" value={String(counts.newsletterOnly)} />
            </div>
          )}

          {/* Marketing audience sync */}
          <div style={{ marginBottom: 22, padding: "16px 20px", borderRadius: 14, background: "#fff", border: `2px solid ${T.ink}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, color: "rgba(20,17,15,.45)", letterSpacing: "0.12em", marginBottom: 4 }}>MARKETING AUDIENCE (RESEND)</p>
              <p style={{ fontSize: 13, color: "rgba(20,17,15,.65)" }}>
                {configured
                  ? "Push everyone opted in to the Resend Audience. New opt-ins sync automatically; run this to reconcile."
                  : "Not connected yet — create an Audience in Resend and set RESEND_AUDIENCE_ID in Vercel, then redeploy."}
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {syncResult && <span style={{ fontSize: 12, color: syncResult.startsWith("✓") ? T.olive : T.red }}>{syncResult}</span>}
              <button onClick={syncMarketing} disabled={syncing} style={{ padding: "10px 18px", borderRadius: 999, border: `2px solid ${T.ink}`, background: "transparent", color: T.ink, cursor: "pointer", fontFamily: T.mono, fontSize: 11, fontWeight: 800, letterSpacing: "0.1em" }}>
                {syncing ? "SYNCING…" : "SYNC CONTACTS"}
              </button>
            </div>
          </div>

          {/* Search */}
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or email…"
            style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: 10, background: "#fff", border: "1.5px solid rgba(20,17,15,.2)", color: T.ink, fontFamily: T.body, fontSize: 14, outline: "none", marginBottom: 14 }}
          />

          {/* List */}
          {loading ? (
            <p style={{ fontFamily: T.mono, fontSize: 12, color: "rgba(20,17,15,.4)" }}>LOADING…</p>
          ) : filtered.length === 0 ? (
            <p style={{ fontSize: 14, color: "rgba(20,17,15,.5)" }}>No one to show.</p>
          ) : (
            <div style={{ background: "#fff", border: `2px solid ${T.ink}`, borderRadius: 14, overflow: "hidden" }}>
              {filtered.map((c, i) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderTop: i === 0 ? "none" : "1px solid rgba(20,17,15,.08)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: T.ink }}>
                      {c.name ?? "—"}
                      {!c.hasAccount && <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 800, color: T.purple, marginLeft: 8, letterSpacing: ".06em" }}>NEWSLETTER-ONLY</span>}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: 13, color: "rgba(20,17,15,.6)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}</p>
                  </div>
                  {c.spotsHeld > 0 && (
                    <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 800, color: "rgba(20,17,15,.55)" }} title="Spots ever held">{c.spotsHeld} spot{c.spotsHeld === 1 ? "" : "s"}</span>
                  )}
                  <span style={{ fontFamily: T.mono, fontSize: 10, color: "rgba(20,17,15,.4)", width: 92, textAlign: "right" }}>{fmtDate(c.createdAt)}</span>
                  <span style={{
                    fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: ".06em",
                    padding: "4px 9px", borderRadius: 999, width: 78, textAlign: "center", flexShrink: 0,
                    background: c.marketingConsent ? "rgba(113,111,57,.16)" : "rgba(20,17,15,.06)",
                    color: c.marketingConsent ? T.olive : "rgba(20,17,15,.45)",
                  }}>
                    {c.marketingConsent ? "OPTED IN" : "NO MKTG"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </HQShell>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(20,17,15,.4)", margin: "0 0 2px" }}>{label}</p>
      <p style={{ fontSize: 22, fontWeight: 900, margin: 0, color: color ?? T.ink }}>{value}</p>
    </div>
  );
}
