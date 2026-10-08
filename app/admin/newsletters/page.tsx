"use client";

import { useEffect, useRef, useState } from "react";
import HQShell from "@/components/hq/HQShell";
import { applyFormat } from "@/lib/textFormat";

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
  | { uid: number; type: "divider"; line: "ink" | "cream" }
  | { uid: number; type: "button"; label: string; url: string }
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
  const [audienceName, setAudienceName] = useState<string | null>(null);
  const [subscribed, setSubscribed] = useState<number | null>(null);
  const [scheduled, setScheduled] = useState<{ id: string; name: string; scheduledAt: string }[]>([]);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("07:00");
  const [subject, setSubject] = useState("What's on at Stretchy 🌞");
  const [previewText, setPreviewText] = useState("");
  // The button above the sign-off — editable, or switched off.
  const [closingOn, setClosingOn] = useState(true);
  const [closingLabel, setClosingLabel] = useState("See everything that's on →");
  const [closingUrl, setClosingUrl] = useState("https://www.stretchyyoga.co.nz/sessions");
  const [scheme, setScheme] = useState("cream");
  const [heading, setHeading] = useState("What's on at Stretchy 🌞");
  const [highlight, setHighlight] = useState(true);
  const [blocks, setBlocks] = useState<Block[]>([{ uid: UID++, type: "text", text: "" }]);
  const [testEmail, setTestEmail] = useState("kimberley@stretchyyoga.co.nz");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const uploadingFor = useRef<number | null>(null);

  // ── Drafts ────────────────────────────────────────────────────────────
  type DraftMeta = { id: string; subject: string; updatedAt: string };
  const [drafts, setDrafts] = useState<DraftMeta[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [savedSnap, setSavedSnap] = useState<string | null>(null);

  // Everything the composer holds, as saved in a draft.
  const snapshot = () => ({
    subject, previewText, closingOn, closingLabel, closingUrl, scheme, heading, highlight,
    blocks: blocks.map((b) => (b.type === "image" ? { ...b, uploading: false } : b)),
  });
  const snapJson = JSON.stringify(snapshot());
  const unsaved = savedSnap !== null ? snapJson !== savedSnap : false;

  function loadDrafts() {
    fetch("/api/admin/newsletters/drafts").then((r) => r.json()).then((d) => setDrafts(Array.isArray(d.drafts) ? d.drafts : [])).catch(() => {});
  }
  useEffect(loadDrafts, []);

  // Browser warns before leaving/closing with unsaved draft changes.
  useEffect(() => {
    if (!unsaved) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  async function saveDraft() {
    setBusy("draft"); setMsg(null);
    try {
      const res = await fetch("/api/admin/newsletters/drafts", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: draftId ?? undefined, subject, data: snapshot() }),
      });
      const d = await res.json();
      if (!res.ok) setMsg({ ok: false, text: d.error ?? "Couldn't save the draft." });
      else { setDraftId(d.id); setSavedSnap(snapJson); setMsg({ ok: true, text: `Draft saved ${nzWhen(d.updatedAt)}.` }); loadDrafts(); }
    } catch { setMsg({ ok: false, text: "Couldn't save the draft." }); }
    setBusy(null);
  }

  async function openDraft(id: string) {
    if (unsaved && !confirm("You have unsaved changes. Open this draft anyway and lose them?")) return;
    setBusy("open"); setMsg(null);
    try {
      const res = await fetch(`/api/admin/newsletters/drafts?id=${encodeURIComponent(id)}`);
      const d = await res.json();
      if (!res.ok || !d.draft?.data) { setMsg({ ok: false, text: d.error ?? "Couldn't open that draft." }); setBusy(null); return; }
      const x = d.draft.data;
      setSubject(x.subject ?? ""); setPreviewText(x.previewText ?? "");
      setClosingOn(x.closingOn !== false); setClosingLabel(x.closingLabel ?? "See everything that's on →"); setClosingUrl(x.closingUrl ?? "https://www.stretchyyoga.co.nz/sessions");
      setScheme(x.scheme ?? "cream"); setHeading(x.heading ?? ""); setHighlight(x.highlight !== false);
      // Fresh uids so new blocks added after loading never clash.
      const loaded: Block[] = (Array.isArray(x.blocks) ? x.blocks : []).map((b: Block) => ({ ...b, uid: UID++ }));
      setBlocks(loaded.length ? loaded : [{ uid: UID++, type: "text", text: "" }]);
      setDraftId(id);
      setSavedSnap(JSON.stringify({ ...x, blocks: loaded.map((b) => (b.type === "image" ? { ...b, uploading: false } : b)) }));
      setMsg({ ok: true, text: `Opened "${d.draft.subject}". Session cards for sessions that have since passed are dropped automatically.` });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch { setMsg({ ok: false, text: "Couldn't open that draft." }); }
    setBusy(null);
  }

  async function deleteDraft(id: string, name: string) {
    if (!confirm(`Delete the draft "${name}"? This can't be undone.`)) return;
    await fetch(`/api/admin/newsletters/drafts?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => null);
    if (id === draftId) { setDraftId(null); setSavedSnap(null); }
    loadDrafts();
  }

  function newNewsletter() {
    if (unsaved && !confirm("You have unsaved changes. Start a new newsletter and lose them?")) return;
    setSubject("What's on at Stretchy 🌞"); setPreviewText("");
    setClosingOn(true); setClosingLabel("See everything that's on →"); setClosingUrl("https://www.stretchyyoga.co.nz/sessions");
    setScheme("cream"); setHeading("What's on at Stretchy 🌞"); setHighlight(true);
    setBlocks([{ uid: UID++, type: "text", text: "" }]);
    setDraftId(null); setSavedSnap(null); setMsg(null);
  }

  function loadStatus() {
    fetch("/api/admin/newsletters").then((r) => r.json()).then((d) => {
      setSessions(d.sessions ?? []); setAudienceReady(!!d.audienceReady); setAudienceName(d.audienceName ?? null); setSubscribed(typeof d.subscribed === "number" ? d.subscribed : null);
      setScheduled(Array.isArray(d.scheduled) ? d.scheduled : []);
    }).catch(() => {});
  }
  useEffect(loadStatus, []);

  const nzWhen = (iso: string) =>
    new Date(iso).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

  const update = (uid: number, patch: Partial<Block>) =>
    setBlocks((bs) => bs.map((b) => (b.uid === uid ? ({ ...b, ...patch } as Block) : b)));
  const remove = (uid: number) => setBlocks((bs) => bs.filter((b) => b.uid !== uid));

  // Text toolbar: "wrap" puts markers around the selection (bold/italic/
  // underline); "line" toggles a prefix on each selected line (## heading,
  // - bullet). Keeps the selection so styles can be stacked.
  function formatText(uid: number, mode: "wrap" | "line", marker: string) {
    const ta = document.querySelector<HTMLTextAreaElement>(`textarea[data-text-uid="${uid}"]`);
    const blk = blocks.find((x) => x.uid === uid);
    if (!ta || !blk || blk.type !== "text") return;
    const { text: next, selStart, selEnd } = applyFormat(blk.text, ta.selectionStart, ta.selectionEnd, mode, marker);
    update(uid, { text: next } as Partial<Block>);
    requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(selStart, selEnd); });
  }
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
      : type === "divider" ? { uid: UID++, type: "divider", line: "ink" }
      : type === "button" ? { uid: UID++, type: "button", label: "", url: "" }
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
    mode, subject, previewText: previewText || undefined,
    closingButton: closingOn ? { label: closingLabel, url: closingUrl } : null,
    scheme, heading: heading || undefined, highlight,
    testEmail,
    scheduleDate, scheduleTime,
    blocks: blocks.map((b) =>
      b.type === "sessions" ? { type: "sessions", sessionIds: b.sessionIds }
      : b.type === "image" ? { type: "image", url: b.url, frame: b.frame }
      : b.type === "divider" ? { type: "divider", line: b.line }
      : b.type === "button" ? { type: "button", label: b.label, url: b.url }
      : { type: "text", text: b.text }),
  });

  async function call(mode: "test" | "send" | "schedule") {
    setBusy(mode); setMsg(null);
    try {
      const res = await fetch("/api/admin/newsletters", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload(mode)) });
      const d = await res.json();
      if (!res.ok) setMsg({ ok: false, text: d.error ?? "Something went wrong." });
      else if (mode === "test") setMsg({ ok: true, text: `Test sent to ${testEmail} — check your inbox to preview it.` });
      else if (mode === "schedule") { setMsg({ ok: true, text: `Scheduled for ${nzWhen(d.scheduledAt)} (NZ time) 📅 — receipt in your inbox.` }); loadStatus(); }
      else setMsg({ ok: true, text: `Newsletter sent${d.sentTo != null ? ` to ${d.sentTo} contacts` : ""} 🎉 — receipt in your inbox.` });
    } catch { setMsg({ ok: false, text: "Request failed." }); }
    setBusy(null);
  }
  async function scheduleReal() {
    if (!scheduleDate || !scheduleTime) { setMsg({ ok: false, text: "Pick a date and time first." }); return; }
    const [y, m, d] = scheduleDate.split("-").map(Number);
    const label = `${new Date(y, m - 1, d).toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" })} at ${scheduleTime}`;
    const who = subscribed !== null ? `the ${audienceName ? `"${audienceName}" ` : ""}list (${subscribed} subscribers right now)` : "everyone opted in";
    if (!confirm(`Schedule this newsletter to go to ${who} on ${label} NZ time?\n\nWhat you see now is what sends — session prices and spots are as of now.`)) return;
    await call("schedule");
  }

  async function cancelScheduled(id: string, name: string) {
    if (!confirm(`Cancel the scheduled newsletter "${name}"? It won't be sent.`)) return;
    setBusy("cancel");
    const res = await fetch(`/api/admin/newsletters?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    setMsg(res && res.ok ? { ok: true, text: `Cancelled "${name}".` } : { ok: false, text: d.error ?? "Couldn't cancel it — check Resend → Broadcasts." });
    setBusy(null);
    loadStatus();
  }

  async function sendReal() {
    const who = subscribed !== null
      ? `${subscribed} subscriber${subscribed === 1 ? "" : "s"}${audienceName ? ` on the "${audienceName}" list` : ""}`
      : "everyone opted in";
    if (!confirm(`Send this newsletter to ${who}? This can't be undone.`)) return;
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
        <div style={{ maxWidth: 620, padding: "32px 32px 60px" }}>
          {/* Composer */}
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, margin: "0 0 4px" }}>Newsletters</h1>
            <p style={{ fontSize: 14, color: "rgba(20,17,15,.6)", margin: "0 0 16px" }}>
              Build it in blocks — text, imagery, dividers, live session cards — pick a brand colour, preview, test, send.
            </p>

            {/* Drafts bar */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
              <button onClick={saveDraft} disabled={busy !== null} style={btn(T.ink, T.cream)}>{busy === "draft" ? "SAVING…" : draftId ? "SAVE DRAFT" : "SAVE AS DRAFT"}</button>
              <button onClick={newNewsletter} disabled={busy !== null} style={{ ...btn("transparent", T.ink), border: `1.5px solid ${T.ink}` }}>+ NEW</button>
              <span style={{ fontSize: 12, color: unsaved ? T.red : "rgba(20,17,15,.5)" }}>
                {draftId ? (unsaved ? "Unsaved changes" : "All changes saved") : "Not saved yet"}
              </span>
            </div>

            {drafts.length > 0 && (
              <details style={{ marginBottom: 16 }} open={!draftId}>
                <summary style={{ ...mono10, cursor: "pointer" }}>DRAFTS · {drafts.length}</summary>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {drafts.map((d) => (
                    <div key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: d.id === draftId ? "rgba(144,47,138,.08)" : "#fff", border: `1.5px solid ${T.ink}`, borderRadius: 10, padding: "8px 12px" }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.subject}{d.id === draftId ? " · open" : ""}</p>
                        <p style={{ fontSize: 11, color: "rgba(20,17,15,.55)", margin: "2px 0 0" }}>Saved {nzWhen(d.updatedAt)}</p>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button onClick={() => openDraft(d.id)} disabled={busy !== null || d.id === draftId} style={{ ...chip(false), padding: "4px 10px", opacity: d.id === draftId ? 0.4 : 1 }}>OPEN</button>
                        <button onClick={() => deleteDraft(d.id, d.subject)} disabled={busy !== null} style={{ ...chip(false), padding: "4px 10px", color: T.red, borderColor: T.red }}>DELETE</button>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {!audienceReady && (
              <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 10, background: "rgba(198,54,46,.10)", border: `1.5px solid ${T.red}`, color: T.red, fontSize: 13 }}>
                No Audience connected yet — set <strong>RESEND_AUDIENCE_ID</strong> in Vercel and redeploy. Preview &amp; test still work.
              </div>
            )}

            <label style={mono10}>SUBJECT</label>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} style={{ ...field, margin: "4px 0 14px" }} />

            <label style={mono10}>PREVIEW TEXT</label>
            <input
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              placeholder="The line people see after the subject in their inbox"
              maxLength={150}
              style={{ ...field, margin: "4px 0 4px" }}
            />
            <p style={{ fontSize: 11, color: "rgba(20,17,15,.5)", margin: "0 0 14px" }}>
              {previewText.length}/150 · aim for 40–90 characters. Leave blank and inboxes show the start of the email instead.
            </p>

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
                    <div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                        {[
                          { k: "b", label: <strong>B</strong>, title: "Bold", run: () => formatText(b.uid, "wrap", "**") },
                          { k: "i", label: <em>I</em>, title: "Italic", run: () => formatText(b.uid, "wrap", "*") },
                          { k: "u", label: <u>U</u>, title: "Underline", run: () => formatText(b.uid, "wrap", "__") },
                          { k: "h", label: <strong>H</strong>, title: "Larger bold heading", run: () => formatText(b.uid, "line", "## ") },
                          { k: "l", label: <span>• List</span>, title: "Bullet points", run: () => formatText(b.uid, "line", "- ") },
                        ].map((t) => (
                          <button
                            key={t.k}
                            title={t.title}
                            // keep the textarea's selection while clicking
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={t.run}
                            style={{ ...chip(false), padding: "3px 10px", fontFamily: T.body, fontSize: 13, letterSpacing: 0 }}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                      <textarea
                        data-text-uid={b.uid}
                        value={b.text}
                        onChange={(e) => update(b.uid, { text: e.target.value } as Partial<Block>)}
                        rows={4}
                        placeholder="Write… (blank line = new paragraph)"
                        style={{ ...field, resize: "vertical" }}
                      />
                      <p style={{ fontSize: 11, color: "rgba(20,17,15,.5)", margin: "4px 0 0" }}>
                        Select text, then tap a style. Or type: **bold** · *italic* · __underline__ · ## Heading · - bullet
                      </p>
                    </div>
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
                    <div>
                      <div style={{ borderTop: `2px solid ${b.line === "cream" ? "#E1D5C6" : T.ink}`, margin: "6px 0 10px" }} />
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={mono10}>LINE</span>
                        <button onClick={() => update(b.uid, { line: "ink" } as Partial<Block>)} style={chip(b.line === "ink")}>BLACK</button>
                        <button onClick={() => update(b.uid, { line: "cream" } as Partial<Block>)} style={chip(b.line === "cream")}>CREAM</button>
                      </div>
                    </div>
                  )}

                  {b.type === "button" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <input value={b.label} onChange={(e) => update(b.uid, { label: e.target.value } as Partial<Block>)} placeholder="Button text, e.g. Hold your spot →" maxLength={60} style={field} />
                      <input value={b.url} onChange={(e) => update(b.uid, { url: e.target.value } as Partial<Block>)} placeholder="Link, e.g. stretchyyoga.co.nz/sessions or mailto:hello@…" style={field} />
                      {(!b.label.trim() || !b.url.trim()) && <p style={{ fontSize: 11, color: "rgba(20,17,15,.5)", margin: 0 }}>Needs both text and a link to show in the email.</p>}
                    </div>
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
              <button onClick={() => add("button")} style={chip(false)}>+ BUTTON</button>
              <button onClick={() => add("sessions")} style={chip(false)}>+ SESSIONS</button>
            </div>

            {/* Closing button (above "See you on the mat") */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", marginBottom: 6 }}>
                <input type="checkbox" checked={closingOn} onChange={(e) => setClosingOn(e.target.checked)} style={{ accentColor: T.purple }} />
                End with a button
              </label>
              {closingOn && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <input value={closingLabel} onChange={(e) => setClosingLabel(e.target.value)} placeholder="Button text" maxLength={60} style={{ ...field, flex: "1 1 200px" }} />
                  <input value={closingUrl} onChange={(e) => setClosingUrl(e.target.value)} placeholder="Link" style={{ ...field, flex: "1 1 240px" }} />
                </div>
              )}
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 18, cursor: "pointer" }}>
              <input type="checkbox" checked={highlight} onChange={(e) => setHighlight(e.target.checked)} style={{ accentColor: T.purple }} />
              Include the &ldquo;Welcome to the highlight of your week&rdquo; panel at the bottom
            </label>

            <p style={{ fontSize: 12, color: "rgba(20,17,15,.55)", margin: "0 0 8px" }}>Send yourself a test to preview it in a real inbox, then send to the Audience.</p>
            {audienceReady && (
              <p style={{ fontSize: 13, fontWeight: 700, margin: "0 0 8px" }}>
                {subscribed !== null
                  ? <>Sending to <strong>{subscribed} subscriber{subscribed === 1 ? "" : "s"}</strong>{audienceName ? <> on the &ldquo;{audienceName}&rdquo; list</> : null}. Unsubscribed people are skipped automatically.</>
                  : "Couldn't load the subscriber count right now — check Resend before sending."}
              </p>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
              <input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} style={{ ...field, width: 220, flex: "0 0 auto" }} />
              <button onClick={() => call("test")} disabled={busy !== null} style={btn(T.yellow, T.ink)}>{busy === "test" ? "…" : "SEND TEST"}</button>
              <button onClick={sendReal} disabled={busy !== null || !audienceReady} style={{ ...btn(T.olive, "#fff"), opacity: audienceReady ? 1 : 0.5 }}>{busy === "send" ? "SENDING…" : subscribed !== null ? `SEND TO ${subscribed}` : "SEND TO AUDIENCE"}</button>
            </div>
            {/* Schedule for later */}
            <label style={mono10}>OR SCHEDULE IT (NZ TIME · UP TO 30 DAYS AHEAD)</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", margin: "4px 0 12px" }}>
              <input type="date" value={scheduleDate} min={new Date().toLocaleDateString("en-CA", { timeZone: "Pacific/Auckland" })} max={new Date(Date.now() + 29 * 864e5).toLocaleDateString("en-CA", { timeZone: "Pacific/Auckland" })} onChange={(e) => setScheduleDate(e.target.value)} style={{ ...field, width: 170, flex: "0 0 auto" }} />
              <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} style={{ ...field, width: 120, flex: "0 0 auto" }} />
              <button onClick={scheduleReal} disabled={busy !== null || !audienceReady || !scheduleDate} style={{ ...btn(T.ink, T.cream), opacity: audienceReady && scheduleDate ? 1 : 0.5 }}>
                {busy === "schedule" ? "SCHEDULING…" : "SCHEDULE"}
              </button>
            </div>

            {msg && <p style={{ fontSize: 13, color: msg.ok ? T.olive : T.red }}>{msg.text}</p>}

            {scheduled.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <label style={mono10}>SCHEDULED</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                  {scheduled.map((b) => (
                    <div key={b.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "#fff", border: `2px solid ${T.ink}`, borderRadius: 12, padding: "10px 14px" }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name}</p>
                        <p style={{ fontSize: 12, color: "rgba(20,17,15,.6)", margin: "2px 0 0" }}>📅 {nzWhen(b.scheduledAt)} NZT</p>
                      </div>
                      <button onClick={() => cancelScheduled(b.id, b.name)} disabled={busy !== null} style={{ ...btn("transparent", T.red), border: `1.5px solid ${T.red}`, flexShrink: 0 }}>
                        CANCEL
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </HQShell>
  );
}
