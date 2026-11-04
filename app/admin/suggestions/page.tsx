"use client";

import { useEffect, useMemo, useState } from "react";
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

type Suggestion = {
  id: string;
  session_type: string;
  preferred_neighbourhood: string | null;
  preferred_time: string | null;
  notes: string | null;
  vote_count: number;
  created_at: string;
  contacts?: { name: string | null; email: string; notify: boolean; kind?: string }[];
};

type Group = { key: string; title: string; count: number; firstAt: string };
type HeadsUpData = { groups: Group[]; sent: Record<string, string[]>; suggested: Record<string, string | null> };

const pill = (on = false): React.CSSProperties => ({ padding: "8px 16px", borderRadius: 999, border: `2px solid ${T.ink}`, background: on ? T.ink : "transparent", color: on ? T.cream : T.ink, fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", cursor: "pointer" });

// "It's on": pick which sessions answer this suggestion, check the email, tick
// who gets it, send. People already told about those sessions are unticked.
function HeadsUp({ s, data, onSent }: { s: Suggestion; data: HeadsUpData; onSent: (key: string, emails: string[]) => void }) {
  const wanting = useMemo(() => {
    const seen = new Set<string>();
    return (s.contacts ?? []).filter((c) => {
      const e = c.email.toLowerCase();
      if (!c.notify || seen.has(e)) return false;
      seen.add(e);
      return true;
    });
  }, [s.contacts]);
  const [key, setKey] = useState(data.suggested[s.id] ?? "");
  const told = useMemo(() => new Set(data.sent[key] ?? []), [data.sent, key]);
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    setTicked(new Set(wanting.map((c) => c.email.toLowerCase()).filter((e) => !told.has(e))));
  }, [wanting, told]);

  useEffect(() => {
    setPreview(null);
    setNote(null);
    if (!key) return;
    fetch("/api/admin/suggestions/heads-up", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "preview", groupKey: key }) })
      .then((r) => r.json()).then((d) => { if (d.html) setPreview({ subject: d.subject, html: d.html }); }).catch(() => {});
  }, [key]);

  async function test() {
    setBusy(true);
    const res = await fetch("/api/admin/suggestions/heads-up", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "test", groupKey: key }) }).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    setNote(res && res.ok ? `Test sent to ${d.to}.` : d.error ?? "Couldn’t send the test.");
  }
  async function send() {
    const title = data.groups.find((g) => g.key === key)?.title ?? "these sessions";
    if (!confirm(`Email ${ticked.size} ${ticked.size === 1 ? "person" : "people"} that ${title} is on? This can't be undone.`)) return;
    setBusy(true);
    const res = await fetch("/api/admin/suggestions/heads-up", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "send", suggestionId: s.id, groupKey: key, emails: Array.from(ticked) }) }).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res || !res.ok) return setNote(d.error ?? "Couldn’t send. Nothing has gone out.");
    onSent(key, d.sent ?? []);
    setNote(`Sent to ${(d.sent ?? []).length}.${d.failed?.length ? ` Didn’t go through: ${d.failed.join(", ")}.` : ""}`);
  }

  if (wanting.length === 0) return <p style={{ fontSize: 13, color: "rgba(20,17,15,.6)", margin: "8px 0 0" }}>Nobody on this one asked to hear if it goes ahead.</p>;
  return (
    <div style={{ marginTop: 10, paddingTop: 12, borderTop: `1.5px solid ${T.ink}`, display: "flex", flexDirection: "column", gap: 10 }}>
      <label style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", display: "flex", flexDirection: "column", gap: 6 }}>
        WHICH SESSIONS ARE ON?
        <select value={key} onChange={(e) => setKey(e.target.value)} style={{ padding: "9px 12px", borderRadius: 10, border: `2px solid ${T.ink}`, background: "#fff", color: T.ink, fontFamily: T.body, fontSize: 14 }}>
          <option value="">Pick the sessions…</option>
          {data.groups.map((g) => <option key={g.key} value={g.key}>{g.title} · {g.count} sessions</option>)}
        </select>
      </label>
      {key && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em" }}>WHO GETS IT</span>
            {wanting.map((c) => {
              const e = c.email.toLowerCase();
              const already = told.has(e);
              return (
                <label key={e} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, opacity: already ? 0.55 : 1 }}>
                  <input type="checkbox" disabled={already} checked={ticked.has(e)} onChange={() => setTicked((t) => { const n = new Set(t); if (n.has(e)) n.delete(e); else n.add(e); return n; })} style={{ accentColor: T.ink }} />
                  {c.email}{already ? " · already told" : ""}
                </label>
              );
            })}
          </div>
          {preview && (
            <div style={{ border: `2px solid ${T.ink}`, borderRadius: 12, overflow: "hidden" }}>
              <p style={{ margin: 0, padding: "8px 12px", fontSize: 13, fontWeight: 700, borderBottom: `1.5px solid ${T.ink}` }}>{preview.subject}</p>
              <iframe title="Email preview" srcDoc={preview.html} style={{ width: "100%", height: 460, border: 0, display: "block" }} />
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <button onClick={test} disabled={busy} style={pill()}>SEND ME A TEST</button>
            <button onClick={send} disabled={busy || ticked.size === 0} style={{ ...pill(true), opacity: busy || ticked.size === 0 ? 0.4 : 1 }}>{busy ? "SENDING…" : `SEND TO ${ticked.size}`}</button>
            {note && <span style={{ fontSize: 13, fontWeight: 600 }}>{note}</span>}
          </div>
        </>
      )}
    </div>
  );
}

export default function AdminSuggestionsPage() {
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [headsUp, setHeadsUp] = useState<HeadsUpData | null>(null);

  useEffect(() => {
    fetch("/api/admin/suggestions/heads-up").then((r) => r.json()).then((d) => { if (d.groups) setHeadsUp(d); }).catch(() => {});
  }, []);

  useEffect(() => {
    // HQ-only route: the public board data plus who suggested each one.
    fetch("/api/admin/suggestions")
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d?.items) ? d.items : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <HQShell>
      <main style={{ background: T.cream, minHeight: "100vh", color: T.ink, fontFamily: T.body }}>
        <div style={{ maxWidth: 760, padding: "32px 32px 60px" }}>
          <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, color: T.purple, letterSpacing: "0.12em", marginBottom: 6 }}>FUTURE SESSIONS</p>
          <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(32px,8vw,44px)", letterSpacing: "-0.02em", lineHeight: 1, textTransform: "uppercase", margin: "0 0 24px" }}>
            {loading ? "Loading…" : `${items.length} on the board.`}
          </h1>

          {!loading && items.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, background: "#fff", borderRadius: 20, border: "2px dashed rgba(20,17,15,.25)" }}>
              <p style={{ fontSize: 32, marginBottom: 12 }}>💡</p>
              <p style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 800, color: "rgba(20,17,15,.4)", letterSpacing: "0.16em" }}>NOTHING SUGGESTED YET</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {items.map((s) => (
              <div key={s.id} style={{ padding: "16px 20px", borderRadius: 14, background: "#fff", border: `2px solid ${T.ink}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", padding: "4px 10px", borderRadius: 999, background: T.yellow, color: T.ink }}>
                    {s.session_type.replace(/_/g, " ").toUpperCase()}
                  </span>
                  {s.preferred_neighbourhood && <span style={{ fontSize: 11, color: "rgba(20,17,15,.55)" }}>{s.preferred_neighbourhood}</span>}
                  {s.preferred_time && <span style={{ fontSize: 11, color: "rgba(20,17,15,.45)" }}>· {s.preferred_time}</span>}
                  <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 800, color: T.purple }}>{s.vote_count} {s.vote_count === 1 ? "vote" : "votes"}</span>
                  </span>
                </div>
                {s.notes && <p style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 8, color: T.ink }}>{s.notes}</p>}
                {(s.contacts ?? []).map((c) => (
                  <p key={c.email} style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 6, color: T.ink }}>
                    ✉️ {c.name ? `${c.name} · ` : ""}
                    <a href={`mailto:${c.email}`} style={{ color: T.purple, fontWeight: 700 }}>{c.email}</a>
                    {" — "}{c.kind === "me_too" ? "said me too" : "suggested it"}{c.notify ? ", wants to hear if it goes ahead" : ""}
                  </p>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <p style={{ fontFamily: T.mono, fontSize: 10, color: "rgba(20,17,15,.4)", margin: 0 }}>
                    {new Date(s.created_at).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short", year: "numeric" })}
                  </p>
                  {headsUp && <button onClick={() => setOpenId(openId === s.id ? null : s.id)} style={pill(openId === s.id)}>EMAIL HEADS-UP</button>}
                </div>
                {openId === s.id && headsUp && (
                  <HeadsUp s={s} data={headsUp} onSent={(key, emails) => setHeadsUp((h) => h && { ...h, sent: { ...h.sent, [key]: [...(h.sent[key] ?? []), ...emails.map((e) => e.toLowerCase())] } })} />
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </HQShell>
  );
}
