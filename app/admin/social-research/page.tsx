"use client";

import { useEffect, useMemo, useState } from "react";
import HQShell from "@/components/hq/HQShell";
import { RESEARCH_SECTIONS, RESEARCH_QUESTIONS, hasOtherBox, otherLabel } from "@/lib/socialResearch";

// HQ → stretchy.social research: answers to the stretchy.social/research
// survey. Tallies per question first (how many picked each answer), then the
// written answers, then each response in full, with a CSV download.

const T = { ink: "#14110F", cream: "#F7F0E8", mono: "'JetBrains Mono', monospace", body: "'Space Grotesk', system-ui, sans-serif", display: "'BN Chubb', 'Space Grotesk', sans-serif" };
type Item = { id: string; created_at: string; name: string | null; organisation: string | null; email: string | null; website: string | null; source: string | null; answers: Record<string, string | string[]> };

const when = (iso: string) => new Date(iso).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const answerText = (i: Item, k: string) => {
  const v = i.answers[k];
  const other = i.answers[`${k}_other`];
  return [Array.isArray(v) ? v.join(", ") : v ?? "", other ? `“${other}”` : ""].filter(Boolean).join(" · ");
};

function csv(items: Item[]): string {
  const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["date", "name", "organisation", "email", "website", "source", ...RESEARCH_QUESTIONS.map((q) => `${q.n}. ${q.q}`)];
  return [head.map(cell).join(","), ...items.map((i) => [when(i.created_at), i.name, i.organisation, i.email, i.website, i.source, ...RESEARCH_QUESTIONS.map((q) => answerText(i, q.k))].map(cell).join(","))].join("\n");
}

const card: React.CSSProperties = { background: "#fff", border: `2px solid ${T.ink}`, borderRadius: 16, padding: 16 };
const label: React.CSSProperties = { fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(20,17,15,.55)", textTransform: "uppercase" };

export default function AdminSocialResearchPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupMsg, setSetupMsg] = useState<string | null>(null);
  const [view, setView] = useState<"tallies" | "responses">("tallies");

  useEffect(() => {
    fetch("/api/admin/social-research").then((r) => r.json()).then((d) => { setItems(Array.isArray(d.items) ? d.items : []); if (d.setupNeeded) setSetupMsg(d.error); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const withContact = useMemo(() => items.filter((i) => i.email || i.name).length, [items]);

  function download() {
    const blob = new Blob([csv(items)], { type: "text/csv" });
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
            {(["tallies", "responses"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} style={{ padding: "8px 16px", borderRadius: 999, border: `2px solid ${T.ink}`, background: view === v ? T.ink : "transparent", color: view === v ? T.cream : T.ink, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {v === "tallies" ? "Tallies" : "Each response"}
              </button>
            ))}
            {items.length > 0 && (
              <button onClick={download} style={{ marginLeft: "auto", padding: "8px 16px", borderRadius: 999, border: `2px solid ${T.ink}`, background: "transparent", color: T.ink, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Download CSV</button>
            )}
          </div>

          {setupMsg && <p style={{ fontSize: 14, fontWeight: 700, color: "#C6362E" }}>{setupMsg}</p>}
          {!loading && items.length === 0 && !setupMsg && <p style={{ fontSize: 14, color: "rgba(20,17,15,.55)" }}>No responses yet.</p>}

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
                  {RESEARCH_QUESTIONS.map((q) => {
                    const t = answerText(i, q.k);
                    if (!t) return null;
                    return (
                      <p key={q.k} style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.45 }}>
                        <span style={label}>{q.n}. {q.q}</span><br />{t}
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
