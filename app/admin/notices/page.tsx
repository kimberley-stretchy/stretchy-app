"use client";

import { useEffect, useState } from "react";
import HQShell from "@/components/hq/HQShell";

// HQ → Team notices. A short message here shows on every teacher's and GEM's
// home screen and run sheets, until its "show until" date or until removed.

const T = {
  ink: "#14110F",
  cream: "#F7F0E8",
  yellow: "#FCBB16",
  purple: "#902F8A",
  mono: "'JetBrains Mono', monospace",
  body: "'Space Grotesk', system-ui, sans-serif",
  display: "'BN Chubb', 'Space Grotesk', sans-serif",
};

type Notice = { id: string; message: string; author_name: string | null; created_at: string; expires_at: string | null };
const day = (iso: string) => new Date(iso).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "short", day: "numeric", month: "short" });

export default function AdminNoticesPage() {
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showUntil, setShowUntil] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const d = await fetch("/api/admin/notices").then((r) => r.json()).catch(() => ({}));
    setItems(Array.isArray(d?.items) ? d.items : []);
    if (d?.setupNeeded) setError(d.error);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function post() {
    if (!message.trim()) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/notices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, showUntil: showUntil || null }),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) { setError(d.error ?? "Couldn’t post that. Please try again."); return; }
    setMessage("");
    setShowUntil("");
    load();
  }

  async function remove(id: string) {
    if (!confirm("Remove this notice? Teachers and GEMs will stop seeing it.")) return;
    await fetch(`/api/admin/notices?id=${id}`, { method: "DELETE" });
    load();
  }

  const now = Date.now();
  const field: React.CSSProperties = { width: "100%", padding: "12px 14px", borderRadius: 12, border: `2px solid ${T.ink}`, background: "#fff", color: T.ink, fontFamily: T.body, fontSize: 15, boxSizing: "border-box" };

  return (
    <HQShell>
      <main style={{ background: T.cream, minHeight: "100vh", color: T.ink, fontFamily: T.body }}>
        <div style={{ maxWidth: 640, padding: "32px 32px 60px" }}>
          <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: T.purple, margin: "0 0 6px" }}>COMMUNITY</p>
          <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(32px,8vw,44px)", letterSpacing: "-0.02em", lineHeight: 1, textTransform: "uppercase", margin: "0 0 10px" }}>Team notices</h1>
          <p style={{ fontSize: 14, color: "rgba(20,17,15,.65)", margin: "0 0 22px", lineHeight: 1.5 }}>
            A message for every teacher and GEM. It shows on their home screen and on their run sheets, so they see it on the day.
          </p>

          <div style={{ background: T.yellow, border: `2px solid ${T.ink}`, borderRadius: 18, padding: 16, display: "flex", flexDirection: "column", gap: 10, marginBottom: 26 }}>
            <label style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em" }}>NEW NOTICE</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} maxLength={600} placeholder="e.g. No Stretchy next week — back on Fri 6 Nov." style={{ ...field, resize: "vertical" }} />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Show until (optional)</label>
              <input type="date" value={showUntil} onChange={(e) => setShowUntil(e.target.value)} style={{ ...field, width: "auto", padding: "8px 12px" }} />
            </div>
            <p style={{ fontSize: 12, margin: 0, color: "rgba(20,17,15,.7)" }}>Leave the date empty and it stays up until you remove it.</p>
            {error && <p style={{ fontSize: 13, fontWeight: 700, color: "#C6362E", margin: 0 }}>{error}</p>}
            <button onClick={post} disabled={saving || !message.trim()} style={{ alignSelf: "flex-start", padding: "12px 22px", borderRadius: 999, background: T.ink, color: T.cream, border: "none", fontFamily: T.body, fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: saving || !message.trim() ? 0.5 : 1 }}>
              {saving ? "Posting…" : "Post to the team"}
            </button>
          </div>

          {loading ? (
            <p style={{ fontFamily: T.mono, fontSize: 12, color: "rgba(20,17,15,.4)" }}>LOADING…</p>
          ) : items.length === 0 ? (
            <p style={{ fontSize: 14, color: "rgba(20,17,15,.5)" }}>No notices yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {items.map((n) => {
                const ended = !!n.expires_at && new Date(n.expires_at).getTime() < now;
                return (
                  <div key={n.id} style={{ background: "#fff", border: `2px solid ${T.ink}`, borderRadius: 16, padding: 14, opacity: ended ? 0.55 : 1 }}>
                    <p style={{ fontSize: 15, fontWeight: 600, margin: "0 0 8px", lineHeight: 1.45, whiteSpace: "pre-wrap" }}>{n.message}</p>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", color: "rgba(20,17,15,.55)" }}>
                        POSTED {day(n.created_at).toUpperCase()} · {ended ? "NO LONGER SHOWING" : n.expires_at ? `SHOWING UNTIL ${day(n.expires_at).toUpperCase()}` : "SHOWING UNTIL REMOVED"}
                      </span>
                      <button onClick={() => remove(n.id)} style={{ padding: "6px 14px", borderRadius: 999, background: "transparent", border: `1.5px solid ${T.ink}`, fontFamily: T.body, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Remove</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </HQShell>
  );
}
