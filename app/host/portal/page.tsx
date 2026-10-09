"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SMark from "@/components/SMark";
import LocationCard from "@/components/portal/LocationCard";
import AgreementView from "@/components/portal/AgreementView";
import { createClient } from "@/lib/supabase/client";
import type { PortalAgreement, PortalLocation, PortalPerson } from "@/lib/portal";

type Data = {
  isAdmin: boolean;
  inDirectory: boolean;
  myRole: PortalPerson["role"] | null;
  locations: PortalLocation[];
  people: PortalPerson[];
  agreement: PortalAgreement | null;
  accepted: boolean;
};

export default function TeamPortalPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [agreeTicked, setAgreeTicked] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const load = useCallback(async (accessToken: string) => {
    const res = await fetch("/api/portal", { headers: { Authorization: `Bearer ${accessToken}` } });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (d.code === "mfa_required" || d.code === "mfa_enroll_required") return router.push("/mfa-setup?next=/host/portal");
      if (d.code === "no_host_profile") return router.push("/host/create-profile");
      setError(d.error ?? "Couldn't load the portal.");
      return;
    }
    setData(d);
    setActive((cur) => cur ?? d.locations[0]?.id ?? null);
  }, [router]);

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) return router.push("/host/login");
      setToken(session.access_token);
      load(session.access_token);
    });
    return () => subscription.unsubscribe();
  }, [router, load]);

  async function accept() {
    if (!token || !data?.agreement) return;
    setAccepting(true);
    const res = await fetch("/api/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ acceptAgreementId: data.agreement.id }),
    });
    setAccepting(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? "Couldn't save that — try again.");
    }
    load(token);
  }

  if (error) return <main className="min-h-screen flex items-center justify-center bg-cream text-ink text-sm px-6 text-center">{error}</main>;
  if (!data) return <main className="min-h-screen flex items-center justify-center bg-cream text-ink text-sm">Loading…</main>;

  const loc = data.locations.find((l) => l.id === active) ?? null;
  const seeAllSections = data.isAdmin || data.myRole === "owner" || data.myRole === "hq";

  return (
    <main className="min-h-screen bg-cream text-ink pb-16">
      <div className="max-w-lg mx-auto px-4 sm:px-6 pt-5 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div className="text-purple"><SMark size={32} /></div>
          <Link href={data.isAdmin ? "/admin/portal" : "/host/home"} className="text-xs underline text-ink/55">
            {data.isAdmin ? "Edit in HQ" : "← Home"}
          </Link>
        </div>

        <div>
          <div className="font-mono text-[10px] font-extrabold tracking-[0.13em] text-ink/45">TEAM PORTAL</div>
          <h1 className="font-display text-[32px] leading-none mt-2">Your locations.</h1>
          <p className="text-xs text-ink/60 mt-2">Venues, contacts, codes and what to do each week. Keep codes to yourself 🤫</p>
        </div>

        {data.agreement && !data.accepted && (
          <section className="border-2 border-ink rounded-2xl p-4" style={{ background: "#FCBB16" }}>
            <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-1">PLEASE READ & ACCEPT</div>
            <h2 className="font-display text-xl leading-none">{data.agreement.title}</h2>
            <div className="mt-3 max-h-96 overflow-y-auto bg-white border-2 border-ink rounded-xl p-4">
              <AgreementView agreement={data.agreement} role={data.myRole} showAll={seeAllSections} />
            </div>
            <label className="flex items-start gap-2 mt-3 text-sm">
              <input type="checkbox" checked={agreeTicked} onChange={(e) => setAgreeTicked(e.target.checked)} className="mt-1" />
              <span>I&rsquo;ve read this and agree to it.</span>
            </label>
            <button
              onClick={accept}
              disabled={!agreeTicked || accepting}
              className="mt-3 w-full h-11 rounded-pill bg-ink text-cream font-bold text-sm disabled:opacity-40"
            >
              {accepting ? "Saving…" : "Accept"}
            </button>
          </section>
        )}

        {data.locations.length === 0 ? (
          <div className="border-2 border-dashed border-ink/30 rounded-2xl p-6 text-center text-sm text-ink/60">
            {data.inDirectory
              ? "You're not assigned to a location yet — HQ will add you."
              : "HQ hasn't added you to the team portal yet. Flick Kimberley a message: kimberley@stretchyyoga.co.nz"}
          </div>
        ) : (
          <>
            <div className="flex gap-2 flex-wrap">
              {data.locations.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setActive(l.id)}
                  className={`px-3.5 h-9 rounded-pill border-2 border-ink text-sm font-bold ${l.id === active ? "bg-ink text-cream" : "bg-white"}`}
                >
                  {l.name}
                </button>
              ))}
            </div>
            {loc && (
              <>
                <h2 className="font-display text-[26px] leading-none">{loc.name}</h2>
                <LocationCard location={loc} people={data.people} secretsHidden={!data.accepted} />
              </>
            )}
          </>
        )}

        {data.agreement && data.accepted && (
          <details className="border-2 border-ink rounded-2xl p-4 bg-white text-sm">
            <summary className="font-bold cursor-pointer">📜 {data.agreement.title} <span className="text-ink/50 font-normal">· accepted</span></summary>
            <div className="mt-3"><AgreementView agreement={data.agreement} role={data.myRole} showAll={seeAllSections} /></div>
          </details>
        )}
      </div>
    </main>
  );
}
