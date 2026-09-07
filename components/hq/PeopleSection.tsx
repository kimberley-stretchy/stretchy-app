"use client";

import { useState } from "react";
import Link from "next/link";

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  FREE: { bg: "rgba(113,111,57,0.18)", fg: "#716F39" },
  "AWAITING REVIEW": { bg: "rgba(252,187,22,0.35)", fg: "#14110F" },
  BOOKED: { bg: "rgba(20,17,15,0.10)", fg: "#14110F" },
  CONFIRMED: { bg: "rgba(41,171,226,0.18)", fg: "#0000FF" },
  NEW: { bg: "rgba(233,103,9,0.18)", fg: "#E96709" },
};

const INK = "#14110F";

export type Person = {
  id: string;
  name: string;
  meta: string;
  status: string;
  note?: string | null;
  email?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  practiceTypes?: string[];
  neighbourhoods?: string[];
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export default function PeopleSection({ title, people, applyHref, applyLabel, onDecide, busyId }: {
  title: string; people: Person[]; applyHref: string; applyLabel: string;
  onDecide?: (hostId: string, status: "approved" | "declined") => void; busyId?: string | null;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: INK }}>
          {title} · {people.length}
        </span>
        <span style={{ flex: 1, height: 1, background: "rgba(20,17,15,.15)" }} />
      </div>

      {people.length === 0 ? (
        <div style={{ border: "2px dashed rgba(20,17,15,.2)", borderRadius: 14, padding: 16, fontSize: 13, color: "rgba(20,17,15,.5)", marginBottom: 10 }}>
          Nobody yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
          {people.map((p) => {
            const c = STATUS_COLORS[p.status] ?? STATUS_COLORS["AWAITING REVIEW"];
            const isPending = p.status === "AWAITING REVIEW" && !!onDecide;
            const busy = busyId === p.id;
            const expanded = expandedId === p.id;
            const hasDetail = !!(p.bio || p.email || (p.practiceTypes && p.practiceTypes.length) || (p.neighbourhoods && p.neighbourhoods.length));
            return (
              <div key={p.id} style={{ display: "flex", flexDirection: "column", gap: 10, background: "#fff", border: `2px solid ${INK}`, borderRadius: 14, padding: "10px 14px" }}>
                <div
                  onClick={() => hasDetail && setExpandedId(expanded ? null : p.id)}
                  style={{ display: "flex", alignItems: "center", gap: 12, cursor: hasDetail ? "pointer" : "default" }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#EFDEDB", color: INK, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, flexShrink: 0, overflow: "hidden" }}>
                    {p.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      initials(p.name)
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: INK, margin: 0 }}>{p.name}</p>
                    {p.meta && <p style={{ fontSize: 12, color: "rgba(20,17,15,.55)", margin: "1px 0 0" }}>{p.meta}</p>}
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", padding: "4px 9px", borderRadius: 999, background: c.bg, color: c.fg, flexShrink: 0 }}>
                    {p.status}
                  </span>
                  {hasDetail && (
                    <span style={{ color: "rgba(20,17,15,.35)", fontSize: 11, flexShrink: 0, transform: expanded ? "rotate(180deg)" : "none" }}>▾</span>
                  )}
                </div>

                {expanded && hasDetail && (
                  <div style={{ borderTop: "1px solid rgba(20,17,15,.12)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                    {p.email && (
                      <p style={{ fontSize: 12, color: "rgba(20,17,15,.7)", margin: 0 }}>
                        <a href={`mailto:${p.email}`} style={{ color: INK, fontWeight: 600 }}>{p.email}</a>
                      </p>
                    )}
                    {p.bio && (
                      <p style={{ fontSize: 13, color: "rgba(20,17,15,.75)", margin: 0, lineHeight: 1.5 }}>{p.bio}</p>
                    )}
                    {p.practiceTypes && p.practiceTypes.length > 0 && (
                      <p style={{ fontSize: 12, color: "rgba(20,17,15,.55)", margin: 0 }}>
                        <strong style={{ color: INK }}>Teaches:</strong> {p.practiceTypes.join(", ")}
                      </p>
                    )}
                    {p.neighbourhoods && p.neighbourhoods.length > 0 && (
                      <p style={{ fontSize: 12, color: "rgba(20,17,15,.55)", margin: 0 }}>
                        <strong style={{ color: INK }}>Areas:</strong> {p.neighbourhoods.join(", ")}
                      </p>
                    )}
                  </div>
                )}

                {isPending && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => onDecide!(p.id, "approved")}
                      disabled={busy}
                      style={{ flex: 1, height: 34, borderRadius: 999, border: "none", cursor: "pointer", background: "#716F39", color: "#F7F0E8", fontSize: 12, fontWeight: 700, opacity: busy ? 0.6 : 1 }}
                    >
                      {busy ? "…" : "Approve"}
                    </button>
                    <button
                      onClick={() => onDecide!(p.id, "declined")}
                      disabled={busy}
                      style={{ flex: 1, height: 34, borderRadius: 999, border: `1.5px solid ${INK}`, cursor: "pointer", background: "transparent", color: INK, fontSize: 12, fontWeight: 700, opacity: busy ? 0.6 : 1 }}
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Link
        href={applyHref}
        style={{ display: "inline-block", fontSize: 13, fontWeight: 700, color: INK, textDecoration: "none", border: `2px solid ${INK}`, borderRadius: 999, padding: "8px 16px" }}
      >
        + {applyLabel}
      </Link>
    </div>
  );
}
