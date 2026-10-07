"use client";

import { useState } from "react";
import Link from "next/link";

const STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
  FREE: { bg: "rgba(113,111,57,0.18)", fg: "#716F39" },
  "AWAITING REVIEW": { bg: "rgba(252,187,22,0.35)", fg: "#14110F" },
  BOOKED: { bg: "rgba(20,17,15,0.10)", fg: "#14110F" },
  CONFIRMED: { bg: "rgba(41,171,226,0.18)", fg: "#0000FF" },
  NEW: { bg: "rgba(233,103,9,0.18)", fg: "#E96709" },
  APPLIED: { bg: "rgba(144,47,138,0.15)", fg: "#902F8A" },
};

const LOGIN_URL = "https://www.stretchyyoga.co.nz/host/login";

const INK = "#14110F";

export type ActiveSession = {
  id: string;
  title: string;
  startsAt: string;
  locationName: string;
  role: "teacher" | "gem";
};

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
  activeSessions?: ActiveSession[];
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export type QuickAdd = { name: string; email: string; roles: string[]; neighbourhoods: string; practiceTypes: string };

export default function PeopleSection({
  title, people, applyHref, applyLabel, onDecide, busyId, onCancelSession, onFindCover, sessionActionId,
  onApproveApplicant, onQuickAdd, defaultRole, onDelete,
}: {
  title: string; people: Person[]; applyHref: string; applyLabel: string;
  onDecide?: (hostId: string, status: "approved" | "declined") => void; busyId?: string | null;
  onCancelSession?: (sessionId: string) => void;
  onFindCover?: (sessionId: string, role: "teacher" | "gem") => void;
  sessionActionId?: string | null;
  // Form applicants (status APPLIED) — approve straight into an approved host.
  onApproveApplicant?: (personId: string) => void;
  // HQ adds someone directly. Resolves to an error message, or null on success.
  onQuickAdd?: (data: QuickAdd) => Promise<string | null>;
  defaultRole?: "teacher" | "gem";
  onDelete?: (person: Person) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const emptyForm: QuickAdd = { name: "", email: "", roles: [defaultRole ?? "teacher"], neighbourhoods: "", practiceTypes: "" };
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<QuickAdd>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  async function submitQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!onQuickAdd) return;
    setSaving(true);
    setAddError(null);
    const err = await onQuickAdd(form);
    setSaving(false);
    if (err) { setAddError(err); return; }
    setForm(emptyForm);
    setAdding(false);
  }

  const inputStyle: React.CSSProperties = { width: "100%", height: 38, borderRadius: 999, border: `2px solid ${INK}`, padding: "0 14px", fontSize: 13, background: "#fff", color: INK, outline: "none", boxSizing: "border-box" };

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
            const hasDetail = !!onDelete || !!(p.bio || p.email || (p.practiceTypes && p.practiceTypes.length) || (p.neighbourhoods && p.neighbourhoods.length) || (p.activeSessions && p.activeSessions.length));
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
                      <p style={{ fontSize: 13, color: "rgba(20,17,15,.75)", margin: 0, lineHeight: 1.5, whiteSpace: "pre-line" }}>{p.bio}</p>
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
                    {p.activeSessions && p.activeSessions.length > 0 && (
                      <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 6 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: INK, margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                          Upcoming sessions
                        </p>
                        {p.activeSessions.map((s) => {
                          const sessionBusy = sessionActionId === s.id;
                          return (
                            <div key={s.id} style={{ border: "1px solid rgba(20,17,15,.15)", borderRadius: 10, padding: "8px 10px" }}>
                              <p style={{ fontSize: 12, fontWeight: 700, color: INK, margin: 0 }}>{s.title}</p>
                              <p style={{ fontSize: 11, color: "rgba(20,17,15,.55)", margin: "1px 0 6px" }}>
                                {new Date(s.startsAt).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "short", day: "numeric", month: "short" })} · {s.locationName} · {s.role === "teacher" ? "Teaching" : "GEM"}
                              </p>
                              {(onCancelSession || onFindCover) && (
                                <div style={{ display: "flex", gap: 6 }}>
                                  {onFindCover && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); onFindCover(s.id, s.role); }}
                                      disabled={sessionBusy}
                                      style={{ flex: 1, height: 28, borderRadius: 999, border: `1.5px solid ${INK}`, cursor: "pointer", background: "transparent", color: INK, fontSize: 11, fontWeight: 700, opacity: sessionBusy ? 0.6 : 1 }}
                                    >
                                      {sessionBusy ? "…" : "Find cover"}
                                    </button>
                                  )}
                                  {onCancelSession && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); onCancelSession(s.id); }}
                                      disabled={sessionBusy}
                                      style={{ flex: 1, height: 28, borderRadius: 999, border: "none", cursor: "pointer", background: "#C6362E", color: "#F7F0E8", fontSize: 11, fontWeight: 700, opacity: sessionBusy ? 0.6 : 1 }}
                                    >
                                      {sessionBusy ? "…" : "Cancel"}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {onDelete && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(p); }}
                        disabled={busy}
                        style={{ alignSelf: "flex-start", marginTop: 4, background: "transparent", border: "none", padding: 0, cursor: "pointer", color: "#C6362E", fontSize: 12, fontWeight: 700, textDecoration: "underline", opacity: busy ? 0.6 : 1 }}
                      >
                        Delete {p.name.split(" ")[0]} from Stretchy
                      </button>
                    )}
                  </div>
                )}

                {p.status === "APPLIED" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <p style={{ fontSize: 12, color: "rgba(20,17,15,.65)", margin: 0, lineHeight: 1.45 }}>
                      Applied through the form. Approve to add them straight away — you can schedule them now, and their login links up when they first sign in with this email.
                    </p>
                    {onApproveApplicant && (
                      <button
                        onClick={() => onApproveApplicant(p.id)}
                        disabled={busy}
                        style={{ height: 34, borderRadius: 999, border: "none", cursor: "pointer", background: "#716F39", color: "#F7F0E8", fontSize: 12, fontWeight: 700, opacity: busy ? 0.6 : 1 }}
                      >
                        {busy ? "…" : "Approve"}
                      </button>
                    )}
                    {p.email && (
                      <a
                        href={`mailto:${p.email}?subject=${encodeURIComponent("Your Stretchy login")}&body=${encodeURIComponent(`Kia ora ${p.name.split(" ")[0]},\n\nThanks for applying! Next step: create your Stretchy login here — ${LOGIN_URL}\n\nSign in with Google or your email, fill in your profile, and I'll approve you from there.\n\nNgā mihi,\nKimberley`)}`}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 34, borderRadius: 999, border: `1.5px solid ${INK}`, color: INK, fontSize: 12, fontWeight: 700, textDecoration: "none" }}
                      >
                        Email them the login link
                      </a>
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

      {onQuickAdd ? (
        adding ? (
          <form onSubmit={submitQuickAdd} style={{ display: "flex", flexDirection: "column", gap: 8, background: "#fff", border: `2px solid ${INK}`, borderRadius: 14, padding: 14 }}>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: INK, margin: 0 }}>
              {applyLabel.toUpperCase()} — APPROVED STRAIGHT AWAY
            </p>
            <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
            <input required type="email" placeholder="Email (the one they'll log in with)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
            <div style={{ display: "flex", gap: 14, fontSize: 13, color: INK, padding: "2px 4px" }}>
              {(["teacher", "gem"] as const).map((r) => (
                <label key={r} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form.roles.includes(r)}
                    onChange={(e) => setForm({ ...form, roles: e.target.checked ? [...form.roles, r] : form.roles.filter((x) => x !== r) })}
                  />
                  {r === "teacher" ? "Teacher" : "GEM"}
                </label>
              ))}
            </div>
            <input placeholder="Areas (optional) — e.g. Herne Bay, Ponsonby" value={form.neighbourhoods} onChange={(e) => setForm({ ...form, neighbourhoods: e.target.value })} style={inputStyle} />
            {form.roles.includes("teacher") && (
              <input placeholder="Styles (optional) — e.g. Vinyasa, Yin" value={form.practiceTypes} onChange={(e) => setForm({ ...form, practiceTypes: e.target.value })} style={inputStyle} />
            )}
            {addError && <p style={{ fontSize: 12, color: "#C6362E", margin: 0 }}>{addError}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" disabled={saving || form.roles.length === 0} style={{ flex: 1, height: 36, borderRadius: 999, border: "none", cursor: "pointer", background: "#716F39", color: "#F7F0E8", fontSize: 13, fontWeight: 700, opacity: saving || form.roles.length === 0 ? 0.6 : 1 }}>
                {saving ? "Adding…" : "Add & approve"}
              </button>
              <button type="button" onClick={() => { setAdding(false); setAddError(null); }} style={{ flex: 1, height: 36, borderRadius: 999, border: `1.5px solid ${INK}`, cursor: "pointer", background: "transparent", color: INK, fontSize: 13, fontWeight: 700 }}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            style={{ display: "inline-block", fontSize: 13, fontWeight: 700, color: INK, background: "transparent", cursor: "pointer", border: `2px solid ${INK}`, borderRadius: 999, padding: "8px 16px" }}
          >
            + {applyLabel}
          </button>
        )
      ) : (
            <Link
        href={applyHref}
        style={{ display: "inline-block", fontSize: 13, fontWeight: 700, color: INK, textDecoration: "none", border: `2px solid ${INK}`, borderRadius: 999, padding: "8px 16px" }}
      >
        + {applyLabel}
      </Link>
      )}
    </div>
  );
}

// Shared by HQ's Who's available + Pending & applied pages.
export async function addPersonToHQ(body: Record<string, unknown>): Promise<string | null> {
  try {
    const res = await fetch("/api/admin/people", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return null;
    const d = await res.json().catch(() => ({}));
    return d.error ?? "Couldn't add them — try again.";
  } catch {
    return "Couldn't reach Stretchy — check your connection.";
  }
}
