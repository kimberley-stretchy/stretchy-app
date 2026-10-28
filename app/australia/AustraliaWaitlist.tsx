"use client";

// stretchyyoga.co.nz/australia — the Stretchy Australia waitlist (Sydney first).
// Where in Sydney, what times, anywhere else in Australia, teachers / GEMs /
// locations people know, and how they heard about us. Copy agreed with
// Kimberley, 28 Oct 2026. Lists live in lib/australia.ts.

import { useEffect, useState } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";
import { LAUNCH_LINE, LINKS, NZ_VIBES, SYDNEY_AREAS, TIMES, OTHER_CITIES, SOMEWHERE_ELSE } from "@/lib/australia";

const INK = "#14110F";
// Stretchy green, with black text and outlines (Kimberley, Oct 2026).
const GREEN = "#716F39";
const field = "w-full h-11 rounded-xl border-2 border-ink px-3 bg-white text-ink";

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className="px-3 py-1.5 rounded-pill text-xs font-semibold border-2 text-left"
      style={{ borderColor: INK, background: on ? INK : "transparent", color: on ? GREEN : INK }}
    >
      {label}
    </button>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border-2 border-ink p-4 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <p className="m-0 font-bold text-ink text-sm leading-snug">{title}</p>
        {hint && <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-ink/80">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function Socials({ center }: { center?: boolean }) {
  return (
    <div className={`flex flex-col gap-1 text-sm text-ink ${center ? "items-center text-center" : ""}`}>
      <span>Follow along: <a href={LINKS.auInstagram.href} target="_blank" rel="noopener" className="font-bold underline">{LINKS.auInstagram.label}</a> · <a href={LINKS.tiktok.href} target="_blank" rel="noopener" className="underline">{LINKS.tiktok.label}</a></span>
      <span>{NZ_VIBES} <a href={LINKS.nzInstagram.href} target="_blank" rel="noopener" className="font-bold underline">{LINKS.nzInstagram.label}</a> 🌿</span>
    </div>
  );
}

export default function AustraliaWaitlist() {
  const [f, setF] = useState({
    name: "", email: "", sydney_areas: [] as string[], sydney_other: "", times: [] as string[],
    other_cities: [] as string[], other_city_note: "", is_teacher: false, is_gem: false,
    team_tip: "", venue_tip: "", heard_from: "", opt_in: false, hp: "",
  });
  const [elsewhere, setElsewhere] = useState(false);
  const [otherCity, setOtherCity] = useState(false);
  const [source, setSource] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => { setSource(new URLSearchParams(window.location.search).get("src") ?? ""); }, []);
  const toggle = (k: "sydney_areas" | "times" | "other_cities", v: string) =>
    setF((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((y) => y !== v) : [...x[k], v] }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    const res = await fetch("/api/australia/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, sydney_other: elsewhere ? f.sydney_other : "", other_city_note: otherCity ? f.other_city_note : "", source }),
    }).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    setSending(false);
    if (!res || !res.ok) return setError(d.error ?? "Couldn’t send that just now. Please try again.");
    try { localStorage.setItem("stretchy_au_popup", "joined"); } catch { /* fine */ }
    setDone(true);
    window.scrollTo(0, 0);
  }

  if (done) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-4" style={{ background: GREEN }}>
        <div className="text-ink"><SMark size={56} /></div>
        <h1 className="font-display font-bold text-ink m-0 uppercase" style={{ fontSize: "clamp(30px,9vw,44px)", letterSpacing: "-0.03em", lineHeight: 1 }}>You&rsquo;re on the list. 🇦🇺</h1>
        <p className="text-sm text-ink/80 max-w-xs m-0">We&rsquo;ll be in touch as Sydney gets closer. In the meantime, come say hi on Instagram.</p>
        <a href={LINKS.auInstagram.href} target="_blank" rel="noopener" className="h-11 px-6 rounded-pill border-2 border-ink text-ink font-bold flex items-center justify-center">Follow {LINKS.auInstagram.label}</a>
        <Socials center />
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-16" style={{ background: GREEN }}>
      <nav className="flex items-center justify-between px-5 py-4 max-w-lg mx-auto">
        <Link href="/" className="text-ink" aria-label="Stretchy"><SMark size={30} /></Link>
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink">Stretchy Australia 🇦🇺</span>
      </nav>

      <form onSubmit={submit} className="px-5 max-w-lg mx-auto flex flex-col gap-3">
        <div className="flex flex-col gap-2 mb-1">
          <h1 className="font-display font-bold text-ink m-0 uppercase" style={{ fontSize: "clamp(28px,8vw,40px)", letterSpacing: "-0.03em", lineHeight: 1 }}>
            Sydney first. More of Australia soon.
          </h1>
          <p className="m-0 text-sm text-ink font-semibold">{LAUNCH_LINE}</p>
          <p className="m-0 text-sm text-ink/80">Tell us where and when suits you, and we&rsquo;ll build the first sessions around the people who sign up.</p>
        </div>

        <Card title="About you">
          <input required placeholder="Your name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={field} style={{ fontSize: 16 }} autoComplete="name" />
          <input required type="email" placeholder="Your email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={field} style={{ fontSize: 16 }} autoComplete="email" />
        </Card>

        <Card title="Where in Sydney would you come to a Stretchy?" hint="Pick as many as you like">
          <div className="flex flex-wrap gap-1.5">
            {SYDNEY_AREAS.map((a) => <Chip key={a} label={a} on={f.sydney_areas.includes(a)} onClick={() => toggle("sydney_areas", a)} />)}
            <Chip label={SOMEWHERE_ELSE} on={elsewhere} onClick={() => setElsewhere(!elsewhere)} />
          </div>
          {elsewhere && <input placeholder="Where in Sydney?" value={f.sydney_other} onChange={(e) => setF({ ...f, sydney_other: e.target.value })} className={field} style={{ fontSize: 16 }} />}
        </Card>

        <Card title="What times suit you?" hint="Pick as many as you like">
          <div className="flex flex-wrap gap-1.5">
            {TIMES.map((t) => <Chip key={t} label={t} on={f.times.includes(t)} onClick={() => toggle("times", t)} />)}
          </div>
        </Card>

        <Card title="Not in Sydney? Where would you love a Stretchy?" hint="Pick as many as you like">
          <div className="flex flex-wrap gap-1.5">
            {OTHER_CITIES.map((c) => <Chip key={c} label={c} on={f.other_cities.includes(c)} onClick={() => toggle("other_cities", c)} />)}
            <Chip label={SOMEWHERE_ELSE} on={otherCity} onClick={() => setOtherCity(!otherCity)} />
          </div>
          {otherCity && <input placeholder="Where?" value={f.other_city_note} onChange={(e) => setF({ ...f, other_city_note: e.target.value })} className={field} style={{ fontSize: 16 }} />}
        </Card>

        <Card title="Are you a teacher or a GEM?" hint="Optional">
          <p className="m-0 text-xs text-ink/80">GEMs are our Good Energy Managers, the people who welcome everyone and host the Social Stretch.</p>
          <label className="flex items-center gap-3 text-sm text-ink cursor-pointer">
            <input type="checkbox" checked={f.is_teacher} onChange={(e) => setF({ ...f, is_teacher: e.target.checked })} className="w-5 h-5" style={{ accentColor: INK }} />
            I&rsquo;m a yoga teacher
          </label>
          <label className="flex items-center gap-3 text-sm text-ink cursor-pointer">
            <input type="checkbox" checked={f.is_gem} onChange={(e) => setF({ ...f, is_gem: e.target.checked })} className="w-5 h-5" style={{ accentColor: INK }} />
            I&rsquo;d love to be a GEM
          </label>
        </Card>

        <Card title="Know a teacher or GEM who’d love this?" hint="Optional">
          <input placeholder="Their name and Instagram" value={f.team_tip} onChange={(e) => setF({ ...f, team_tip: e.target.value })} className={field} style={{ fontSize: 16 }} />
        </Card>

        <Card title="Know a great location for yoga, with community pricing?" hint="Optional">
          <p className="m-0 text-xs text-ink/80">School halls, community halls, parks, pop-up spaces.</p>
          <input placeholder="Where is it?" value={f.venue_tip} onChange={(e) => setF({ ...f, venue_tip: e.target.value })} className={field} style={{ fontSize: 16 }} />
        </Card>

        <Card title="How did you hear about us?" hint="Optional">
          <input value={f.heard_from} onChange={(e) => setF({ ...f, heard_from: e.target.value })} className={field} style={{ fontSize: 16 }} />
        </Card>

        <label className="flex items-start gap-3 text-sm text-ink cursor-pointer px-1">
          <input type="checkbox" checked={f.opt_in} onChange={(e) => setF({ ...f, opt_in: e.target.checked })} className="w-5 h-5 mt-0.5 flex-none" style={{ accentColor: INK }} />
          <span>Send me Stretchy Australia news (launch dates, first sessions). You can unsubscribe any time.</span>
        </label>
        {/* Hidden from people; bots fill it in. */}
        <input value={f.hp} onChange={(e) => setF({ ...f, hp: e.target.value })} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" name="company" />

        {error && <p className="m-0 text-sm font-bold" style={{ color: "#C6362E" }}>{error}</p>}
        <button type="submit" disabled={sending} className="h-12 rounded-pill border-2 border-ink text-ink font-bold text-sm disabled:opacity-40">
          {sending ? "Joining…" : "Join the waitlist"}
        </button>
        <p className="m-0 text-xs text-ink/80 text-center">
          We&rsquo;ll only use your details for Stretchy Australia. <a href="/privacy#australia" target="_blank" rel="noopener" className="underline">Privacy policy ↗</a>
        </p>
        <div className="mt-3"><Socials center /></div>
      </form>
    </main>
  );
}
