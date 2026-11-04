"use client";

import { useEffect, useMemo, useState } from "react";
import HQShell from "@/components/hq/HQShell";
import { RESEARCH_SECTIONS, RESEARCH_QUESTIONS, RETIRED_QUESTIONS, DIRECT_SOURCE, hasOtherBox, otherLabel } from "@/lib/socialResearch";

// HQ → stretchy.social research: answers to the stretchy.social/research
// survey. Tallies per question first (how many picked each answer), then the
// written answers, then each response in full, with a CSV download. General
// comments are feedback that came another way (email, DM, chat), added by hand
// and tagged with themes so trends can be counted as more come in.

const T = { ink: "#14110F", cream: "#F7F0E8", mono: "'JetBrains Mono', monospace", body: "'Space Grotesk', system-ui, sans-serif", display: "'BN Chubb', 'Space Grotesk', sans-serif" };
type Item = { id: string; created_at: string; name: string | null; organisation: string | null; email: string | null; website: string | null; source: string | null; answers: Record<string, string | string[]> };
const themesOf = (i: Item) => (Array.isArray(i.answers.themes) ? i.answers.themes : []);

const when = (iso: string) => new Date(iso).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const answerText = (i: Item, k: string) => {
  const v = i.answers[k];
  const other = i.answers[`${k}_other`];
  return [Array.isArray(v) ? v.join(", ") : v ?? "", other ? `“${other}”` : ""].filter(Boolean).join(" · ");
};

function csv(items: Item[]): string {
  const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["date", "name", "organisation", "email", "website", "source", ...RESEARCH_QUESTIONS.map((q) => `${q.n}. ${q.q}`), ...RETIRED_QUESTIONS.map((q) => q.q), "General comment", "Themes"];
  return [head.map(cell).join(","), ...items.map((i) => [when(i.created_at), i.name, i.organisation, i.email, i.website, i.source, ...RESEARCH_QUESTIONS.map((q) => answerText(i, q.k)), ...RETIRED_QUESTIONS.map((q) => answerText(i, q.k)), i.answers.general_comment, themesOf(i).join("; ")].map(cell).join(","))].join("\n");
}

const card: React.CSSProperties = { background: "#fff", border: `2px solid ${T.ink}`, borderRadius: 16, padding: 16 };
const field: React.CSSProperties = { padding: "9px 12px", borderRadius: 10, border: `2px solid ${T.ink}`, background: "#fff", color: T.ink, fontFamily: T.body, fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" };
const label: React.CSSProperties = { fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(20,17,15,.55)", textTransform: "uppercase" };

export default function AdminSocialResearchPage() {
  const [loading, setLoading] = useState(true);
  const [setupMsg, setSetupMsg] = useState<string | null>(null);
  const [view, setView] = useState<"tallies" | "responses" | "comments">("tallies");
  const [all, setAll] = useState<Item[]>([]);
  const [form, setForm] = useState({ name: "", organisation: "", channel: "", comment: "", themes: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/social-research").then((r) => r.json()).then((d) => { setAll(Array.isArray(d.items) ? d.items : []); if (d.setupNeeded) setSetupMsg(d.error); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const items = useMemo(() => all.filter((i) => i.source !== DIRECT_SOURCE), [all]);
  const comments = useMemo(() => all.filter((i) => i.source === DIRECT_SOURCE), [all]);
  const withContact = useMemo(() => items.filter((i) => i.email || i.name).length, [items]);
  // Themes across general comments, most mentioned first.
  const themeCounts = useMemo(() => {
    const m = new Map<string, { label: string; n: number }>();
    comments.forEach((c) => themesOf(c).forEach((t) => {
      const k = t.toLowerCase();
      m.set(k, { label: m.get(k)?.label ?? t, n: (m.get(k)?.n ?? 0) + 1 });
    }));
    return Array.from(m.values()).sort((a, b) => b.n - a.n);
  }, [comments]);

  async function addComment() {
    setSaving(true);
    setFormError(null);
    const res = await fetch("/api/admin/social-research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    setSaving(false);
    if (!res || !res.ok) return setFormError(d.error ?? "Couldn’t save that. Try again.");
    setAll((a) => [d.item, ...a]);
    setForm({ name: "", organisation: "", channel: "", comment: "", themes: "" });
  }

  async function removeComment(c: Item) {
    if (!confirm(`Delete this comment${c.name ? ` from ${c.name}` : ""}?`)) return;
    const res = await fetch(`/api/admin/social-research?id=${c.id}`, { method: "DELETE" }).catch(() => null);
    if (res && res.ok) setAll((a) => a.filter((x) => x.id !== c.id));
  }

  function download() {
    const blob = new Blob([csv(all)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "stretchy-social-research.csv";
    a.click();
  }

  return (
    <HQShell>
      <main style={{ background: T.cream, minHeight: "100vh", color: T.ink, fontFamily: T.body }}>
        <div style={{ maxWidth: 820, padding: "32px 32px 60px" }}>
          <p style={{ ...label, margin: "0 0 6px" }}>COMMUNITY</p>
          <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(32px,8vw,44px)", letterSpacing: "-0.02em", lineHeight: 1, textTransform: "uppercase", margin: "0 0 10px" }}>
            {loading ? "Loading…" : `${items.length} response${items.length === 1 ? "" : "s"}.`}
          </h1>
          <p style={{ fontSize: 14, color: "rgba(20,17,15,.65)", margin: "0 0 18px" }}>
            Answers to the survey at <a href="https://stretchy.social/research" target="_blank" rel="noopener" style={{ color: T.ink }}>stretchy.social/research ↗</a>. {withContact} left their details. You also get an email for each one.
          </p>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {(["tallies", "responses", "comments"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} style={{ padding: "8px 16px", borderRadius: 999, border: `2px solid ${T.ink}`, background: view === v ? T.ink : "transparent", color: view === v ? T.cream : T.ink, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {v === "tallies" ? "Tallies" : v === "responses" ? "Each response" : `General comments · ${comments.length}`}
              </button>
            ))}
            {all.length > 0 && (
              <button onClick={download} style={{ marginLeft: "auto", padding: "8px 16px", borderRadius: 999, border: `2px solid ${T.ink}`, background: "transparent", color: T.ink, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Download CSV</button>
            )}
          </div>

          {setupMsg && <p style={{ fontSize: 14, fontWeight: 700, color: "#C6362E" }}>{setupMsg}</p>}
          {!loading && items.length === 0 && !setupMsg && view !== "comments" && <p style={{ fontSize: 14, color: "rgba(20,17,15,.55)" }}>No responses yet.</p>}

          {items.length > 0 && view === "tallies" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {RESEARCH_SECTIONS.map((sec) => (
                <div key={sec.title} style={{ ...card, display: "flex", flexDirection: "column", gap: 16 }}>
                  <span style={label}>{sec.title}</span>
                  {sec.questions.map((q) => {
                    const answered = items.filter((i) => { const v = i.answers[q.k]; return Array.isArray(v) ? v.length > 0 : !!v; });
                    if (q.type === "text") {
                      return (
                        <div key={q.k}>
                          <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: 13.5 }}>{q.n}. {q.q} <span style={{ fontWeight: 400, color: "rgba(20,17,15,.5)" }}>· {answered.length} answered</span></p>
                          {answered.map((i) => <p key={i.id} style={{ margin: "0 0 6px", fontSize: 13, lineHeight: 1.45, paddingLeft: 10, borderLeft: `2px solid ${T.ink}` }}>{String(i.answers[q.k])}</p>)}
                        </div>
                      );
                    }
                    const opts = [...(q.options ?? []), ...(q.other ? [otherLabel(q)] : [])];
                    const count = (o: string) => answered.filter((i) => { const v = i.answers[q.k]; return Array.isArray(v) ? v.includes(o) : v === o; }).length;
                    const others = hasOtherBox(q) ? answered.map((i) => i.answers[`${q.k}_other`]).filter(Boolean) : [];
                    return (
                      <div key={q.k}>
                        <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 13.5 }}>{q.n}. {q.q} <span style={{ fontWeight: 400, color: "rgba(20,17,15,.5)" }}>· {answered.length} answered</span></p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {opts.map((o) => {
                            const n = count(o);
                            const pct = answered.length ? Math.round((n / answered.length) * 100) : 0;
                            return (
                              <div key={o} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 120px 44px", gap: 10, alignItems: "center", fontSize: 12.5, opacity: n ? 1 : 0.45 }}>
                                <span style={{ lineHeight: 1.3 }}>{o}</span>
                                <span style={{ height: 10, borderRadius: 999, border: `1.5px solid ${T.ink}`, overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${pct}%`, background: T.ink }} /></span>
                                <span style={{ fontFamily: T.mono, fontWeight: 800, textAlign: "right" }}>{n}</span>
                              </div>
                            );
                          })}
                        </div>
                        {others.length > 0 && <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "rgba(20,17,15,.7)" }}>{otherLabel(q)}: {others.map((o) => `“${o}”`).join(" · ")}</p>}
                      </div>
                    );
                  })}
                </div>
              ))}
              {RETIRED_QUESTIONS.map((q) => {
                const counts = new Map<string, number>();
                items.forEach((i) => { const v = i.answers[q.k]; if (typeof v === "string" && v) counts.set(v, (counts.get(v) ?? 0) + 1); });
                if (counts.size === 0) return null;
                return (
                  <div key={q.k} style={card}>
                    <span style={label}>No longer asked</span>
                    <p style={{ margin: "6px 0 6px", fontWeight: 700, fontSize: 13.5 }}>{q.q}</p>
                    {Array.from(counts.entries()).map(([a, n]) => <p key={a} style={{ margin: "2px 0", fontSize: 12.5 }}>{a}: <strong>{n}</strong></p>)}
                  </div>
                );
              })}
            </div>
          )}

          {view === "comments" && !setupMsg && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ ...card, display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={label}>Add a comment · from an email, DM or chat</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 8 }}>
                  <input placeholder="Who (optional)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={field} />
                  <input placeholder="Organisation (optional)" value={form.organisation} onChange={(e) => setForm({ ...form, organisation: e.target.value })} style={field} />
                  <input placeholder="How it came: email, DM, chat" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} style={field} />
                </div>
                <textarea rows={5} placeholder="What they said" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} style={{ ...field, resize: "vertical" }} />
                <input list="research-themes" placeholder="Themes, separated by commas, e.g. Uses studio booking systems, Keen to beta test" value={form.themes} onChange={(e) => setForm({ ...form, themes: e.target.value })} style={field} />
                <datalist id="research-themes">{themeCounts.map((t) => <option key={t.label} value={t.label} />)}</datalist>
                {formError && <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#C6362E" }}>{formError}</p>}
                <button onClick={addComment} disabled={saving || !form.comment.trim()} style={{ alignSelf: "flex-start", padding: "8px 16px", borderRadius: 999, border: `2px solid ${T.ink}`, background: "transparent", color: T.ink, fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: saving || !form.comment.trim() ? 0.4 : 1 }}>{saving ? "Saving…" : "Add comment"}</button>
              </div>
              {themeCounts.length > 0 && (
                <div style={{ ...card, display: "flex", flexDirection: "column", gap: 8 }}>
                  <span style={label}>Trends · themes across {comments.length} comment{comments.length === 1 ? "" : "s"}</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {themeCounts.map((t) => <span key={t.label} style={{ fontSize: 12.5, padding: "4px 10px", borderRadius: 999, border: `1.5px solid ${T.ink}` }}>{t.label} <strong>{t.n}</strong></span>)}
                  </div>
                </div>
              )}
              {comments.map((c) => (
                <div key={c.id} style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <strong>{[c.name, c.organisation].filter(Boolean).join(", ") || "Anonymous"}</strong>
                    <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "rgba(20,17,15,.55)" }}>{when(c.created_at).toUpperCase()}{c.answers.channel ? ` · ${String(c.answers.channel).toUpperCase()}` : ""}</span>
                  </div>
                  <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{String(c.answers.general_comment ?? "")}</p>
                  {themesOf(c).length > 0 && <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>{themesOf(c).map((t) => <span key={t} style={{ fontSize: 11.5, padding: "3px 9px", borderRadius: 999, border: `1.5px solid ${T.ink}` }}>{t}</span>)}</div>}
                  <button onClick={() => removeComment(c)} style={{ marginTop: 8, background: "none", border: "none", padding: 0, fontSize: 12, textDecoration: "underline", color: "rgba(20,17,15,.6)", cursor: "pointer" }}>Delete</button>
                </div>
              ))}
              {comments.length === 0 && !loading && <p style={{ fontSize: 14, color: "rgba(20,17,15,.55)", margin: 0 }}>No general comments yet.</p>}
            </div>
          )}

          {items.length > 0 && view === "responses" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {items.map((i) => (
                <div key={i.id} style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <strong>{[i.name, i.organisation].filter(Boolean).join(", ") || "Anonymous"}</strong>
                    <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "rgba(20,17,15,.55)" }}>{when(i.created_at).toUpperCase()}{i.source ? ` · VIA ${i.source.toUpperCase()}` : ""}</span>
                  </div>
                  {(i.email || i.website) && (
                    <p style={{ margin: "2px 0 0", fontSize: 13, wordBreak: "break-all" }}>
                      {i.email && <a href={`mailto:${i.email}`} style={{ color: T.ink }}>{i.email}</a>}{i.email && i.website ? " · " : ""}{i.website}
                    </p>
                  )}
                  {[...RESEARCH_QUESTIONS.map((q) => ({ k: q.k, q: `${q.n}. ${q.q}` })), ...RETIRED_QUESTIONS].map((q) => {
                    const t = answerText(i, q.k);
                    if (!t) return null;
                    return (
                      <p key={q.k} style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.45 }}>
                        <span style={label}>{q.q}</span><br />{t}
                      </p>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </HQShell>
  );
}
