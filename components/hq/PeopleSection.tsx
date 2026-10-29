"use client";

import { useState } from "react";
import Link from "next/link";
import { byFirstName } from "@/lib/byFirstName";

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
  appliedAt?: string | null;
  note?: string | null;
  email?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  practiceTypes?: string[];
  neighbourhoods?: string[];
  activeSessions?: ActiveSession[];
  phone?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  website?: string | null;
  /** A real teacher/GEM profile (not a form applicant) — HQ can edit it. */
  editable?: boolean;
};

// HQ edits a teacher's or GEM's details: name, phone, handles, areas, bio.
// The contact details are copied to their Team portal card too.
function EditDetails({ p, onDone }: { p: Person; onDone: (saved: boolean) => void }) {
  const [f, setF] = useState({
    name: p.name ?? "", phone: p.phone ?? "", instagram: p.instagram ?? "", tiktok: p.tiktok ?? "",
    website: p.website ?? "", neighbourhoods: (p.neighbourhoods ?? []).join(", "), bio: p.bio ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function save() {
    setBusy(true);
    setErr(null);
    const res = await fetch("/api/admin/people/details", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostId: p.id, ...f }),
    }).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    setBusy(false);
    if (!res || !res.ok) return setErr(d.error ?? "Couldn’t save — try again.");
    if (d.phoneSaved === false) alert("Saved — but the phone number couldn’t be stored yet (the database step hasn’t been run).");
    onDone(true);
  }
  const field: React.CSSProperties = { width: "100%", borderRadius: 10, border: `2px solid ${INK}`, padding: "8px 10px", fontSize: 16, background: "#fff", color: INK, boxSizing: "border-box", fontFamily: "inherit" };
  const lbl: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", color: "rgba(20,17,15,.55)", display: "block", marginBottom: 3 };
  const row = (k: keyof typeof f, label: string, type = "text") => (
    <label style={{ display: "block" }}>
      <span style={lbl}>{label}</span>
      <input type={type} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} style={field} />
    </label>
  );
  return (
    <div onClick={(e) => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", gap: 8, padding: 12, borderRadius: 12, background: "#F7F0E8", border: `1.5px solid ${INK}` }}>
      {row("name", "NAME")}
      {row("phone", "PHONE", "tel")}
      {row("instagram", "INSTAGRAM")}
      {row("tiktok", "TIKTOK")}
      {row("website", "WEBSITE")}
      {row("neighbourhoods", "AREAS (COMMA-SEPARATED)")}
      <label style={{ display: "block" }}>
        <span style={lbl}>BIO</span>
        <textarea rows={3} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} style={{ ...field, resize: "vertical" }} />
      </label>
      {err && <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#C6362E" }}>{err}</p>}
      {/* New phone / lost their authenticator app: clear it so they can set it up again. */}
      <button
        type="button"
        onClick={async () => {
          if (!confirm(`Reset ${p.name}'s authenticator? Next time they sign in they'll scan a new QR code to set it up again.`)) return;
          const res = await fetch("/api/admin/people/reset-mfa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hostId: p.id }) }).catch(() => null);
          const d = res ? await res.json().catch(() => ({})) : {};
          alert(res && res.ok ? `Done. ${p.name} will set up their authenticator again next time they sign in.` : d.error ?? "Couldn’t reset it. Try again.");
        }}
        style={{ alignSelf: "flex-start", background: "none", border: "none", padding: 0, fontSize: 12.5, fontWeight: 700, color: INK, textDecoration: "underline", cursor: "pointer" }}
      >
        Reset their authenticator (new phone)
      </button>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={save} disabled={busy} style={{ height: 38, padding: "0 18px", borderRadius: 999, border: "none", background: INK, color: "#F7F0E8", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
          {busy ? "Saving…" : "Save details"}
        </button>
        <button onClick={() => onDone(false)} disabled={busy} style={{ height: 38, padding: "0 16px", borderRadius: 999, border: `1.5px solid ${INK}`, background: "transparent", color: INK, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

export type QuickAdd = { name: string; email: string; phone: string; roles: string[]; neighbourhoods: string; practiceTypes: string; sendWelcome: boolean };

// Labels sit above each quick-add box, so it's clear which box is which.
const qaLabel: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", color: "rgba(20,17,15,.6)" };

export default function PeopleSection({
  title, people, applyHref, applyLabel, onDecide, busyId, onCancelSession, onFindCover, sessionActionId,
  onApproveApplicant, onQuickAdd, defaultRole, onDelete, onEdited,
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
  /** Called after HQ saves someone's details, to reload the list. */
  onEdited?: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const emptyForm: QuickAdd = { name: "", email: "", phone: "", roles: [defaultRole ?? "teacher"], neighbourhoods: "", practiceTypes: "", sendWelcome: true };
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<QuickAdd>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addedMsg, setAddedMsg] = useState<string | null>(null);

  async function submitQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!onQuickAdd) return;
    setSaving(true);
    setAddError(null);
    const err = await onQuickAdd(form);
    setSaving(false);
    if (err) { setAddError(err); return; }
    setAddedMsg(`${form.name} added${form.sendWelcome ? `. Sign-in email sent to ${form.email}, copied to HQ.` : "."}`);
    setForm(emptyForm);
    setAdding(false);
  }

  const inputStyle: React.CSSProperties = { width: "100%", height: 38, borderRadius: 999, border: `2px solid ${INK}`, padding: "0 14px", fontSize: 13, background: "#fff", color: INK, outline: "none", boxSizing: "border-box", fontFamily: "'Space Grotesk', system-ui, sans-serif", fontWeight: 400, letterSpacing: "normal" };

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
          {[...people].sort(byFirstName).map((p) => {
            const c = STATUS_COLORS[p.status] ?? STATUS_COLORS["AWAITING REVIEW"];
            const isPending = p.status === "AWAITING REVIEW" && !!onDecide;
            const busy = busyId === p.id;
            const expanded = expandedId === p.id;
            const hasDetail = !!onDelete || !!p.editable || !!(p.bio || p.email || (p.practiceTypes && p.practiceTypes.length) || (p.neighbourhoods && p.neighbourhoods.length) || (p.activeSessions && p.activeSessions.length));
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

                {expanded && hasDetail && editingId === p.id && (
                  <EditDetails p={p} onDone={(saved) => { setEditingId(null); if (saved) onEdited?.(); }} />
                )}

                {expanded && hasDetail && editingId !== p.id && (
                  <div style={{ borderTop: "1px solid rgba(20,17,15,.12)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                    {p.editable && onEdited && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingId(p.id); }}
                        style={{ alignSelf: "flex-start", height: 30, padding: "0 14px", borderRadius: 999, border: `1.5px solid ${INK}`, background: "#FCBB16", color: INK, fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                      >
                        Edit details
                      </button>
                    )}
                    <p style={{ fontSize: 12, color: "rgba(20,17,15,.7)", margin: 0 }}>
                      📞 {p.phone ? <a href={`tel:${p.phone.replace(/[^\d+]/g, "")}`} style={{ color: INK, fontWeight: 600 }}>{p.phone}</a> : <span style={{ color: "rgba(20,17,15,.45)" }}>{p.editable ? "No phone yet" : "—"}</span>}
                    </p>
                    {(p.instagram || p.tiktok || p.website) && (
                      <p style={{ fontSize: 12, color: "rgba(20,17,15,.7)", margin: 0 }}>
                        {[p.instagram && `Instagram ${p.instagram}`, p.tiktok && `TikTok ${p.tiktok}`, p.website].filter(Boolean).join(" · ")}
                      </p>
                    )}
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
                      Applied through the form
                      {p.appliedAt
                        ? ` on ${new Date(p.appliedAt).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "short", day: "numeric", month: "short", year: "numeric" })}`
                        : ""}
                      . Approve to add them straight away — you can schedule them now, and their login links up when they first sign in with this email.
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
            <label style={qaLabel}>FULL NAME
              <input required placeholder="e.g. Sophie Berry" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
            </label>
            <label style={qaLabel}>EMAIL · THE ONE THEY&rsquo;LL SIGN IN WITH
              <input required type="email" placeholder="name@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
            </label>
            <label style={qaLabel}>PHONE · OPTIONAL
              <input type="tel" placeholder="e.g. 021 123 4567" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
            </label>
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
            <label style={qaLabel}>AREAS · OPTIONAL
              <input placeholder="e.g. Herne Bay, Ponsonby" value={form.neighbourhoods} onChange={(e) => setForm({ ...form, neighbourhoods: e.target.value })} style={inputStyle} />
            </label>
            {form.roles.includes("teacher") && (
              <label style={qaLabel}>STYLES · OPTIONAL
                <input placeholder="e.g. Vinyasa, Yin" value={form.practiceTypes} onChange={(e) => setForm({ ...form, practiceTypes: e.target.value })} style={inputStyle} />
              </label>
            )}
            <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: INK, padding: "4px 4px 2px", cursor: "pointer", lineHeight: 1.4 }}>
              <input type="checkbox" checked={form.sendWelcome} onChange={(e) => setForm({ ...form, sendWelcome: e.target.checked })} style={{ marginTop: 2 }} />
              <span>Email them how to sign in to the team view <span style={{ color: "rgba(20,17,15,.55)" }}>(copied to HQ)</span></span>
            </label>
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
          <>
          {addedMsg && <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: INK }}>✓ {addedMsg}</p>}
          <button
            onClick={() => { setAdding(true); setAddedMsg(null); }}
            style={{ display: "inline-block", fontSize: 13, fontWeight: 700, color: INK, background: "transparent", cursor: "pointer", border: `2px solid ${INK}`, borderRadius: 999, padding: "8px 16px" }}
          >
            + {applyLabel}
          </button>
          </>
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
