"use client";

import { useEffect, useMemo, useState } from "react";
import HQShell from "@/components/hq/HQShell";
import { SYDNEY_AREAS, TIMES, OTHER_CITIES } from "@/lib/australia";

// HQ → Australia: the Sydney waitlist (stretchyyoga.co.nz/australia). Tallies
// first (areas, times, other cities, teachers & GEMs, referrals, Australian
// visitors by state), then each sign-up, with a CSV download.

const T = { ink: "#14110F", cream: "#F7F0E8", mono: "'JetBrains Mono', monospace", body: "'Space Grotesk', system-ui, sans-serif", display: "'BN Chubb', 'Space Grotesk', sans-serif" };
type Item = {
  id: string; created_at: string; name: string; email: string; sydney_areas: string[]; sydney_other: string | null; times: string[];
  other_cities: string[]; other_city_note: string | null; is_teacher: boolean; is_gem: boolean; team_tip: string | null; venue_tip: string | null;
  heard_from: string | null; heard_group: string | null; opt_in: boolean; state: string | null; source: string | null;
};
const when = (iso: string) => new Date(iso).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const card: React.CSSProperties = { background: "#fff", border: `2px solid ${T.ink}`, borderRadius: 16, padding: 16 };
const label: React.CSSProperties = { fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(20,17,15,.55)", textTransform: "uppercase" };

function Bars({ title, rows, total }: { title: string; rows: [string, number][]; total: number }) {
  return (
    <div>
      <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 13.5 }}>{title}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {rows.map(([k, n]) => (
          <div key={k} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 110px 40px", gap: 10, alignItems: "center", fontSize: 12.5, opacity: n ? 1 : 0.45 }}>
            <span style={{ lineHeight: 1.3 }}>{k}</span>
            <span style={{ height: 10, borderRadius: 999, border: `1.5px solid ${T.ink}`, overflow: "hidden" }}><span style={{ display: "block", height: "100%", width: `${total ? Math.round((n / total) * 100) : 0}%`, background: T.ink }} /></span>
            <span style={{ fontFamily: T.mono, fontWeight: 800, textAlign: "right" }}>{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function csv(items: Item[]): string {
  const cell = (v: unknown) => `"${(Array.isArray(v) ? v.join("; ") : v === true ? "yes" : v === false ? "no" : String(v ?? "")).replace(/"/g, '""')}"`;
  const keys: (keyof Item)[] = ["name", "email", "sydney_areas", "sydney_other", "times", "other_cities", "other_city_note", "is_teacher", "is_gem", "team_tip", "venue_tip", "heard_from", "heard_group", "opt_in", "state", "source"];
  return [["date", ...keys].join(","), ...items.map((i) => [when(i.created_at), ...keys.map((k) => i[k])].map(cell).join(","))].join("\n");
}

export default function AdminAustraliaPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [visits, setVisits] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [setupMsg, setSetupMsg] = useState<string | null>(null);
  const [view, setView] = useState<"tallies" | "people">("tallies");

  useEffect(() => {
    fetch("/api/admin/australia").then((r) => r.json()).then((d) => { setItems(d.items ?? []); setVisits(d.visits ?? {}); if (d.setupNeeded) setSetupMsg(d.error); }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const count = (pick: (i: Item) => string[], options: string[]) => options.map((o) => [o, items.filter((i) => pick(i).includes(o)).length] as [string, number]);
  const referrals = useMemo(() => {
    const m = new Map<string, number>();
    items.forEach((i) => { if (i.heard_from) { const k = i.heard_group ?? "Other"; m.set(k, (m.get(k) ?? 0) + 1); } });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);
  const pct = (n: number) => (items.length ? `${Math.round((n / items.length) * 100)}%` : "0%");
  const hotDog = referrals.find(([k]) => k === "Hot Dog Yoga")?.[1] ?? 0;
  const sophie = referrals.find(([k]) => k === "Sophie Berry")?.[1] ?? 0;
  const visitorTotal = Object.values(visits).reduce((a, b) => a + b, 0);

  function download() {
    const blob = new Blob([csv(items)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "stretchy-australia-waitlist.csv";
    a.click();
  }

  return (
    <HQShell>
      <main style={{ background: T.cream, minHeight: "100vh", color: T.ink, fontFamily: T.body }}>
        <div style={{ maxWidth: 820, padding: "32px 32px 60px" }}>
          <p style={{ ...label, margin: "0 0 6px" }}>STRETCHY AUSTRALIA 🇦🇺</p>
          <h1 style={{ fontFamily: T.display, fontWeight: 700, fontSize: "clamp(32px,8vw,44px)", letterSpacing: "-0.02em", lineHeight: 1, textTransform: "uppercase", margin: "0 0 10px" }}>
            {loading ? "Loading…" : `${items.length} on the list.`}
          </h1>
          <p style={{ fontSize: 14, color: "rgba(20,17,15,.65)", margin: "0 0 18px" }}>
            The Sydney waitlist at <a href="/australia" target="_blank" rel="noopener" style={{ color: T.ink }}>stretchyyoga.co.nz/australia ↗</a>. {items.filter((i) => i.is_teacher).length} teachers · {items.filter((i) => i.is_gem).length} want to be GEMs · {items.filter((i) => i.opt_in).length} want news.
          </p>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {(["tallies", "people"] as const).map((v) => (
              <button key={v} onClick={() => setView(v)} style={{ padding: "8px 16px", borderRadius: 999, border: `2px solid ${T.ink}`, background: view === v ? T.ink : "transparent", color: view === v ? T.cream : T.ink, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {v === "tallies" ? "Tallies" : "Everyone"}
              </button>
            ))}
            {items.length > 0 && <button onClick={download} style={{ marginLeft: "auto", padding: "8px 16px", borderRadius: 999, border: `2px solid ${T.ink}`, background: "transparent", color: T.ink, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Download CSV</button>}
          </div>

          {setupMsg && <p style={{ fontSize: 14, fontWeight: 700, color: "#C6362E" }}>{setupMsg}</p>}

          {view === "tallies" && !setupMsg && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ ...card, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
                {[["Referrals: Hot Dog Yoga", `${hotDog} · ${pct(hotDog)}`], ["Referrals: Sophie Berry", `${sophie} · ${pct(sophie)}`], ["Australian visitors", String(visitorTotal)]].map(([k, v]) => (
                  <div key={k}><p style={{ ...label, margin: "0 0 4px" }}>{k}</p><p style={{ margin: 0, fontFamily: T.mono, fontSize: 20, fontWeight: 800 }}>{v}</p></div>
                ))}
              </div>
              <div style={{ ...card, display: "flex", flexDirection: "column", gap: 16 }}>
                <Bars title="Where in Sydney" rows={[...count((i) => i.sydney_areas, SYDNEY_AREAS), ["Somewhere else", items.filter((i) => i.sydney_other).length]]} total={items.length} />
                {items.some((i) => i.sydney_other) && <p style={{ margin: "-8px 0 0", fontSize: 12.5 }}>Somewhere else: {items.filter((i) => i.sydney_other).map((i) => `“${i.sydney_other}”`).join(" · ")}</p>}
                <Bars title="What times" rows={count((i) => i.times, TIMES)} total={items.length} />
                <Bars title="Elsewhere in Australia" rows={[...count((i) => i.other_cities, OTHER_CITIES), ["Somewhere else", items.filter((i) => i.other_city_note).length]]} total={items.length} />
                {items.some((i) => i.other_city_note) && <p style={{ margin: "-8px 0 0", fontSize: 12.5 }}>Somewhere else: {items.filter((i) => i.other_city_note).map((i) => `“${i.other_city_note}”`).join(" · ")}</p>}
                <Bars title="How they heard about us" rows={referrals} total={items.length} />
                <Bars title="Australian visitors by state" rows={Object.entries(visits).sort((a, b) => b[1] - a[1])} total={visitorTotal} />
              </div>
              <div style={{ ...card, display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ ...label, margin: 0 }}>Teacher &amp; GEM tips</p>
                {items.filter((i) => i.team_tip).length === 0 ? <p style={{ margin: 0, fontSize: 13, color: "rgba(20,17,15,.5)" }}>None yet.</p> : items.filter((i) => i.team_tip).map((i) => <p key={i.id} style={{ margin: 0, fontSize: 13 }}>{i.team_tip} <span style={{ color: "rgba(20,17,15,.5)" }}>· from {i.name}</span></p>)}
                <p style={{ ...label, margin: "8px 0 0" }}>Location tips</p>
                {items.filter((i) => i.venue_tip).length === 0 ? <p style={{ margin: 0, fontSize: 13, color: "rgba(20,17,15,.5)" }}>None yet.</p> : items.filter((i) => i.venue_tip).map((i) => <p key={i.id} style={{ margin: 0, fontSize: 13 }}>{i.venue_tip} <span style={{ color: "rgba(20,17,15,.5)" }}>· from {i.name}</span></p>)}
              </div>
            </div>
          )}

          {view === "people" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {items.map((i) => (
                <div key={i.id} style={card}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <strong>{i.name}{i.is_teacher ? " · teacher" : ""}{i.is_gem ? " · GEM" : ""}</strong>
                    <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "rgba(20,17,15,.55)" }}>{when(i.created_at).toUpperCase()}{i.state ? ` · ${i.state}` : ""}</span>
                  </div>
                  <a href={`mailto:${i.email}`} style={{ color: T.ink, fontSize: 13, wordBreak: "break-all" }}>{i.email}</a>
                  {[["Sydney", [...i.sydney_areas, i.sydney_other ?? ""].filter(Boolean).join(", ")], ["Times", i.times.join(", ")], ["Elsewhere", [...i.other_cities, i.other_city_note ?? ""].filter(Boolean).join(", ")], ["Knows a teacher or GEM", i.team_tip], ["Knows a location", i.venue_tip], ["Heard from", i.heard_from ? `${i.heard_from}${i.heard_group ? ` (${i.heard_group})` : ""}` : ""], ["News", i.opt_in ? "Yes" : "No"]].filter(([, v]) => v).map(([k, v]) => (
                    <p key={k as string} style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.45 }}><span style={label}>{k}</span><br />{v}</p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </HQShell>
  );
}
