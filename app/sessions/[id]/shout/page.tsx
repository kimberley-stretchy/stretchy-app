"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { loadStripe, type Stripe as StripeJs } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import SMark from "@/components/SMark";
import InfoRows from "@/components/sessions/InfoRows";
import { createClient } from "@/lib/supabase/client";
import { formatDay, formatTime } from "@/lib/sessionTimes";
import { suburbOf } from "@/lib/sessionDisplay";
import { useIsPhone, smsLink, whatsappLink } from "@/components/ShareRow";
import { NewTabLink, CANCELLATION_POLICY_HREF } from "@/components/PolicyLinks";
import { SHOUT_NOTE_MAX, claimPath, againPath } from "@/lib/shoutWords";

// Shout a mate (SOCIAL_BOOKING_BRIEF.md section 4): pay for one place at this
// session for someone else. Three steps on one page, each revealed once the
// part above it is done. Anyone signed in can shout (they needn't be coming).
// Also "Manage my shout": shouts already made here are listed at the top, with
// Copy link / Send it again / Cancel (free up to 36 hrs out). ?rebook={shoutId}
// re-books a mate after we called their session off: their details are filled
// in, and once this one's paid the old one is refunded in full.

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
const INK = "#14110F";
const CREAM = "#F7F0E8";
const YELLOW = "#FCBB16";
const GREY = "rgba(20,17,15,.7)";
const button = "block w-full text-center rounded-pill py-[13px] px-[18px] font-bold text-[15px] disabled:opacity-50";
const field = "w-full px-4 py-3 rounded-xl border-2 bg-white text-ink outline-none";
const reveal = "animate-slide-down motion-reduce:animate-none";

type Session = { id: string; title: string; starts_at: string; location_name: string | null; location_address: string | null; state: string };
type MyShout = { id: string; code: string; recipient_name: string; deliver: string; state: string; amount_cents: number; final_cents: number | null; refund_cents: number | null; declined_at: string | null; resent_at: string | null };
type Rebook = { id: string; name: string; deliver: "email" | "link"; email: string | null; hidePrice: boolean; note: string | null };
type Info = { open: boolean; closedReason: string | null; amountCents: number | null; savedCard: { brand: string; last4: string } | null; shoutsLeft: number; myShouts: MyShout[]; freeCancel: boolean; rebook: Rebook | null };
type Done = { code: string; deliver: "email" | "link"; name: string; email: string | null };

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const brandName = (b: string) => (b === "amex" ? "Amex" : b.charAt(0).toUpperCase() + b.slice(1));

export default function ShoutPage({ params }: { params: { id: string } }) {
  const [token, setToken] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [done, setDone] = useState<Done | null>(null);

  // Step 1
  const [name, setName] = useState("");
  const [deliver, setDeliver] = useState<"email" | "link" | null>(null);
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState(false);
  const [hidePrice, setHidePrice] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [step, setStep] = useState<1 | 2>(1);
  const [stepError, setStepError] = useState<string | null>(null);

  const [rebook, setRebook] = useState<Rebook | null>(null);

  async function load(t: string) {
    const rebookId = new URLSearchParams(window.location.search).get("rebook");
    const [s, i] = await Promise.all([
      fetch(`/api/sessions/${params.id}`, { cache: "no-store", headers: { Authorization: `Bearer ${t}` } }).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/shout?sessionId=${params.id}${rebookId ? `&rebook=${encodeURIComponent(rebookId)}` : ""}`, { cache: "no-store", headers: { Authorization: `Bearer ${t}` } }).then((r) => (r.ok ? r.json() : null)),
    ]);
    if (!s || !i) { setLoadError("We couldn’t load this session."); return; }
    setSession(s);
    setInfo(i);
    // Re-booking a mate after a call-off: their details, filled in once.
    if (i.rebook && !rebook) {
      const r: Rebook = i.rebook;
      setRebook(r);
      setName(r.name);
      setDeliver(r.deliver);
      setEmail(r.email ?? "");
      setPermission(r.deliver === "email");
      setHidePrice(r.hidePrice);
      if (r.note) { setNote(r.note); setNoteOpen(true); }
    }
  }

  useEffect(() => {
    createClient().auth.getSession().then(async ({ data: { session: auth } }) => {
      if (!auth) {
        window.location.href = `/login?next=${encodeURIComponent(`/sessions/${params.id}/shout`)}`;
        return;
      }
      setToken(auth.access_token);
      await load(auth.access_token);
      // Back from a bank check (3D Secure): finish the shout.
      const back = new URLSearchParams(window.location.search).get("shout");
      if (back) {
        const r = await fetch("/api/shout/confirm", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.access_token}` }, body: JSON.stringify({ shoutId: back }) });
        const d = await r.json().catch(() => ({}));
        if (r.ok) { setDone(d); load(auth.access_token); } else setLoadError(d.error ?? "That payment didn’t go through.");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const first = name.trim().split(/\s+/)[0];
  const who = first || "them";

  function next() {
    setStepError(null);
    if (!name.trim()) return setStepError("Add their first name.");
    if (!deliver) return setStepError(`Choose how ${who} gets it.`);
    if (deliver === "email" && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setStepError(`Enter ${who}’s email.`);
    if (deliver === "email" && !permission) return setStepError(`Please tick to say ${first ? `${first} knows` : "they know"} it’s coming, or won’t mind one email from us.`);
    setStep(2);
  }

  const shell = (children: React.ReactNode) => (
    <main className="min-h-screen bg-cream pb-16">
      <nav className="flex items-center justify-between px-[18px] py-4 max-w-lg mx-auto">
        <Link href={`/sessions/${params.id}`} aria-label="Back to the session" className="text-ink"><SMark size={28} /></Link>
        <Link href="/notifications" className="font-mono text-[10px] font-extrabold tracking-[0.1em] uppercase underline underline-offset-2 text-ink">My bookings</Link>
      </nav>
      <div className="px-[18px] max-w-lg mx-auto flex flex-col gap-[14px] text-ink">{children}</div>
    </main>
  );

  if (loadError) return shell(<><h1 className="font-display font-bold m-0 text-[32px] leading-none">Something went wrong.</h1><p className="m-0 text-sm">{loadError}</p><Link href={`/sessions/${params.id}`} className={button} style={{ background: INK, color: CREAM }}>Back to the session</Link></>);
  if (!session || !info) return shell(<p className="font-mono text-xs text-muted">Loading…</p>);

  const when = `${suburbOf(session) ? `${suburbOf(session)}, ` : ""}${formatDay(session.starts_at)}, ${formatTime(session.starts_at)}`;
  const mine = info.myShouts;

  const myShoutsBox = mine.length > 0 && !done && (
    <div className="border-2 rounded-[22px] p-4 flex flex-col gap-2 bg-white" style={{ borderColor: INK }}>
      <p className="m-0 font-mono text-[10px] font-extrabold tracking-[0.1em] uppercase">Your shouts here</p>
      {mine.map((m) => (
        <ShoutLine key={m.id} m={m} token={token!} freeCancel={info.freeCancel} onChanged={() => load(token!)} />
      ))}
    </div>
  );

  if (done) {
    const url = `${window.location.origin}${claimPath(done.code)}`;
    return shell(<>
      <h1 className="font-display font-bold m-0 uppercase" style={{ fontSize: "clamp(32px, 9vw, 40px)", lineHeight: 0.92 }}>You&rsquo;ve shouted {done.name} a place.</h1>
      <p className="m-0 text-sm" style={{ color: GREY }}>{when}.</p>
      {done.deliver === "email" ? (
        <div className="rounded-[22px] p-4" style={{ background: YELLOW }}>
          <p className="m-0 font-bold text-[15px]">Give {done.name} a heads-up, and ask them to check junk.</p>
          <p className="m-0 mt-1 text-sm">We&rsquo;ve emailed {done.email}.</p>
        </div>
      ) : (
        <GiftLink name={done.name} url={url} />
      )}
      <p className="m-0 text-sm">We&rsquo;ll let you know when {done.name} claims it.</p>
      <button type="button" onClick={() => { setDone(null); setStep(1); setName(""); setDeliver(null); setEmail(""); setPermission(false); setHidePrice(false); setNote(""); setNoteOpen(false); window.history.replaceState(null, "", window.location.pathname); }} className={`${button} border-2`} style={{ borderColor: INK }}>
        Manage my shout
      </button>
    </>);
  }

  const closed = !info.open || info.shoutsLeft < 1;

  return shell(<>
    <div>
      <h1 className="font-display font-bold m-0 uppercase" style={{ fontSize: "clamp(32px, 9vw, 40px)", lineHeight: 0.92 }}>Shout someone a place</h1>
      <p className="m-0 mt-2 text-sm" style={{ color: GREY }}>{when}. All paid for.</p>
    </div>
    {rebook && !closed && (
      <div className="rounded-[22px] p-4" style={{ background: YELLOW }}>
        <p className="m-0 font-bold text-[15px]">Re-booking {rebook.name}.</p>
        <p className="m-0 mt-1 text-sm">Once this one&rsquo;s paid, we refund the one we called off in full.</p>
      </div>
    )}
    {myShoutsBox}

    {closed ? (
      <p className="m-0 text-sm font-bold">{!info.open ? info.closedReason : "You’ve shouted the most places you can at this one (4). What a legend."}</p>
    ) : step === 1 ? (
      <div className="border-2 rounded-[22px] p-4 flex flex-col gap-3 bg-white" style={{ borderColor: INK }}>
        <label className="flex flex-col gap-1.5">
          <span className="font-bold text-sm">Their first name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" className={field} style={{ borderColor: INK, fontSize: 16 }} />
        </label>

        <div className="grid grid-cols-2 gap-2">
          {(["email", "link"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDeliver(d)}
              aria-pressed={deliver === d}
              className="rounded-pill py-3 px-2 font-bold text-sm border-2"
              style={{ borderColor: INK, background: deliver === d ? INK : "transparent", color: deliver === d ? YELLOW : INK }}
            >
              {d === "email" ? `We email ${who}` : "I’ll send a link"}
            </button>
          ))}
        </div>

        {deliver === "email" && (
          <div className={`flex flex-col gap-3 ${reveal}`}>
            <label className="flex flex-col gap-1.5">
              <span className="font-bold text-sm">{first ? `${first}’s email` : "Their email"}</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="off" className={field} style={{ borderColor: INK, fontSize: 16 }} />
            </label>
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <input type="checkbox" checked={permission} onChange={(e) => setPermission(e.target.checked)} className="mt-0.5 w-4 h-4 flex-shrink-0" style={{ accentColor: INK }} />
              <span>{first ? `${first} knows` : "They know"} it&rsquo;s coming, or won&rsquo;t mind one email from us.</span>
            </label>
          </div>
        )}

        {deliver && (
          <div className={`flex flex-col gap-3 ${reveal}`}>
            <label className="flex items-start gap-3 text-sm cursor-pointer">
              <input type="checkbox" checked={hidePrice} onChange={(e) => setHidePrice(e.target.checked)} className="mt-0.5 w-4 h-4 flex-shrink-0" style={{ accentColor: INK }} />
              <span>Hide the price from {who}</span>
            </label>
            {noteOpen ? (
              <label className={`flex flex-col gap-1.5 ${reveal}`}>
                <span className="font-bold text-sm">A note for {who} <span className="font-normal" style={{ color: GREY }}>(optional)</span></span>
                <textarea value={note} onChange={(e) => setNote(e.target.value.slice(0, SHOUT_NOTE_MAX))} rows={2} maxLength={SHOUT_NOTE_MAX} className="w-full rounded-xl border-2 px-3 py-2 bg-white" style={{ borderColor: INK, fontSize: 16 }} />
                <span className="text-xs text-right" style={{ color: "rgba(20,17,15,.55)" }}>{note.length}/{SHOUT_NOTE_MAX}</span>
              </label>
            ) : (
              <button type="button" onClick={() => setNoteOpen(true)} className="self-start font-bold text-sm underline underline-offset-2">+ Add a note</button>
            )}
            {stepError && <p className="m-0 text-sm font-bold" role="alert">{stepError}</p>}
            <button type="button" onClick={next} className={button} style={{ background: INK, color: YELLOW }}>Next</button>
          </div>
        )}
        {!deliver && stepError && <p className="m-0 text-sm font-bold" role="alert">{stepError}</p>}
        <p className="m-0 text-xs" style={{ color: "rgba(20,17,15,.55)" }}>We only use {first ? `${first}’s` : "their"} email for this place.</p>
      </div>
    ) : (
      <PayStep
        sessionId={params.id}
        token={token!}
        amountCents={info.amountCents!}
        savedCard={info.savedCard}
        who={first || "them"}
        details={{ name: name.trim(), deliver: deliver!, email: email.trim(), permission, hidePrice, note: noteOpen ? note : "", rebookOf: rebook?.id }}
        onBack={() => setStep(1)}
        onDone={(d) => { setDone(d); setRebook(null); load(token!); }}
      />
    )}
  </>);
}

function ShoutLine({ m, token, freeCancel, onChanged }: { m: MyShout; token: string; freeCancel: boolean; onChanged: () => void }) {
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const waiting = m.state === "paid";
  const live = m.state === "paid" || m.state === "claimed";
  const status =
    m.state === "claimed" ? "Claimed ✓" :
    m.state === "settled" ? `Final price ${money(m.final_cents ?? m.amount_cents)}${m.refund_cents ? ` · ${money(m.refund_cents)} back to your card` : ""}` :
    m.state === "released" ? `Can’t make it · ${money(m.refund_cents ?? m.amount_cents)} refunded` :
    m.state === "refunded" ? `Cancelled · ${money(m.refund_cents ?? m.amount_cents)} refunded` :
    m.state === "cancelled" ? "Called off · re-book or refund, your choice" :
    m.declined_at ? "Can’t make it · pass the link on" :
    "Waiting to be claimed";

  async function act(action: "cancel" | "resend") {
    setBusy(true);
    setNote(null);
    const r = await fetch("/api/shout/manage", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ shoutId: m.id, action }) }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    setConfirming(false);
    if (!r || !r.ok) return setNote(d.error ?? "Something went wrong. Please try again.");
    if (action === "resend") setNote(`Sent. Ask ${m.recipient_name} to check junk.`);
    onChanged();
  }

  const chip = "rounded-pill px-3 py-1.5 font-bold text-[13px] border-2 flex-shrink-0 disabled:opacity-50";
  return (
    <div className="py-1 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="m-0 font-bold text-sm">{m.recipient_name}</p>
          <p className="m-0 text-[13px]" style={{ color: GREY }}>{status}</p>
        </div>
        {m.state === "cancelled" && (
          <Link href={againPath(m.id)} className={chip} style={{ borderColor: INK }}>Choose</Link>
        )}
      </div>
      {live && !confirming && (
        <div className="flex flex-wrap gap-2">
          {waiting && (
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(`${window.location.origin}${claimPath(m.code)}`).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {})}
              className={chip}
              style={{ borderColor: INK }}
            >
              {copied ? "Copied" : "Copy link"}
            </button>
          )}
          {waiting && m.deliver === "email" && !m.resent_at && !m.declined_at && (
            <button type="button" disabled={busy} onClick={() => act("resend")} className={chip} style={{ borderColor: INK }}>Send it again</button>
          )}
          {freeCancel && (
            <button type="button" disabled={busy} onClick={() => setConfirming(true)} className={chip} style={{ borderColor: INK }}>Cancel</button>
          )}
        </div>
      )}
      {confirming && (
        <div className={`rounded-xl border-2 p-3 flex flex-col gap-2 ${reveal}`} style={{ borderColor: INK }}>
          <p className="m-0 text-sm">
            Cancel {m.recipient_name}&rsquo;s place? You get {money(m.amount_cents)} back.{" "}
            {m.state === "claimed" ? `We’ll let ${m.recipient_name} know.` : "The gift link stops working."}
          </p>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => act("cancel")} className={chip} style={{ borderColor: INK, background: INK, color: YELLOW }}>{busy ? "Cancelling…" : "Yes, cancel"}</button>
            <button type="button" disabled={busy} onClick={() => setConfirming(false)} className={chip} style={{ borderColor: INK }}>Keep it</button>
          </div>
        </div>
      )}
      {note && <p className="m-0 text-[13px] font-bold" role="status">{note}</p>}
    </div>
  );
}

function GiftLink({ name, url }: { name: string; url: string }) {
  const isPhone = useIsPhone();
  const [copied, setCopied] = useState(false);
  const message = `I've shouted you a place at Stretchy 🎁 It's an hour of yoga with a great teacher, then a Social Stretch after. Claim it here:\n${url}`;
  const chips = [
    { label: "WhatsApp", href: whatsappLink(message) },
    ...(isPhone ? [{ label: "Text", href: smsLink(message) }] : []),
  ];
  return (
    <div className="border-2 rounded-[22px] p-4 flex flex-col gap-3 bg-white" style={{ borderColor: INK }}>
      <p className="m-0 font-bold text-sm">Gift link for {name}:</p>
      <p className="m-0 text-sm break-all" style={{ color: GREY }}>{url}</p>
      <div className="flex gap-2">
        {chips.map((c) => (
          <a key={c.label} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="flex-1 text-center font-mono text-[10px] font-extrabold uppercase tracking-[0.06em] rounded-pill border-2 py-2" style={{ borderColor: INK }}>
            {c.label}
          </a>
        ))}
        <button type="button" onClick={() => navigator.clipboard.writeText(url).then(() => setCopied(true)).catch(() => {})} className="flex-1 text-center font-mono text-[10px] font-extrabold uppercase tracking-[0.06em] rounded-pill border-2 py-2" style={{ borderColor: INK }}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

type Details = { name: string; deliver: "email" | "link"; email: string; permission: boolean; hidePrice: boolean; note: string; rebookOf?: string };

function PayStep(props: { sessionId: string; token: string; amountCents: number; savedCard: Info["savedCard"]; who: string; details: Details; onBack: () => void; onDone: (d: Done) => void }) {
  const [useSaved, setUseSaved] = useState(!!props.savedCard);
  const options = useMemo(() => ({
    mode: "payment" as const,
    amount: props.amountCents,
    currency: "nzd",
    paymentMethodTypes: ["card"],
    setupFutureUsage: "off_session" as const,
    appearance: { theme: "stripe" as const, variables: { colorPrimary: INK, colorBackground: "#FFFFFF", colorText: INK, fontFamily: "'Space Grotesk', system-ui, sans-serif", borderRadius: "12px" } },
  }), [props.amountCents]);

  return (
    <div className="border-2 rounded-[22px] p-4 flex flex-col gap-3 bg-white" style={{ borderColor: INK }}>
      <div>
        <p className="m-0 font-bold text-[22px] leading-tight">{money(props.amountCents)} today, never more.</p>
        <p className="m-0 text-sm" style={{ color: GREY }}>Any difference comes back to your card 30 mins before.</p>
      </div>
      <InfoRows
        ruleColor={INK}
        labelWidth={84}
        rows={[
          { label: "Up to 36 hrs out", bold: "Free to cancel", grey: "Full refund." },
          { label: "36 hrs → 30 mins", bold: "No free cancelling from here", grey: undefined },
          { label: "If we cancel", bold: `Re-book ${props.who} or full refund`, grey: "Your choice." },
        ]}
      />

      {props.savedCard && (
        <div className="grid grid-cols-2 gap-2">
          {[true, false].map((v) => (
            <button key={String(v)} type="button" onClick={() => setUseSaved(v)} aria-pressed={useSaved === v} className="rounded-pill py-3 px-2 font-bold text-sm border-2" style={{ borderColor: INK, background: useSaved === v ? INK : "transparent", color: useSaved === v ? YELLOW : INK }}>
              {v ? `${brandName(props.savedCard!.brand)} •••• ${props.savedCard!.last4}` : "A new card"}
            </button>
          ))}
        </div>
      )}

      <Elements stripe={stripePromise} options={options}>
        <PayForm {...props} useSaved={useSaved && !!props.savedCard} />
      </Elements>
    </div>
  );
}

function PayForm({ sessionId, token, amountCents, who, details, useSaved, onBack, onDone }: { sessionId: string; token: string; amountCents: number; who: string; details: Details; useSaved: boolean; onBack: () => void; onDone: (d: Done) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const fail = (m: string) => { setError(m); setBusy(false); };

  async function confirm(shoutId: string) {
    const r = await fetch("/api/shout/confirm", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ shoutId }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return fail(d.error ?? "Something went wrong. Please try again.");
    onDone(d);
  }

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    if (!useSaved) {
      const { error: detailsError } = await elements.submit();
      if (detailsError) return fail(detailsError.message ?? "Check your card details and try again.");
    }
    const r = await fetch("/api/shout", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sessionId, ...details, useSavedCard: useSaved }),
    });
    const started = await r.json().catch(() => ({}));
    if (!r.ok) return fail(started.error ?? "Couldn’t start your shout. Please try again.");
    if (started.amountCents !== amountCents) {
      // The price moved while they were deciding. It's only ever lower or the same as what was shown.
      if (!useSaved) {
        elements.update({ amount: started.amountCents });
        const { error: againError } = await elements.submit();
        if (againError) return fail(againError.message ?? "Check your card details and try again.");
      }
    }

    const returnUrl = `${window.location.origin}/sessions/${sessionId}/shout?shout=${started.shoutId}`;
    if (useSaved) {
      if (started.status === "requires_action") {
        const { error: actionError } = await (stripe as StripeJs).handleNextAction({ clientSecret: started.clientSecret });
        if (actionError) return fail(actionError.message ?? "Your bank didn’t approve that. Try another card.");
      } else if (started.status !== "succeeded") {
        return fail("That card didn’t go through. Try a new card.");
      }
    } else {
      const { error: payError } = await stripe.confirmPayment({ elements, clientSecret: started.clientSecret, redirect: "if_required", confirmParams: { return_url: returnUrl } });
      if (payError) return fail(payError.message ?? "That card didn’t go through. Please try again, or use a different card.");
    }
    await confirm(started.shoutId);
  }

  return (
    <form onSubmit={pay} className="flex flex-col gap-3">
      {!useSaved && <PaymentElement options={{ layout: "tabs", terms: { card: "never" } }} onReady={() => setReady(true)} />}
      <p className="m-0 text-[13px] leading-normal" style={{ color: "rgba(20,17,15,.6)" }}>
        You&rsquo;re paying for one place for {who}, charged now. <NewTabLink href={CANCELLATION_POLICY_HREF}>Cancellation policy</NewTabLink>
      </p>
      {error && <p className="m-0 text-sm font-semibold" role="alert" style={{ color: "#C6362E" }}>{error}</p>}
      <button type="submit" disabled={busy || !stripe || (!useSaved && !ready)} className={button} style={{ background: INK, color: YELLOW }}>
        {busy ? "Shouting…" : `Shout ${who} a place · ${money(amountCents)}`}
      </button>
      <button type="button" onClick={onBack} disabled={busy} className="self-center font-bold text-sm underline underline-offset-2">Back</button>
    </form>
  );
}
