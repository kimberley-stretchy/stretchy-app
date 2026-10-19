"use client";

import { useEffect, useState } from "react";
import HQShell from "@/components/hq/HQShell";

// HQ → stretchy.social forms: waitlist sign-ups, enquiries and testing sign-ups
// from the white-label site, with a CSV download for each list.

const T = { ink: "#14110F", cream: "#F7F0E8", purple: "#902F8A", mono: "'JetBrains Mono', monospace", body: "'Space Grotesk', system-ui, sans-serif", display: "'BN Chubb', 'Space Grotesk', sans-serif" };
type Item = { id: string; type: string; name: string | null; email: string | null; fields: Record<string, unknown> | null; created_at: string };
const TABS = [
  { key: "platform_waitlist", label: "Waitlist" },
  { key: "platform_enquiry", label: "Enquiries" },
  { key: "platform_testing", label: "Testing" },
] as const;

const show = (v: unknown) => (Array.isArray(v) ? v.filter(Boolean).join(", ") : v === true ? "yes" : v === false ? "no" : String(v ?? ""));
const when = (iso: string) => new Date(iso).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function csv(items: Item[]): string {
  const keys = Array.from(new Set(items.flatMap((i) => Object.keys(i.fields ?? {}))));
  const cell = (v: unknown) => `"${show(v).replace(/"/g, '""')}"`;
  return [["date", "name", "email", ...keys].join(","), ...items.map((i) => [when(i.created_at), i.name, i.email, ...keys.map((k) => (i.fields ?? {})[k])].map(cell).join(","))].join("\n");
}

export default function AdminSocialPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("platform_waitlist");

  useEffect(() => {
    fetch("/api/admin/social").then((r) => r.json()).then((d) => setItems(Array.isArray(d.items) ? d.items : [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const shown = items.filter((i) => i.type === tab);
  function download() {
    const blob = new Blob([csv(shown)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `stretchy-social-${tab.replace("platform_", "")}.csv`;
    a.click();
  }

  return (
    <HQShell>
      <main style={{ background: T.cream, minHeight: "100vh", color: T.ink, fontFamily: T.body }}>
        <div style={{ maxWidth: 760, padding: "32px 32px 60px" }}>
          <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: T.purple, margin: "0 0 6px" }}>COMMUNITY</p>
          <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(32px,8vw,44px)", letterSpacing: "-0.02em", lineHeight: 1, textTransform: "uppercase", margin: "0 0 10px" }}>stretchy.social</h1>
          <p style={{ fontSize: 14, color: "rgba(20,17,15,.65)", margin: "0 0 18px" }}>Everyone who&rsquo;s signed up or got in touch through stretchy.social. You also get an email for each one.</p>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {TABS.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: "8px 16px", borderRadius: 999, border: `2px solid ${T.ink}`, background: tab === t.key ? T.ink : "#fff", color: tab === t.key ? T.cream : T.ink, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {t.label} <span style={{ opacity: 0.6 }}>{items.filter((i) => i.type === t.key).length}</span>
              </button>
            ))}
            {shown.length > 0 && (
              <button onClick={download} style={{ marginLeft: "auto", padding: "8px 16px", borderRadius: 999, border: `1.5px solid ${T.ink}`, background: "transparent", color: T.ink, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                Download CSV
              </button>
            )}
          </div>

          {loading ? (
            <p style={{ fontFamily: T.mono, fontSize: 12, color: "rgba(20,17,15,.4)" }}>LOADING…</p>
          ) : shown.length === 0 ? (
            <p style={{ fontSize: 14, color: "rgba(20,17,15,.5)" }}>Nobody yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {shown.map((i) => (
                <div key={i.id} style={{ background: "#fff", border: `2px solid ${T.ink}`, borderRadius: 16, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <strong>{i.name || "—"}</strong>
                    <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "rgba(20,17,15,.55)" }}>{when(i.created_at).toUpperCase()}</span>
                  </div>
                  {i.email && <a href={`mailto:${i.email}`} style={{ color: T.ink, fontSize: 13, wordBreak: "break-all" }}>{i.email}</a>}
                  {Object.entries(i.fields ?? {}).filter(([, v]) => show(v).trim()).map(([k, v]) => (
                    <p key={k} style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.45 }}>
                      <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", color: "rgba(20,17,15,.55)", textTransform: "uppercase" }}>{k.replace(/_/g, " ")}</span>
                      <br />{show(v)}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </HQShell>
  );
}
