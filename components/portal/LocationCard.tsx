"use client";

import { LOCATION_GROUPS, ROLE_LABELS, peopleForLocation, type PortalLocation, type PortalPerson } from "@/lib/portal";

const tel = (v: string) => `tel:${v.replace(/[^\d+]/g, "")}`;
const handleUrl = (v: string, base: string) => (v.startsWith("http") ? v : `${base}${v.replace(/^@/, "")}`);

function Value({ k, v }: { k: string; v: string }) {
  if (k.endsWith("_phone")) return <a href={tel(v)} className="underline">{v}</a>;
  if (k.endsWith("_email")) return <a href={`mailto:${v}`} className="underline break-all">{v}</a>;
  if (k.endsWith("_website")) return <a href={v} target="_blank" rel="noreferrer" className="underline break-all">{v}</a>;
  if (k.endsWith("_address"))
    return <a href={`https://maps.google.com/?q=${encodeURIComponent(v)}`} target="_blank" rel="noreferrer" className="underline">{v}</a>;
  return <span className="whitespace-pre-wrap">{v}</span>;
}

export function PersonCard({ p }: { p: PortalPerson }) {
  const display = p.preferred_name && p.preferred_name !== p.name ? `${p.preferred_name} (${p.name})` : p.name;
  return (
    <div className="border-2 border-ink rounded-xl p-3 bg-white text-sm">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-bold">{display}</span>
        <span className="font-mono text-[9px] font-extrabold px-2 py-0.5 rounded-pill bg-ink text-cream">
          {(p.role_label || ROLE_LABELS[p.role]).toUpperCase()}
        </span>
      </div>
      <div className="mt-1.5 flex flex-col gap-0.5 text-xs text-ink/80">
        {p.phone && <a href={tel(p.phone)} className="underline">📞 {p.phone}</a>}
        {p.email && <a href={`mailto:${p.email}`} className="underline break-all">✉️ {p.email}</a>}
        {p.instagram && <a href={handleUrl(p.instagram, "https://instagram.com/")} target="_blank" rel="noreferrer" className="underline">📸 {p.instagram}</a>}
        {p.tiktok && <a href={handleUrl(p.tiktok, "https://tiktok.com/@")} target="_blank" rel="noreferrer" className="underline">🎵 {p.tiktok}</a>}
        {p.other_handles && <span className="whitespace-pre-wrap">🔗 {p.other_handles}</span>}
      </div>
    </div>
  );
}

export default function LocationCard({
  location, people, secretsHidden = false,
}: { location: PortalLocation; people: PortalPerson[]; secretsHidden?: boolean }) {
  const team = peopleForLocation(people, location.id);
  return (
    <div className="flex flex-col gap-3">
      {LOCATION_GROUPS.map((g) => {
        const rows = g.fields.filter((f) => location[f.key]);
        if (g.secret && secretsHidden) {
          return (
            <section key={g.title} className="border-2 border-dashed border-ink/40 rounded-2xl p-4">
              <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] text-ink/50">{g.emoji} {g.title.toUpperCase()}</div>
              <p className="text-xs text-ink/60 mt-1.5">Accept the team agreement above to see this.</p>
            </section>
          );
        }
        if (!rows.length) return null;
        return (
          <section key={g.title} className={`border-2 border-ink rounded-2xl p-4 ${g.secret ? "bg-[#FCBB16]/25" : "bg-white"}`}>
            <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2" style={{ color: "#902F8A" }}>
              {g.emoji} {g.title.toUpperCase()}
            </div>
            <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-sm">
              {rows.map((f) => (
                <div key={f.key} className="contents">
                  <dt className="text-ink/55 text-xs pt-0.5">{f.label}</dt>
                  <dd className="min-w-0"><Value k={f.key} v={String(location[f.key])} /></dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}

      <section>
        <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2 text-ink/45">👥 TEAM</div>
        {team.length === 0 ? (
          <p className="text-xs text-ink/55">No one assigned yet.</p>
        ) : (
          <div className="flex flex-col gap-2">{team.map((p) => <PersonCard key={p.id} p={p} />)}</div>
        )}
      </section>
    </div>
  );
}
