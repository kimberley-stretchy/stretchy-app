"use client";

import { useEffect, useRef, useState } from "react";
import HQShell from "@/components/hq/HQShell";

const T = {
  ink: "#14110F", cream: "#F7F0E8", olive: "#716F39", red: "#C6362E",
  purple: "#902F8A", yellow: "#FCBB16",
  mono: "'JetBrains Mono', monospace", body: "'Space Grotesk', system-ui, sans-serif",
};

// Brand colour schemes (bg swatch + whether label text on the swatch is light).
const SCHEMES: { id: string; label: string; bg: string; light: boolean }[] = [
  { id: "cream", label: "Cream", bg: "#F7F0E8", light: false },
  { id: "blue", label: "Sky", bg: "#29ABE2", light: false },
  { id: "orange", label: "Orange", bg: "#E96709", light: false },
  { id: "olive", label: "Olive", bg: "#716F39", light: true },
  { id: "purple", label: "Purple", bg: "#902F8A", light: true },
  { id: "dkblue", label: "Blue", bg: "#0000FF", light: true },
];

type PickSession = { id: string; title: string; dateStr: string; going: number; min: number; confirmed?: boolean };

type Block =
  | { uid: number; type: "text"; text: string }
  | { uid: number; type: "image"; url: string; frame: "black" | "cream"; uploading?: boolean }
  | { uid: number; type: "divider" }
  | { uid: number; type: "sessions"; sessionIds: string[] };

let UID = 1;

const field: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "10px 14px", borderRadius: 10,
  background: "#fff", border: "1.5px solid rgba(20,17,15,.2)", color: T.ink,
  fontFamily: T.body, fontSize: 14, outline: "none",
};
const mono10: React.CSSProperties = { fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(20,17,15,.5)" };
const chip = (active: boolean): React.CSSProperties => ({
  padding: "6px 12px", borderRadius: 999, cursor: "pointer", border: `1.5px solid ${active ? T.ink : "rgba(20,17,15,.2)"}`,
  background: active ? T.ink : "#fff", color: active ? T.cream : T.ink, fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: ".08em",
});

export default function NewslettersPage() {
  const [sessions, setSessions] = useState<PickSession[]>([]);
  const [audienceReady, setAudienceReady] = useState(false);
  const [subject, setSubject] = useState("What's on at Stretchy 🌞");
  const [scheme, setScheme] = useState("cream");
  const [heading, setHeading] = useState("What's on at Stretchy 🌞");
  const [highlight, setHighlight] = useState(true);
  const [blocks, setBlocks] = useState<Block[]>([{ uid: UID++, type: "text", text: "" }]);
  const [preview, setPreview] = useState<string | null>(null);
  const [testEmail, setTestEmail] = useState("kimberley@stretchyyoga.co.nz");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const uploadingFor = useRef<number | null>(null);

  useEffect(() => {
    fetch("/api/admin/newsletters").then((r) => r.json()).then((d) => {
      setSessions(d.sessions ?? []); setAudienceReady(!!d.audienceReady);
    });
  }, []);

  const update = (uid: number, patch: Partial<Block>) =>
    setBlocks((bs) => bs.map((b) => (b.uid === uid ? ({ ...b, ...patch } as Block) : b)));
  const remove = (uid: number) => setBlocks((bs) => bs.filter((b) => b.uid !== uid));
  const move = (uid: number, dir: -1 | 1) =>
    setBlocks((bs) => {
      const i = bs.findIndex((b) => b.uid === uid);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= bs.length) return bs;
      const next = [...bs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const add = (type: Block["type"]) =>
    setBlocks((bs) => [
      ...bs,
      type === "text" ? { uid: UID++, type: "text", text: "" }
      : type === "image" ? { uid: UID++, type: "image", url: "", frame: "black" }
      : type === "divider" ? { uid: UID++, type: "divider" }
      : { uid: UID++, type: "sessions", sessionIds: [] },
    ]);

  function pickImageFor(uid: number) {
    uploadingFor.current = uid;
    fileInput.current?.click();
  }
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const uid = uploadingFor.current;
    e.target.value = "";
    if (!file || uid == null) return;
    update(uid, { uploading: true } as Partial<Block>);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/newsletters/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (res.ok) update(uid, { url: d.url, uploading: false } as Partial<Block>);
      else { update(uid, { uploading: false } as Partial<Block>); setMsg({ ok: false, text: d.error ?? "Upload failed." }); }
    } catch {
      update(uid, { uploading: false } as Partial<Block>);
      setMsg({ ok: false, text: "Upload failed." });
    }
  }

  const payload = (mode: string) => ({
    mode, subject, scheme, heading: heading || undefined, highlight,
    testEmail,
    blocks: blocks.map((b) =>
      b.type === "sessions" ? { type: "sessions", sessionIds: b.sessionIds }
      : b.type === "image" ? { type: "image", url: b.url, frame: b.frame }
      : b.type === "divider" ? { type: "divider" }
      : { type: "text", text: b.text }),
  });

  async function call(mode: "preview" | "test" | "send") {
    setBusy(mode); setMsg(null);
    try {
      const res = await fetch("/api/admin/newsletters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload(mode)) });
      const d = await res.json();
      if (!res.ok) setMsg({ ok: false, text: d.error ?? "Something went wrong." });
      else if (mode === "preview") setPreview(d.html);
      else if (mode === "test") setMsg({ ok: true, text: `Test sent to ${testEmail}` });
      else setMsg({ ok: true, text: `Newsletter sent${d.sentTo != null ? ` to ${d.sentTo} contacts` : ""} 🎉 — receipt in your inbox.` });
    } catch { setMsg({ ok: false, text: "Request failed." }); }
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
      <input ref={fileInput} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
      <main style={{ background: T.cream, minHeight: "100vh", color: T.ink, fontFamily: T.body }}>
        <div style={{ maxWidth: 1120, padding: "32px 32px 60px", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 24 }}>
          {/* Composer */}
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 4px" }}>Newsletters</h1>
            <p style={{ fontSize: 14, color: "rgba(20,17,15,.6)", margin: "0 0 16px" }}>
              Build it in blocks — text, imagery, dividers, live session cards — pick a brand colour, preview, test, send.
            </p>

            {!audienceReady && (
              <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: "rgba(198,54,46,.10)", border: `1.5px solid ${T.red}`, color: T.red, fontSize: 13 }}>
                No Audience connected yet — set <strong>RESEND_AUDIENCE_ID</strong> in Vercel and redeploy. Preview &amp; test still work.
              </div>
            )}

            <label style={mono10}>SUBJECT</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} style={{ ...field, margin: "4px 0 14px" }} />

            <label style={mono10}>BRAND COLOUR</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "6px 0 16px" }}>
              {SCHEMES.map((s) => (
                <button key={s.id} onClick={() => setScheme(s.id)} title={s.label}
                  style={{ width: 30, height: 30, borderRadius: "50%", cursor: "pointer", background: s.bg, border: scheme === s.id ? `3px solid ${T.ink}` : "2px solid rgba(20,17,15,.2)" }} />
              ))}
            </div>

            <label style={mono10}>HEADING</label>
            <input value={heading} onChange={(e) => setHeading(e.target.value)} style={{ ...field, margin: "4px 0 16px" }} />

            {/* Blocks */}
            <label style={mono10}>CONTENT</label>
            <div style={{ margin: "6px 0 10px", display: "flex", flexDirection: "column", gap: 10 }}>
              {blocks.map((b, i) => (
                <div key={b.uid} style={{ border: "1.5px solid rgba(20,17,15,.15)", borderRadius: 12, padding: 12, background: "#fff" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ ...mono10, color: T.purple }}>{b.type.toUpperCase()}</span>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => move(b.uid, -1)} disabled={i === 0} style={{ ...chip(false), padding: "3px 8px", opacity: i === 0 ? 0.4 : 1 }}>↑</button>
                      <button onClick={() => move(b.uid, 1)} disabled={i === blocks.length - 1} style={{ ...chip(false), padding: "3px 8px", opacity: i === blocks.length - 1 ? 0.4 : 1 }}>↓</button>
                      <button onClick={() => remove(b.uid)} style={{ ...chip(false), padding: "3px 8px", color: T.red, borderColor: T.red }}>✕</button>
                    </div>
                  </div>

                  {b.type === "text" && (
                    <textarea value={b.text} onChange={(e) => update(b.uid, { text: e.target.value } as Partial<Block>)} rows={3} placeholder="Write… (blank line = new paragraph)" style={{ ...field, resize: "vertical" }} />
                  )}

                  {b.type === "image" && (
                    <div>
                      {b.url ? (
                        <img src={b.url} alt="" style={{ width: "100%", borderRadius: 14, border: `3px solid ${b.frame === "cream" ? "#E1D5C6" : T.ink}`, display: "block", marginBottom: 8 }} />
                      ) : (
                        <div style={{ padding: 20, textAlign: "center", background: T.cream, borderRadius: 10, marginBottom: 8, fontSize: 13, color: "rgba(20,17,15,.5)" }}>
                          {b.uploading ? "Uploading…" : "No image yet"}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <button onClick={() => pickImageFor(b.uid)} style={chip(false)}>{b.url ? "REPLACE" : "UPLOAD IMAGE"}</button>
                        <span style={{ ...mono10 }}>FRAME</span>
                        <button onClick={() => update(b.uid, { frame: "black" } as Partial<Block>)} style={chip(b.frame === "black")}>BLACK</button>
                        <button onClick={() => update(b.uid, { frame: "cream" } as Partial<Block>)} style={chip(b.frame === "cream")}>CREAM</button>
                      </div>
                    </div>
                  )}

                  {b.type === "divider" && (
                    <div style={{ margin: "4px 0" }}><div style={{ height: 10, background: T.olive }} /><div style={{ height: 2, background: T.ink }} /><div style={{ height: 10, background: T.yellow }} /></div>
                  )}

                  {b.type === "sessions" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {sessions.length === 0 && <p style={{ fontSize: 13, color: "rgba(20,17,15,.5)" }}>No upcoming sessions.</p>}
                      {sessions.map((s) => {
                        const on = b.sessionIds.includes(s.id);
                        return (
                          <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer" }}>
                            <input type="checkbox" checked={on} onChange={() => update(b.uid, { sessionIds: on ? b.sessionIds.filter((x) => x !== s.id) : [...b.sessionIds, s.id] } as Partial<Block>)} style={{ accentColor: T.purple }} />
                            <span><strong>{s.title}</strong> <span style={{ color: "rgba(20,17,15,.5)" }}>· {s.dateStr} · {s.confirmed ? "going ahead" : `${s.going}/${s.min}`}</span></span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add block */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
              <button onClick={() => add("text")} style={chip(false)}>+ TEXT</button>
              <button onClick={() => add("image")} style={chip(false)}>+ IMAGE</button>
              <button onClick={() => add("divider")} style={chip(false)}>+ DIVIDER</button>
              <button onClick={() => add("sessions")} style={chip(false)}>+ SESSIONS</button>
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 18, cursor: "pointer" }}>
              <input type="checkbox" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} style={{ accentColor: T.purple }} />
              Include the &ldquo;Welcome to the highlight of your week&rdquo; panel at the bottom
            </label>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
              <button onClick={() => call("preview")} disabled={busy !== null} style={btn("transparent", T.ink)}>{busy === "preview" ? "…" : "PREVIEW"}</button>
              <input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} style={{ ...field, width: 210, flex: "0 0 auto" }} />
              <button onClick={() => call("test")} disabled={busy !== null} style={btn(T.yellow, T.ink)}>{busy === "test" ? "…" : "SEND TEST"}</button>
              <button onClick={sendReal} disabled={busy !== null || !audienceReady} style={{ ...btn(T.olive, "#fff"), opacity: audienceReady ? 1 : 0.5 }}>{busy === "send" ? "SENDING…" : "SEND TO AUDIENCE"}</button>
            </div>
            {msg && <p style={{ fontSize: 13, color: msg.ok ? T.olive : T.red }}>{msg.text}</p>}
          </div>

          {/* Preview */}
          <div>
            <label style={mono10}>PREVIEW</label>
            <div style={{ marginTop: 6, borderRadius: 14, overflow: "hidden", border: `2px solid ${T.ink}`, background: "#fff", minHeight: 400 }}>
              {preview ? (
                <iframe title="preview" srcDoc={preview} style={{ width: "100%", height: 720, border: "none" }} />
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
