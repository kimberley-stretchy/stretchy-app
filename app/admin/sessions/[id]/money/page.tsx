"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import HQShell from "@/components/hq/HQShell";

const T = {
  cream: "#F7F0E8",
  ink: "#14110F",
  purple: "#902F8A",
  yellow: "#FCBB16",
  blue: "#0000FF",
  olive: "#716F39",
  mono: "'JetBrains Mono', monospace",
};

type LineItem = { role: string; who: string; amount: number; email: string };
type MoneyData = {
  session: { id: string; title: string; startsAt: string; locationName: string; state: string; hostPaidAt: string | null };
  collected: number;
  paidOut: number;
  mats: number;
  lineItems: LineItem[];
};

export default function SessionMoneyPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<MoneyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState(false);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [emails, setEmails] = useState<Record<number, string>>({});
  const [copyHq, setCopyHq] = useState(true);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [remitMsg, setRemitMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/sessions/${params.id}/money`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  // Seed the editable email fields from what we could resolve (Teacher/GEM).
  useEffect(() => {
    if (data) setEmails(Object.fromEntries(data.lineItems.map((l, i) => [i, l.email ?? ""])));
  }, [data]);

  const toggleSel = (i: number) => setSel((prev) => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; });

  async function sendRemittance() {
    if (!data) return;
    const items = data.lineItems.map((l, i) => ({ role: l.role, name: l.who, email: emails[i] ?? "", amount: l.amount })).filter((_, i) => sel.has(i));
    if (items.length === 0) { setRemitMsg({ ok: false, text: "Tick who to send to first." }); return; }
    setSending(true); setRemitMsg(null);
    try {
      const res = await fetch(`/api/admin/sessions/${params.id}/money/remit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, copyHq, note: note || undefined }),
      });
      const d = await res.json();
      if (res.ok) {
        const fails = (d.results ?? []).filter((r: { ok: boolean }) => !r.ok);
        setRemitMsg({ ok: d.failed === 0, text: `Sent ${d.sent}${d.failed ? ` · ${d.failed} skipped/failed (${fails.map((f: { name: string }) => f.name).join(", ")})` : ""}` });
        if (d.failed === 0) setSel(new Set());
      } else setRemitMsg({ ok: false, text: d.error ?? "Send failed." });
    } catch { setRemitMsg({ ok: false, text: "Request failed." }); }
    setSending(false);
  }

  async function releasePayouts() {
    setReleasing(true);
    await fetch(`/api/admin/sessions/${params.id}/money`, { method: "POST" });
    await load();
    setReleasing(false);
  }

  function exportForXero() {
    if (!data) return;
    const rows = [
      ["Who", "Role", "Amount"],
      ...data.lineItems.map((l) => [l.who, l.role, l.amount.toFixed(2)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.session.title.replace(/\s+/g, "-").toLowerCase()}-money.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <HQShell>
      <main style={{ background: T.cream, minHeight: "100vh", padding: 32, display: "flex", justifyContent: "center" }}>
        {loading ? (
          <p style={{ fontFamily: T.mono, fontSize: 12, color: "rgba(20,17,15,.4)" }}>LOADING…</p>
        ) : !data ? (
          <p style={{ fontFamily: T.mono, fontSize: 12, color: "rgba(20,17,15,.4)" }}>NOT FOUND</p>
        ) : (
          <div style={{ background: T.cream, border: `2px solid ${T.ink}`, borderRadius: 20, padding: 24, maxWidth: 460, width: "100%", alignSelf: "flex-start" }}>
            <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: T.purple, marginBottom: 6 }}>
              MONEY · {new Date(data.session.startsAt).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "short", day: "numeric", month: "short" }).toUpperCase()}
              {data.session.hostPaidAt ? ", SETTLED" : ""}
            </p>
            <h1 style={{ fontFamily: "'BN Chubb', 'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 34, letterSpacing: "-0.02em", lineHeight: 1, textTransform: "uppercase", color: T.ink, marginBottom: 20 }}>
              {data.session.title}
            </h1>

            <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
              <StatBox label="COLLECTED" value={`$${data.collected.toFixed(2)}`} bg={T.olive} fg={T.cream} />
              <StatBox label="PAID OUT" value={`$${data.paidOut.toFixed(2)}`} bg={T.yellow} fg={T.ink} />
              <StatBox label="MATS" value={String(data.mats)} bg={T.blue} fg={T.cream} />
            </div>

            <div style={{ border: `2px solid ${T.ink}`, borderRadius: 12, overflow: "hidden", marginBottom: 24 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", padding: "8px 14px", background: T.ink }}>
                <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 800, color: "rgba(247,240,232,.6)", letterSpacing: "0.1em" }}>WHO</span>
                <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 800, color: "rgba(247,240,232,.6)", letterSpacing: "0.1em", marginRight: 24 }}>ROLE</span>
                <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 800, color: "rgba(247,240,232,.6)", letterSpacing: "0.1em" }}>AMOUNT</span>
              </div>
              {data.lineItems.length === 0 ? (
                <div style={{ padding: 16, fontSize: 13, color: "rgba(20,17,15,.5)" }}>No cost lines recorded for this session.</div>
              ) : (
                data.lineItems.map((l, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "10px 14px",
                      borderTop: i > 0 ? "1px solid rgba(20,17,15,.12)" : "none",
                      background: sel.has(i) ? "rgba(113,111,57,.08)" : "transparent",
                    }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto auto", alignItems: "center", gap: 12 }}>
                      <input type="checkbox" checked={sel.has(i)} onChange={() => toggleSel(i)} title="Tick to send a remittance" style={{ width: 16, height: 16, accentColor: T.olive }} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>{l.who}</span>
                      <span style={{ fontSize: 13, color: "rgba(20,17,15,.55)" }}>{l.role}</span>
                      <span style={{ fontFamily: T.mono, fontSize: 14, fontWeight: 700, color: T.ink }}>${l.amount.toFixed(2)}</span>
                    </div>
                    {sel.has(i) && (
                      <input
                        value={emails[i] ?? ""}
                        onChange={(e) => setEmails((m) => ({ ...m, [i]: e.target.value }))}
                        placeholder={`Email to send ${l.who}'s remittance`}
                        style={{ marginTop: 8, width: "100%", boxSizing: "border-box", padding: "7px 10px", borderRadius: 8, background: "#fff", border: "1.5px solid rgba(20,17,15,.2)", color: T.ink, fontSize: 13, outline: "none" }}
                      />
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Send remittances — tick who to notify above, then send. Nothing is
                sent automatically; this only emails the payees you selected. */}
            <div style={{ border: `2px solid ${T.ink}`, borderRadius: 12, padding: 14, marginBottom: 20 }}>
              <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(20,17,15,.5)", margin: "0 0 8px" }}>
                SEND REMITTANCE {sel.size > 0 ? `· ${sel.size} SELECTED` : ""}
              </p>
              <p style={{ fontSize: 12.5, color: "rgba(20,17,15,.6)", margin: "0 0 10px" }}>
                Tick a payee above and confirm their email, then send them a payout confirmation. You still pay by bank transfer — this is the receipt.
              </p>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note added to each remittance (e.g. paid via bank transfer today)"
                style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", borderRadius: 8, background: "#fff", border: "1.5px solid rgba(20,17,15,.2)", color: T.ink, fontSize: 13, outline: "none", marginBottom: 10 }}
              />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, cursor: "pointer" }}>
                  <input type="checkbox" checked={copyHq} onChange={(e) => setCopyHq(e.target.checked)} style={{ accentColor: T.olive }} />
                  Send HQ a copy
                </label>
                <button
                  onClick={sendRemittance}
                  disabled={sending || sel.size === 0}
                  style={{ padding: "9px 18px", borderRadius: 999, border: "none", cursor: sel.size === 0 ? "default" : "pointer", background: T.olive, color: "#fff", fontFamily: T.mono, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", opacity: sel.size === 0 ? 0.5 : 1 }}
                >
                  {sending ? "SENDING…" : "SEND REMITTANCE"}
                </button>
              </div>
              {remitMsg && <p style={{ fontSize: 12.5, margin: "10px 0 0", color: remitMsg.ok ? T.olive : "#C6362E" }}>{remitMsg.text}</p>}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={releasePayouts}
                disabled={releasing || !!data.session.hostPaidAt}
                style={{
                  flex: 1, height: 46, borderRadius: 999, border: "none", cursor: "pointer",
                  background: data.session.hostPaidAt ? "rgba(20,17,15,.15)" : T.ink,
                  color: data.session.hostPaidAt ? "rgba(20,17,15,.5)" : T.cream,
                  fontSize: 14, fontWeight: 700,
                }}
              >
                {data.session.hostPaidAt ? "Payouts released ✓" : releasing ? "Releasing…" : "Release payouts"}
              </button>
              <button
                onClick={exportForXero}
                style={{ flex: 1, height: 46, borderRadius: 999, border: `2px solid ${T.ink}`, background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 700, color: T.ink }}
              >
                Export for Xero
              </button>
            </div>
          </div>
        )}
      </main>
    </HQShell>
  );
}

function StatBox({ label, value, bg, fg }: { label: string; value: string; bg: string; fg: string }) {
  return (
    <div style={{ flex: 1, background: bg, color: fg, borderRadius: 12, padding: "10px 12px" }}>
      <p style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", opacity: 0.75, marginBottom: 4 }}>{label}</p>
      <p style={{ fontFamily: T.mono, fontSize: 20, fontWeight: 800 }}>{value}</p>
    </div>
  );
}
