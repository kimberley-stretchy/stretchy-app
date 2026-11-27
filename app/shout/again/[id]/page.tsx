"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";
import { createClient } from "@/lib/supabase/client";
import { formatDay, formatTime } from "@/lib/sessionTimes";
import { suburbOf } from "@/lib/sessionDisplay";
import { shoutPath, againPath } from "@/lib/shoutWords";

// stretchyyoga.co.nz/shout/again/{shoutId} — we called a session off, and the
// person who shouted a mate there chooses: re-book them at another session, or
// a full refund. No choice in 7 days → refunded automatically.
// SOCIAL_BOOKING_BRIEF.md section 4, "Cancelling".

const INK = "#14110F";
const CREAM = "#F7F0E8";
const YELLOW = "#FCBB16";
const GREY = "rgba(20,17,15,.7)";
const button = "block w-full text-center rounded-pill py-[13px] px-[18px] font-bold text-[15px] disabled:opacity-50";

type Shout = { id: string; name: string; state: string; amountCents: number; refundCents: number | null; sessionTitle: string; startsAt: string | null };
type Option = { id: string; title: string; starts_at: string; location_name: string | null; location_address: string | null };

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default function ShoutAgainPage({ params }: { params: { id: string } }) {
  const [token, setToken] = useState<string | null>(null);
  const [shout, setShout] = useState<Shout | null>(null);
  const [sessions, setSessions] = useState<Option[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refundOpen, setRefundOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refunded, setRefunded] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("refund") === "1") setRefundOpen(true);
    createClient().auth.getSession().then(async ({ data: { session: auth } }) => {
      if (!auth) {
        window.location.href = `/login?next=${encodeURIComponent(`${againPath(params.id)}${window.location.search}`)}`;
        return;
      }
      setToken(auth.access_token);
      const r = await fetch(`/api/shout/again?id=${params.id}`, { cache: "no-store", headers: { Authorization: `Bearer ${auth.access_token}` } }).catch(() => null);
      const d = r ? await r.json().catch(() => ({})) : {};
      if (!r || !r.ok) return setError(d.error ?? "We couldn’t load your shout.");
      setShout(d.shout);
      setSessions(d.sessions ?? []);
    });
  }, [params.id]);

  async function refund() {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/shout/manage", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ shoutId: params.id, action: "refund" }) }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (!r || !r.ok) return setError(d.error ?? "Something went wrong. Please try again.");
    setRefunded(true);
  }

  const shell = (children: React.ReactNode) => (
    <main className="min-h-screen bg-cream pb-16">
      <nav className="flex items-center justify-between px-[18px] py-4 max-w-lg mx-auto">
        <Link href="/" aria-label="Stretchy home" className="text-ink"><SMark size={28} /></Link>
        <Link href="/notifications" className="font-mono text-[10px] font-extrabold tracking-[0.1em] uppercase underline underline-offset-2 text-ink">My bookings</Link>
      </nav>
      <div className="px-[18px] max-w-lg mx-auto flex flex-col gap-[14px] text-ink">{children}</div>
    </main>
  );
  const h1 = (text: string) => <h1 className="font-display font-bold m-0 uppercase" style={{ fontSize: "clamp(32px, 9vw, 40px)", lineHeight: 0.92 }}>{text}</h1>;
  const whatsOn = <Link href="/sessions" className={button} style={{ background: INK, color: CREAM }}>What&rsquo;s on</Link>;

  if (error && !shout) return shell(<>{h1("Something went wrong.")}<p className="m-0 text-sm">{error}</p>{whatsOn}</>);
  if (!shout) return shell(<p className="font-mono text-xs text-muted">Loading…</p>);

  if (refunded || shout.state === "refunded") {
    return shell(<>
      {h1("Refunded. 💛")}
      <p className="m-0 text-sm">{money(shout.refundCents ?? shout.amountCents)} is on its way back to your card for {shout.name}&rsquo;s place. It can take a few days to show.</p>
      {whatsOn}
    </>);
  }
  if (shout.state !== "cancelled") {
    return shell(<>
      {h1("Nothing to choose here.")}
      <p className="m-0 text-sm">This shout isn&rsquo;t waiting on a re-book or refund. Questions? Email hello@stretchyyoga.co.nz.</p>
      {whatsOn}
    </>);
  }

  const was = shout.startsAt ? `${formatDay(shout.startsAt)}, ${formatTime(shout.startsAt)}` : "";
  return shell(<>
    <div>
      {h1(`Re-book ${shout.name}`)}
      <p className="m-0 mt-2 text-sm" style={{ color: GREY }}>We called off {shout.sessionTitle}{was ? ` (${was})` : ""}. Pick another session for {shout.name}, or get your {money(shout.amountCents)} back. Your choice.</p>
    </div>

    {!refundOpen && (
      <div className="border-2 rounded-[22px] p-4 flex flex-col gap-1 bg-white" style={{ borderColor: INK }}>
        <p className="m-0 mb-1 font-mono text-[10px] font-extrabold tracking-[0.1em] uppercase">Pick a session</p>
        {sessions.length === 0 && <p className="m-0 text-sm">Nothing open just now. Check back soon, or take a refund.</p>}
        {sessions.map((o) => (
          <Link key={o.id} href={`${shoutPath(o.id)}?rebook=${shout.id}`} className="flex items-center justify-between gap-3 py-2 border-t first:border-t-0" style={{ borderColor: "rgba(20,17,15,.15)" }}>
            <span>
              <span className="block font-bold text-sm">{o.title}</span>
              <span className="block text-[13px]" style={{ color: GREY }}>{suburbOf(o) ? `${suburbOf(o)}, ` : ""}{formatDay(o.starts_at)}, {formatTime(o.starts_at)}</span>
            </span>
            <span className="font-bold text-sm flex-shrink-0" aria-hidden>→</span>
          </Link>
        ))}
        <p className="m-0 mt-2 text-[13px]" style={{ color: GREY }}>You pay for the new place as usual. Once it&rsquo;s paid, we refund this one in full.</p>
      </div>
    )}

    {refundOpen ? (
      <div className="border-2 rounded-[22px] p-4 flex flex-col gap-3 bg-white animate-slide-down motion-reduce:animate-none" style={{ borderColor: INK }}>
        <p className="m-0 font-bold text-[15px]">Refund {money(shout.amountCents)} to your card?</p>
        {error && <p className="m-0 text-sm font-bold" role="alert">{error}</p>}
        <button type="button" onClick={refund} disabled={busy} className={button} style={{ background: INK, color: YELLOW }}>{busy ? "Refunding…" : "Refund me"}</button>
        <button type="button" onClick={() => setRefundOpen(false)} disabled={busy} className="self-center font-bold text-sm underline underline-offset-2">Re-book {shout.name} instead</button>
      </div>
    ) : (
      <button type="button" onClick={() => setRefundOpen(true)} className={`${button} border-2`} style={{ borderColor: INK }}>Refund me instead</button>
    )}
    <p className="m-0 text-xs text-center" style={{ color: "rgba(20,17,15,.55)" }}>No choice in 7 days? We&rsquo;ll refund you in full.</p>
  </>);
}
