"use client";

import { useEffect, useState } from "react";
import HQShell from "@/components/hq/HQShell";

const T = {
  ink: "#14110F",
  cream: "#F7F0E8",
  olive: "#716F39",
  red: "#C6362E",
  purple: "#902F8A",
  yellow: "#FCBB16",
  mono: "'JetBrains Mono', monospace",
  body: "'Space Grotesk', system-ui, sans-serif",
};

type PickSession = {
  id: string; title: string; dateStr: string; venue: string | null;
  going: number; min: number; confirmed?: boolean; price?: string | null;
};

const field: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: 10,
  background: "#fff", border: "1.5px solid rgba(20,17,15,.2)", color: T.ink,
  fontFamily: T.body, fontSize: 14, outline: "none",
};
const mono10: React.CSSProperties = { fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(20,17,15,.5)" };

export default function NewslettersPage() {
  const [sessions, setSessions] = useState<PickSession[]>([]);
  const [audienceReady, setAudienceReady] = useState(false);
  const [subject, setSubject] = useState("What's on at Stretchy 🌞");
  const [heading, setHeading] = useState("");
  const [intro, setIntro] = useState("");
  const [outro, setOutro] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("kimberley@stretchyyoga.co.nz");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/newsletters")
      .then((r) => r.json())
      .then((d) => { setSessions(d.sessions ?? []); setAudienceReady(!!d.audienceReady); });
  }, []);

  const togglePick = (id: string) =>
    setPicked((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const payload = (mode: string) => ({
    mode, subject, heading: heading || undefined, intro: intro || undefined,
    outro: outro || undefined, sessionIds: sessions.filter((s) => picked.has(s.id)).map((s) => s.id),
    testEmail,
  });

  async function call(mode: "preview" | "test" | "send") {
    setBusy(mode); setMsg(null);
    try {
      const res = await fetch("/api/admin/newsletters", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload(mode)),
      });
      const d = await res.json();
      if (!res.ok) { setMsg({ ok: false, text: d.error ?? "Something went wrong." }); }
      else if (mode === "preview") { setPreview(d.html); }
      else if (mode === "test") { setMsg({ ok: true, text: `Test sent to ${testEmail}` }); }
      else { setMsg({ ok: true, text: "Newsletter sent to the Audience 🎉" }); }
    } catch {
      setMsg({ ok: false, text: "Request failed." });
    }
    setBusy(null);
  }

  async function sendReal() {
    if (!confirm("Send this newsletter to everyone opted in? This can't be undone.")) return;
    await call("send");
  }

  const btn = (bg: string, fg: string): React.CSSProperties => ({
    padding: "10px 18px", borderRadius: 999, border: "none", cursor: "pointer",
    background: bg, color: fg, fontFamily: T.mono, fontSize: 11, fontWeight: 800, letterSpacing: "0.1em",
  });

  return (
    <HQShell>
      <main style={{ background: T.cream, minHeight: "100vh", color: T.ink, fontFamily: T.body }}>
        <div style={{ maxWidth: 1080, padding: "32px 32px 60px", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 24 }}>
          {/* Composer */}
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 4px" }}>Newsletters</h1>
            <p style={{ fontSize: 14, color: "rgba(20,17,15,.6)", margin: "0 0 18px" }}>
              Write it, pick which sessions to feature (numbers fill in live), preview, test, then send to everyone opted in.
            </p>

            {!audienceReady && (
              <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: "rgba(198,54,46,.10)", border: `1.5px solid ${T.red}`, color: T.red, fontSize: 13 }}>
                No Audience connected yet — set <strong>RESEND_AUDIENCE_ID</strong> in Vercel and redeploy. You can still preview &amp; send tests.
              </div>
            )}

            <label style={mono10}>SUBJECT</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} style={{ ...field, margin: "4px 0 14px" }} />

            <label style={mono10}>HEADING (optional)</label>
            <input value={heading} onChange={(e) => setHeading(e.target.value)} placeholder="What's on at Stretchy 🌞" style={{ ...field, margin: "4px 0 14px" }} />

            <label style={mono10}>INTRO</label>
            <textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={4} placeholder="A few lines to open — blank line starts a new paragraph." style={{ ...field, margin: "4px 0 14px", resize: "vertical" }} />

            <label style={mono10}>FEATURE THESE SESSIONS</label>
            <div style={{ margin: "6px 0 14px", display: "flex", flexDirection: "column", gap: 6 }}>
              {sessions.length === 0 && <p style={{ fontSize: 13, color: "rgba(20,17,15,.5)" }}>No upcoming sessions to feature.</p>}
              {sessions.map((s) => (
                <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, background: "#fff", border: `1.5px solid ${picked.has(s.id) ? T.ink : "rgba(20,17,15,.15)"}`, cursor: "pointer" }}>
                  <input type="checkbox" checked={picked.has(s.id)} onChange={() => togglePick(s.id)} style={{ width: 16, height: 16, accentColor: T.purple }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{s.title}</span>
                    <span style={{ display: "block", fontSize: 11, color: "rgba(20,17,15,.55)" }}>{s.dateStr} · {s.confirmed ? "going ahead" : `${s.going}/${s.min}`}</span>
                  </span>
                </label>
              ))}
            </div>

            <label style={mono10}>OUTRO (optional)</label>
            <textarea value={outro} onChange={(e) => setOutro(e.target.value)} rows={2} placeholder="Anything to close with." style={{ ...field, margin: "4px 0 16px", resize: "vertical" }} />

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
              <button onClick={() => call("preview")} disabled={busy !== null} style={btn("transparent", T.ink)}>
                {busy === "preview" ? "…" : "PREVIEW"}
              </button>
              <input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} style={{ ...field, width: 220, flex: "0 0 auto" }} />
              <button onClick={() => call("test")} disabled={busy !== null} style={btn(T.yellow, T.ink)}>
                {busy === "test" ? "…" : "SEND TEST"}
              </button>
              <button onClick={sendReal} disabled={busy !== null || !audienceReady} style={{ ...btn(T.olive, "#fff"), opacity: audienceReady ? 1 : 0.5 }}>
                {busy === "send" ? "SENDING…" : "SEND TO AUDIENCE"}
              </button>
            </div>
            {msg && <p style={{ fontSize: 13, color: msg.ok ? T.olive : T.red }}>{msg.text}</p>}
          </div>

          {/* Preview */}
          <div>
            <label style={mono10}>PREVIEW</label>
            <div style={{ marginTop: 6, borderRadius: 14, overflow: "hidden", border: `2px solid ${T.ink}`, background: "#fff", minHeight: 400 }}>
              {preview ? (
                <iframe title="preview" srcDoc={preview} style={{ width: "100%", height: 640, border: "none" }} />
              ) : (
                <p style={{ padding: 20, fontSize: 13, color: "rgba(20,17,15,.45)" }}>Hit PREVIEW to see the branded newsletter here.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </HQShell>
  );
}
