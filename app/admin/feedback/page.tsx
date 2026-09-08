"use client";

import { useEffect, useState } from "react";
import HQShell from "@/components/hq/HQShell";

const T = {
  ink: "#14110F",
  cream: "#F7F0E8",
  yellow: "#FCBB16",
  purple: "#902F8A",
  mono: "'JetBrains Mono', monospace",
  body: "'Space Grotesk', system-ui, sans-serif",
  display: "'BN Chubb', 'Space Grotesk', sans-serif",
};

type Item = {
  id: string; area: string | null; category: string | null; message: string;
  session_context: string | null; image_urls: string[]; created_at: string; hostName: string;
};

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/feedback").then((r) => r.json()).then((d) => { setItems(d.items ?? []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  return (
    <HQShell>
      <main style={{ background: T.cream, minHeight: "100vh", color: T.ink, fontFamily: T.body }}>
        <div style={{ maxWidth: 760, padding: "32px 32px 60px" }}>
          <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, color: T.purple, letterSpacing: "0.12em", marginBottom: 6 }}>COMMUNITY</p>
          <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(32px,8vw,44px)", letterSpacing: "-0.02em", lineHeight: 1, textTransform: "uppercase", margin: "0 0 24px" }}>
            {loading ? "Loading…" : `${items.length} from your community.`}
          </h1>

          {!loading && items.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, background: "#fff", borderRadius: 20, border: "2px dashed rgba(20,17,15,.25)" }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>💬</p>
              <p style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 800, color: "rgba(20,17,15,.4)", letterSpacing: "0.16em" }}>NOTHING YET</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((it) => (
              <div key={it.id} style={{ padding: "16px 20px", borderRadius: 14, background: "#fff", border: `2px solid ${T.ink}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  {it.category && (
                    <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", padding: "4px 10px", borderRadius: 999, background: T.yellow, color: T.ink }}>
                      {it.category.toUpperCase()}
                    </span>
                  )}
                  {it.area && <span style={{ fontSize: 11, color: "rgba(20,17,15,.55)" }}>{it.area}</span>}
                  {it.session_context && <span style={{ fontSize: 11, color: "rgba(20,17,15,.45)" }}>· {it.session_context}</span>}
                  <span style={{ marginLeft: "auto", fontFamily: T.mono, fontSize: 10, color: "rgba(20,17,15,.4)" }}>
                    {new Date(it.created_at).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short" })}
                  </span>
                </div>
                <p style={{ fontSize: 14, lineHeight: 1.5, marginBottom: it.image_urls.length ? 10 : 0, color: T.ink }}>{it.message}</p>
                {it.image_urls.length > 0 && (
                  <div style={{ display: "flex", gap: 6 }}>
                    {it.image_urls.map((u, i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={u} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover" }} />
                    ))}
                  </div>
                )}
                <p style={{ fontFamily: T.mono, fontSize: 10, color: "rgba(20,17,15,.4)", marginTop: 8 }}>— {it.hostName}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </HQShell>
  );
}
