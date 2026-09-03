"use client";

import { useEffect, useState } from "react";
import HQShell from "@/components/hq/HQShell";

const T = { black: "#14110F", cream: "#F7F0E8", mono: "'JetBrains Mono', monospace", body: "'Space Grotesk', system-ui, sans-serif" };

type Signup = { email: string; created_at: string };

export default function AdminNewsletterPage() {
  const [signups, setSignups] = useState<Signup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/newsletter").then((r) => r.json()).then((d) => { setSignups(d.signups ?? []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  function copyAll() {
    navigator.clipboard.writeText(signups.map((s) => s.email).join(", "));
  }

  return (
    <HQShell>
      <main style={{ background: T.black, minHeight: "100vh", color: T.cream, fontFamily: T.body }}>
        <div style={{ maxWidth: 760, padding: "32px 32px 60px" }}>
          <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "rgba(245,237,227,0.4)", letterSpacing: "0.2em", marginBottom: 6 }}>COMMUNITY</p>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28 }}>
            <h1 style={{ fontSize: "clamp(36px,8vw,48px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 0.92, margin: 0 }}>
              {loading ? "Loading…" : `${signups.length} signed up.`}
            </h1>
            {signups.length > 0 && (
              <button
                onClick={copyAll}
                style={{ padding: "10px 18px", borderRadius: 999, background: "rgba(245,237,227,0.10)", color: T.cream, border: "1px solid rgba(245,237,227,0.2)", cursor: "pointer", fontFamily: T.mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em" }}
              >
                COPY ALL EMAILS
              </button>
            )}
          </div>

          {!loading && signups.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, background: "rgba(245,237,227,0.04)", borderRadius: 20, border: "1px dashed rgba(245,237,227,0.12)" }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>📬</p>
              <p style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, color: "rgba(245,237,227,0.4)", letterSpacing: "0.16em" }}>NOTHING YET</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {signups.map((s) => (
              <div key={s.email} style={{ display: "flex", justifyContent: "space-between", padding: "12px 18px", borderRadius: 12, background: "rgba(245,237,227,0.05)", border: "1px solid rgba(245,237,227,0.10)" }}>
                <span style={{ fontSize: 14 }}>{s.email}</span>
                <span style={{ fontFamily: T.mono, fontSize: 11, color: "rgba(245,237,227,0.4)" }}>
                  {new Date(s.created_at).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </HQShell>
  );
}
