"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import HQShell from "@/components/hq/HQShell";
import LocationCard, { PersonCard } from "@/components/portal/LocationCard";
import AgreementView from "@/components/portal/AgreementView";
import {
  AGREEMENT_SECTIONS, LOCATION_GROUPS, ROLE_LABELS, peopleForLocation,
  type PortalAgreement, type PortalLocation, type PortalPerson,
} from "@/lib/portal";

type Data = {
  locations: PortalLocation[];
  people: PortalPerson[];
  agreement: { published: PortalAgreement | null; draft: PortalAgreement | null };
  acceptances: { email: string; name: string | null; accepted_at: string }[];
};

const TABS = [
  { key: "locations", label: "Locations" },
  { key: "people", label: "People" },
  { key: "agreement", label: "Agreement" },
] as const;
type Tab = (typeof TABS)[number]["key"];

const input = "w-full border-2 border-ink rounded-lg px-2.5 py-1.5 text-sm bg-white";
const label = "font-mono text-[10px] font-extrabold tracking-[0.08em] text-ink/55";
const btn = "h-9 px-4 rounded-pill border-2 border-ink text-sm font-bold disabled:opacity-40";

async function post(body: object) {
  const res = await fetch("/api/admin/portal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);
  if (!res || !res.ok) {
    const d = res ? await res.json().catch(() => ({})) : {};
    alert(d.error ?? "Couldn't save — try again.");
    return false;
  }
  return true;
}

// ── Locations ────────────────────────────────────────────────────────────────
function LocationEditor({ loc, people, onSaved }: { loc: PortalLocation; people: PortalPerson[]; onSaved: () => void }) {
  const [form, setForm] = useState<PortalLocation>(loc);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  useEffect(() => setForm(loc), [loc]);
  const dirty = JSON.stringify(form) !== JSON.stringify(loc);

  async function save() {
    setSaving(true);
    if (await post({ action: "saveLocation", location: form })) onSaved();
    setSaving(false);
  }
  async function remove() {
    if (!confirm(`Delete ${loc.name} and everything in it? This can't be undone.`)) return;
    if (await post({ action: "deleteLocation", id: loc.id })) onSaved();
  }

  if (preview) {
    return (
      <div className="flex flex-col gap-3">
        <button onClick={() => setPreview(false)} className={`${btn} self-start bg-white`}>← Back to editing</button>
        <LocationCard location={form} people={people} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-3">
        <div className="flex-1"><div className={label}>LOCATION NAME</div><input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="w-20"><div className={label}>ORDER</div><input type="number" className={input} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} /></div>
      </div>

      {LOCATION_GROUPS.map((g) => (
        <section key={g.title} className={`border-2 border-ink rounded-2xl p-4 ${g.secret ? "bg-[#FCBB16]/25" : "bg-white"}`}>
          <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-3" style={{ color: "#902F8A" }}>
            {g.emoji} {g.title.toUpperCase()}{g.secret && <span className="text-ink/50"> · only shown after the agreement is accepted</span>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {g.fields.map((f) => (
              <div key={f.key} className={f.multiline ? "sm:col-span-2" : ""}>
                <div className={label}>{f.label.toUpperCase()}</div>
                {f.multiline ? (
                  <textarea rows={3} className={input} value={(form[f.key] as string) ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                ) : (
                  <input className={input} value={(form[f.key] as string) ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

      <section>
        <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2 text-ink/45">👥 TEAM AT {loc.name.toUpperCase()} · assign in the People tab</div>
        <div className="flex flex-col gap-2">
          {peopleForLocation(people, loc.id).map((p) => <PersonCard key={p.id} p={p} />)}
        </div>
      </section>

      <div className="sticky bottom-0 bg-cream py-3 flex gap-2 flex-wrap border-t-2 border-ink">
        <button onClick={save} disabled={!dirty || saving} className={`${btn} bg-ink text-cream`}>{saving ? "Saving…" : dirty ? "Save changes" : "Saved"}</button>
        {dirty && <button onClick={() => setForm(loc)} className={`${btn} bg-white`}>Discard</button>}
        <button onClick={() => setPreview(true)} className={`${btn} bg-white`}>Preview team view</button>
        <button onClick={remove} className={`${btn} bg-white ml-auto text-[#C0392B]`}>Delete location</button>
      </div>
    </div>
  );
}

function LocationsTab({ data, reload }: { data: Data; reload: () => void }) {
  const [active, setActive] = useState<string | null>(data.locations[0]?.id ?? null);
  const loc = data.locations.find((l) => l.id === active) ?? null;

  async function add() {
    const name = prompt("New location name (e.g. Mt Eden)")?.trim();
    if (!name) return;
    if (await post({ action: "saveLocation", location: { name, sort_order: data.locations.length + 1 } })) reload();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2 flex-wrap">
        {data.locations.map((l) => (
          <button key={l.id} onClick={() => setActive(l.id)} className={`${btn} ${l.id === active ? "bg-ink text-cream" : "bg-white"}`}>{l.name}</button>
        ))}
        <button onClick={add} className={`${btn} border-dashed bg-transparent`}>+ Add location</button>
      </div>
      {loc ? <LocationEditor key={loc.id} loc={loc} people={data.people} onSaved={reload} /> : <p className="text-sm text-ink/55">No locations yet.</p>}
    </div>
  );
}

// ── People ───────────────────────────────────────────────────────────────────
const EMPTY_PERSON: PortalPerson = {
  id: "", name: "", preferred_name: null, role: "teacher", role_label: null, email: null, phone: null,
  instagram: null, tiktok: null, other_handles: null, on_all_locations: false, sort_order: 10, location_ids: [],
};

function PersonEditor({ person, locations, onDone }: { person: PortalPerson; locations: PortalLocation[]; onDone: (saved: boolean) => void }) {
  const [f, setF] = useState<PortalPerson>(person);
  const [saving, setSaving] = useState(false);
  const text = (k: keyof PortalPerson, lbl: string, type = "text") => (
    <div>
      <div className={label}>{lbl}</div>
      <input type={type} className={input} value={(f[k] as string) ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </div>
  );

  async function save() {
    if (!f.name.trim()) return alert("Add a name first.");
    setSaving(true);
    const ok = await post({ action: "savePerson", person: { ...f, id: f.id || undefined } });
    setSaving(false);
    if (ok) onDone(true);
  }

  return (
    <div className="border-2 border-ink rounded-2xl p-4 bg-white flex flex-col gap-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {text("name", "FULL NAME")}
        {text("preferred_name", "PREFERRED NAME")}
        <div>
          <div className={label}>ROLE</div>
          <select className={input} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as PortalPerson["role"] })}>
            {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        {text("role_label", "ROLE TITLE (OPTIONAL, E.G. STRETCHY OWNER)")}
        {text("email", "EMAIL — LINKS TO THEIR LOGIN", "email")}
        {text("phone", "PHONE", "tel")}
        {text("instagram", "INSTAGRAM")}
        {text("tiktok", "TIKTOK")}
        <div className="sm:col-span-2">{text("other_handles", "OTHER HANDLES / LINKS")}</div>
      </div>

      <div>
        <div className={label}>LOCATIONS</div>
        <label className="flex items-center gap-2 text-sm mt-1.5 font-bold">
          <input type="checkbox" checked={f.on_all_locations} onChange={(e) => setF({ ...f, on_all_locations: e.target.checked })} />
          Show on every location
        </label>
        {!f.on_all_locations && (
          <div className="flex gap-x-4 gap-y-1.5 flex-wrap mt-1.5">
            {locations.map((l) => (
              <label key={l.id} className="flex items-center gap-1.5 text-sm">
                <input
                  type="checkbox"
                  checked={f.location_ids.includes(l.id)}
                  onChange={(e) => setF({ ...f, location_ids: e.target.checked ? [...f.location_ids, l.id] : f.location_ids.filter((x) => x !== l.id) })}
                />
                {l.name}
              </label>
            ))}
          </div>
        )}
        <p className="text-xs text-ink/55 mt-1.5">Teachers &amp; GEMs only see the locations ticked here, when they log in with this email.</p>
      </div>

      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className={`${btn} bg-ink text-cream`}>{saving ? "Saving…" : "Save"}</button>
        <button onClick={() => onDone(false)} className={`${btn} bg-white`}>Cancel</button>
      </div>
    </div>
  );
}

function PeopleTab({ data, reload }: { data: Data; reload: () => void }) {
  const [editing, setEditing] = useState<PortalPerson | null>(null);
  const locName = (id: string) => data.locations.find((l) => l.id === id)?.name;

  async function remove(p: PortalPerson) {
    if (!confirm(`Remove ${p.name} from the team portal?`)) return;
    if (await post({ action: "deletePerson", id: p.id })) reload();
  }

  return (
    <div className="flex flex-col gap-3">
      {editing ? (
        <PersonEditor person={editing} locations={data.locations} onDone={(saved) => { setEditing(null); if (saved) reload(); }} />
      ) : (
        <button onClick={() => setEditing(EMPTY_PERSON)} className={`${btn} self-start bg-ink text-cream`}>+ Add person</button>
      )}
      {data.people.map((p) => (
        <div key={p.id} className="flex flex-col gap-1.5">
          <PersonCard p={p} />
          <div className="flex items-center gap-3 text-xs px-1">
            <span className="text-ink/60 flex-1">
              📍 {p.on_all_locations ? "All locations" : p.location_ids.map(locName).filter(Boolean).join(", ") || "No locations yet"}
            </span>
            <button onClick={() => setEditing(p)} className="underline">Edit</button>
            <button onClick={() => remove(p)} className="underline text-[#C0392B]">Remove</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Agreement ────────────────────────────────────────────────────────────────
function AgreementTab({ data, reload }: { data: Data; reload: () => void }) {
  const base = data.agreement.draft ?? data.agreement.published;
  const initial = {
    title: base?.title ?? "Stretchy team agreement",
    body: base?.body ?? "", body_teacher: base?.body_teacher ?? "", body_gem: base?.body_gem ?? "", body_partner: base?.body_partner ?? "",
  };
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const { published, draft } = data.agreement;
  const changed = JSON.stringify(form) !== JSON.stringify(initial);

  async function saveDraft() {
    setBusy(true);
    if (await post({ action: "saveAgreementDraft", ...form })) reload();
    setBusy(false);
  }
  async function publish() {
    if (!confirm(published
      ? "Publish this version? Everyone will need to accept it again before they see codes."
      : "Publish this agreement? Everyone will need to accept it before they see codes.")) return;
    setBusy(true);
    if (changed && !(await post({ action: "saveAgreementDraft", ...form }))) return setBusy(false);
    if (await post({ action: "publishAgreement" })) reload();
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink/70">
        Everyone reads &amp; accepts this before they can see access codes, alarm codes and weekly instructions.
        Each person sees <strong>For everyone</strong> plus the section for their role (HQ sees all). Publishing a new version asks everyone to accept again.
      </p>
      <div className="text-xs font-mono">
        {published ? <>LIVE: VERSION {published.version} · published {new Date(published.published_at!).toLocaleDateString("en-NZ")}</> : "NOT PUBLISHED YET"}
        {draft && <> · DRAFT VERSION {draft.version} READY TO PUBLISH</>}
      </div>
      <div className="flex gap-2">
        <button onClick={() => setPreview(false)} className={`${btn} ${!preview ? "bg-ink text-cream" : "bg-white"}`}>Edit</button>
        <button onClick={() => setPreview(true)} className={`${btn} ${preview ? "bg-ink text-cream" : "bg-white"}`}>Preview</button>
      </div>

      {preview ? (
        <div className="border-2 border-ink rounded-2xl p-4 bg-white">
          <h3 className="font-display text-xl leading-none mb-3">{form.title}</h3>
          <AgreementView agreement={{ id: "", version: 0, published_at: null, ...form }} showAll />
        </div>
      ) : (
        <>
          <div>
            <div className={label}>TITLE</div>
            <input className={input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <p className="text-xs text-ink/55">Formatting: start a line with <code>## </code> for a heading, <code>- </code> for a bullet, wrap text in <code>**double stars**</code> for bold.</p>
          {AGREEMENT_SECTIONS.map((sec) => (
            <div key={sec.key}>
              <div className={label}>{sec.title.toUpperCase()}</div>
              <textarea rows={sec.key === "body" ? 16 : 10} className={`${input} font-mono text-xs`} value={form[sec.key]} onChange={(e) => setForm({ ...form, [sec.key]: e.target.value })} />
            </div>
          ))}
        </>
      )}

      <div className="flex gap-2 flex-wrap">
        <button onClick={saveDraft} disabled={busy || !changed} className={`${btn} bg-white`}>Save draft</button>
        <button onClick={publish} disabled={busy || !form.body.trim() || (!draft && !changed)} className={`${btn} bg-ink text-cream`}>Publish</button>
      </div>

      {published && (
        <section>
          <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2 text-ink/45">
            ACCEPTED VERSION {published.version} · {data.acceptances.length}
          </div>
          {data.acceptances.length === 0 ? (
            <p className="text-xs text-ink/55">No one yet.</p>
          ) : (
            <ul className="text-sm flex flex-col gap-1">
              {data.acceptances.map((a) => (
                <li key={a.email}>✅ {a.name ?? a.email} <span className="text-ink/50 text-xs">· {a.email} · {new Date(a.accepted_at).toLocaleDateString("en-NZ")}</span></li>
              ))}
            </ul>
          )}
          {(() => {
            const accepted = new Set(data.acceptances.map((a) => a.email.toLowerCase()));
            const waiting = data.people.filter((p) => p.email && !accepted.has(p.email.toLowerCase()));
            return waiting.length > 0 && (
              <p className="text-xs text-ink/60 mt-2">⏳ Still to accept: {waiting.map((p) => p.preferred_name || p.name).join(", ")}</p>
            );
          })()}
        </section>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
function PortalContent() {
  const router = useRouter();
  const params = useSearchParams();
  const tab = (TABS.find((t) => t.key === params.get("tab"))?.key ?? "locations") as Tab;
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/admin/portal")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Couldn't load");
        setData(d);
      })
      .catch((e) => setError(e.message));
  }
  useEffect(load, []);

  return (
    <HQShell>
      <main className="bg-cream text-ink min-h-screen p-4 sm:p-8 flex justify-center">
        <div className="max-w-2xl w-full self-start">
          <p className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-1.5" style={{ color: "#902F8A" }}>TEAM PORTAL</p>
          <div className="flex items-end justify-between gap-3 mb-5">
            <h1 className="font-display text-[32px] leading-none uppercase">Locations &amp; team</h1>
            <Link href="/host/portal" className="text-xs underline text-ink/60 whitespace-nowrap">Open team view →</Link>
          </div>

          <div className="flex gap-1 mb-5 border-b-2 border-ink">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => router.replace(`/admin/portal?tab=${t.key}`)}
                className={`px-4 h-10 text-sm font-bold rounded-t-lg ${tab === t.key ? "bg-ink text-cream" : "text-ink/60"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {error ? <p className="text-sm text-[#C0392B]">{error}</p>
            : !data ? <p className="font-mono text-xs text-ink/40">LOADING…</p>
            : tab === "locations" ? <LocationsTab data={data} reload={load} />
            : tab === "people" ? <PeopleTab data={data} reload={load} />
            : <AgreementTab data={data} reload={load} />}
        </div>
      </main>
    </HQShell>
  );
}

export default function AdminPortalPage() {
  return (
    <Suspense>
      <PortalContent />
    </Suspense>
  );
}
