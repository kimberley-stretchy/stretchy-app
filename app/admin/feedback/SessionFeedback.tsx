"use client";

import { useEffect, useMemo, useState } from "react";
import { FEEDBACK_QUESTIONS, OTHER } from "@/lib/feedbackQuestions";

// HQ → Feedback → "After a session": what people answered on /rate/[session].
// Tallies per question (filterable by session), then each person's answers.

const INK = "#14110F";
const MONO = "'JetBrains Mono', monospace";
type Item = { id: string; updated_at: string; sessionId: string; session: { title?: string; starts_at?: string } | null; who: string; answers: Record<string, string | string[]> };

const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "short", day: "numeric", month: "short" }) : "");

export default function SessionFeedback() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetch("/api/admin/session-feedback").then((r) => r.json()).then((d) => { setItems(d.items ?? []); setSetupNeeded(!!d.setupNeeded); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const sessions = useMemo(() => {
    const m = new Map<string, string>();
    items.forEach((i) => m.set(i.sessionId, `${i.session?.title ?? "Session"} · ${day(i.session?.starts_at)}`));
    return Array.from(m.entries());
  }, [items]);
  const shown = filter === "all" ? items : items.filter((i) => i.sessionId === filter);

  if (loading) return <p style={{ fontFamily: MONO, fontSize: 12, color: "rgba(20,17,15,.4)" }}>LOADING…</p>;
  if (setupNeeded) return <p style={{ fontSize: 14, fontWeight: 700, color: "#C6362E" }}>The feedback table hasn&rsquo;t been set up yet.</p>;
  if (items.length === 0) return <p style={{ fontSize: 14, color: "rgba(20,17,15,.55)" }}>No answers yet. They&rsquo;ll appear here as people fill in the quick questions after a session.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ alignSelf: "flex-start", padding: "8px 12px", borderRadius: 10, border: `2px solid ${INK}`, background: "#fff", fontSize: 14 }}>
        <option value="all">All sessions · {items.length} answers</option>
        {sessions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>

      {/* Tallies */}
      <div style={{ background: "#fff", border: `2px solid ${INK}`, borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        {FEEDBACK_QUESTIONS.filter((q) => q.options.length > 0).map((q) => {
          const counts = new Map<string, number>();
          shown.forEach((i) => {
            const v = i.answers[q.k];
            (Array.isArray(v) ? v : v ? [v] : []).forEach((o) => counts.set(o, (counts.get(o) ?? 0) + 1));
          });
          const total = shown.filter((i) => i.answers[q.k] && (!Array.isArray(i.answers[q.k]) || (i.answers[q.k] as string[]).length)).length;
          return (
            <div key={q.k}>
              <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 13 }}>{q.q} <span style={{ fontWeight: 400, color: "rgba(20,17,15,.5)" }}>· {total} answered</span></p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {[...q.options, ...(q.other ? [OTHER] : [])].map((o) => (
                  <span key={o} style={{ fontSize: 12, padding: "4px 10px", borderRadius: 999, border: `1.5px solid ${INK}`, background: counts.get(o) ? "#FCBB16" : "transparent", opacity: counts.get(o) ? 1 : 0.45 }}>
                    {o} <strong>{counts.get(o) ?? 0}</strong>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Each person's answers */}
      {shown.map((i) => (
        <div key={i.id} style={{ background: "#fff", border: `2px solid ${INK}`, borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <strong style={{ fontSize: 14 }}>{i.who}</strong>
            <span style={{ fontFamily: MONO, fontSize: 10, color: "rgba(20,17,15,.5)" }}>{(i.session?.title ?? "").toUpperCase()} · {day(i.session?.starts_at).toUpperCase()}</span>
          </div>
          {FEEDBACK_QUESTIONS.map((q) => {
            const v = i.answers[q.k];
            const other = i.answers[`${q.k}_other`] as string | undefined;
            const more = i.answers[`${q.k}_more`] as string | undefined;
            const text = [Array.isArray(v) ? v.filter((x) => x !== OTHER).join(", ") : v && v !== OTHER ? v : "", other ? `“${other}”` : "", more ? `“${more}”` : ""].filter(Boolean).join(" · ");
            if (!text) return null;
            return (
              <p key={q.k} style={{ margin: 0, fontSize: 13, lineHeight: 1.45 }}>
                <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", color: "rgba(20,17,15,.55)", textTransform: "uppercase" }}>{q.q}</span><br />{text}
              </p>
            );
          })}
        </div>
      ))}
    </div>
  );
}
