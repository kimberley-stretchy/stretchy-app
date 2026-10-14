"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// "Moving with care" — on someone's booking page. An optional note about an
// injury, pregnancy, surgery or anything else, for their teacher and GEM.
// Hides itself if the note can't be loaded.
export default function CareNoteCard() {
  const [token, setToken] = useState<string | null>(null);
  const [available, setAvailable] = useState(false);
  const [saved, setSaved] = useState("");
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    createClient().auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      setToken(session.access_token);
      const d = await fetch("/api/attendees/care", { headers: { Authorization: `Bearer ${session.access_token}` } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (d?.available) { setAvailable(true); setSaved(d.note ?? ""); setNote(d.note ?? ""); }
    });
  }, []);

  async function save() {
    if (!token) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/attendees/care", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ note }),
    });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg(d.error ?? "Couldn’t save your note. Please try again."); return; }
    setSaved(d.note ?? "");
    setNote(d.note ?? "");
    setEditing(false);
    setMsg(d.note ? "Saved. Your teacher and GEM will see it." : "Note removed.");
    setTimeout(() => setMsg(null), 4000);
  }

  if (!available) return null;
  const INK = "#14110F";

  return (
    <div className="border-2 rounded-[22px] p-4 flex flex-col gap-2.5" style={{ borderColor: INK, background: "#FFFFFF" }}>
      <p className="m-0 font-mono text-[10px] font-extrabold tracking-[0.1em]">MOVING WITH CARE</p>
      {!editing ? (
        <>
          {saved ? (
            <p className="m-0 text-sm font-semibold whitespace-pre-wrap">{saved}</p>
          ) : (
            <p className="m-0 text-sm" style={{ color: "rgba(20,17,15,.7)" }}>
              Anything your teacher should know? An injury, pregnancy, surgery, or something you&rsquo;re easing back from.
            </p>
          )}
          <button type="button" onClick={() => setEditing(true)} className="self-start rounded-pill px-4 py-2 font-bold text-sm border-2" style={{ borderColor: INK }}>
            {saved ? "Change my note" : "Add a note"}
          </button>
        </>
      ) : (
        <>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="e.g. Recovering from a wrist injury, so I’ll skip weight on my hands."
            className="w-full rounded-xl border-2 px-3 py-2 bg-white"
            style={{ borderColor: INK, fontSize: 16 }}
          />
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={busy} className="rounded-pill px-5 py-2.5 font-bold text-sm disabled:opacity-60" style={{ background: INK, color: "#F7F0E8" }}>
              {busy ? "Saving…" : "Save my note"}
            </button>
            <button type="button" onClick={() => { setNote(saved); setEditing(false); }} disabled={busy} className="rounded-pill px-4 py-2.5 font-bold text-sm border-2" style={{ borderColor: INK }}>
              Cancel
            </button>
          </div>
        </>
      )}
      {msg && <p className="m-0 text-sm font-bold">{msg}</p>}
      <p className="m-0 text-xs" style={{ color: "rgba(20,17,15,.55)" }}>
        Optional. Only your teacher, your GEM and Stretchy HQ see it.{" "}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline">Privacy ↗</a>
      </p>
    </div>
  );
}
