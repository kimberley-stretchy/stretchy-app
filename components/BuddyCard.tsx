"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { HELLO_MAX, HELLO_PROMPTS, NO_CONTACT_DETAILS } from "@/lib/buddyWords";
import { formatDay } from "@/lib/sessionTimes";
import { suburbOf } from "@/lib/sessionDisplay";
import { socialDrink } from "@/lib/shareMessage";

// "Buddy Me Up" on someone's booking page (SOCIAL_BOOKING_BRIEF.md section 6).
// Only the switch shows at first; switching it on reveals the consent line,
// the Say hello box and how matching works, step by step. Hides itself if
// it can't load (not signed in, or no place held).
//
// From the emails: ?buddy=1 opens it, ?buddy=off switches it off.

export type BuddyState = { on: boolean; hello: string; open: boolean; matched: boolean; buddies: { name: string; hello?: string }[] };

const INK = "#14110F";
const GREY = "rgba(20,17,15,.7)";

export default function BuddyCard({
  session,
  goingAhead,
  demo,
}: {
  session: { id: string; starts_at: string; location_address?: string | null; title?: string | null };
  goingAhead: boolean;
  /** Example data for sign-off previews: nothing is loaded or saved. */
  demo?: BuddyState;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<BuddyState | null>(null);
  const [switchOn, setSwitchOn] = useState(false);
  const [hello, setHello] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  // Signed up and not changing their hello: show "Cheers!" and what's next.
  const [editing, setEditing] = useState(false);
  const [justJoined, setJustJoined] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  async function post(body: { on: boolean; hello?: string }, t = token) {
    if (demo) {
      const d = { ...demo, on: body.on, hello: body.on ? (body.hello ?? "").trim() : "" };
      setData(d);
      return d;
    }
    if (!t) return null;
    const res = await fetch("/api/buddy", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
      body: JSON.stringify({ sessionId: session.id, ...body }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setErr(d.error ?? "Couldn’t save that. Try again."); return null; }
    setErr(null);
    setData(d);
    return d as BuddyState;
  }

  useEffect(() => {
    if (demo) { setData(demo); setSwitchOn(demo.on); setHello(demo.hello); return; }
    createClient().auth.getSession().then(async ({ data: { session: auth } }) => {
      if (!auth) return;
      setToken(auth.access_token);
      const d: BuddyState | null = await fetch(`/api/buddy?sessionId=${session.id}`, { headers: { Authorization: `Bearer ${auth.access_token}` }, cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      if (!d) return;
      setData(d);
      setSwitchOn(d.on);
      setHello(d.hello);

      const ask = new URLSearchParams(window.location.search).get("buddy");
      if (ask === "off" && d.on) {
        const after = await post({ on: false }, auth.access_token);
        if (after) { setSwitchOn(false); setMsg("Buddy Me Up is off for this one."); }
      } else if (ask === "1" && d.open) {
        setSwitchOn(true);
        setEditing(true);
      }
      if (ask) setTimeout(() => cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  if (!data) return null;
  // Joining has closed and they never switched it on: nothing to show.
  if (!data.open && !data.on) return null;

  async function toggle() {
    setMsg(null);
    setErr(null);
    setJustJoined(false);
    if (!switchOn) { setSwitchOn(true); setEditing(true); return; }
    setSwitchOn(false);
    if (data?.on) {
      setBusy(true);
      const after = await post({ on: false });
      setBusy(false);
      if (after) setMsg("Buddy Me Up is off for this one.");
      else setSwitchOn(true);
    }
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    const after = await post({ on: true, hello });
    setBusy(false);
    if (!after) return;
    setHello(after.hello);
    setEditing(false);
    setJustJoined(true);
    setTimeout(() => cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
  }

  function addPrompt(p: string) {
    setHello((h) => {
      const next = h.trim() ? `${h.trim()} ${p}` : p;
      return next.slice(0, HELLO_MAX);
    });
  }

  const suburb = suburbOf(session);
  // "coffee" for mornings, "drink" for evenings (the word list's Social Stretch wording).
  const drink = socialDrink(session.starts_at) === "coffee" ? "coffee" : "drink";
  const dayLine = [formatDay(session.starts_at), suburb].filter(Boolean).join(" · ");
  const dirty = hello.trim() !== (data.hello ?? "").trim();

  return (
    <div ref={cardRef} className="border-2 rounded-[22px] p-4 flex flex-col gap-3" style={{ borderColor: INK, background: "#FFFFFF" }}>
      <div>
        <p className="m-0 font-bold text-[15px]">Coming solo, or keen to meet someone new?</p>
        <p className="m-0 mt-1 text-sm" style={{ color: GREY }}>
          Switch on <strong style={{ color: INK }}>Buddy Me Up</strong> and we&rsquo;ll introduce you by email to someone else at this session. Then look out for each other IRL and grab a {drink} together at the Social Stretch.
        </p>
        <p className="m-0 mt-1 text-sm" style={{ color: GREY }}>
          We only share first names and a little hello, nothing else. <strong style={{ color: INK }}>Come solo, leave with a crew.</strong>
        </p>
      </div>

      {data.open && (
        <div className="flex justify-between items-center gap-3 py-1">
          <div>
            <p className="m-0 font-bold text-sm">Buddy Me Up</p>
            <p className="m-0 text-[13px]" style={{ color: GREY }}>{dayLine}</p>
          </div>
          <button
            type="button"
            onClick={toggle}
            disabled={busy}
            className="w-[42px] h-6 rounded-pill relative flex-shrink-0 disabled:opacity-60"
            style={{ background: switchOn ? INK : "rgba(20,17,15,.16)" }}
            role="switch"
            aria-checked={switchOn}
            aria-label="Buddy Me Up"
          >
            <span className="absolute top-0.5 w-5 h-5 rounded-pill transition-all" style={{ left: switchOn ? "20px" : "2px", background: switchOn ? "#FCBB16" : "#FFFFFF" }} />
          </button>
        </div>
      )}

      {data.matched && (
        <div className="flex flex-col gap-2">
          <p className="m-0 font-mono text-[10px] font-extrabold tracking-[0.1em] uppercase">{data.buddies.length > 1 ? "Your buddies" : "Your buddy"}</p>
          {data.buddies.map((b, i) => (
            <div key={i}>
              <p className="m-0 font-bold text-sm">{b.name}</p>
              {b.hello && <p className="m-0 text-sm" style={{ color: GREY }}>&ldquo;{b.hello}&rdquo;</p>}
            </div>
          ))}
          <p className="m-0 text-[13px]" style={{ color: GREY }}>Look out for each other, then grab a {drink} at the Social Stretch.</p>
        </div>
      )}

      {!data.open && data.on && !data.matched && (
        <p className="m-0 text-sm" style={{ color: GREY }}>You&rsquo;re our only buddy-upper this time. We&rsquo;ll pair you up next time.</p>
      )}

      {data.open && switchOn && data.on && !editing && !data.matched && (
        <div className="rounded-2xl p-4 flex flex-col gap-2.5 animate-slide-down motion-reduce:animate-none" style={{ background: "#FCBB16" }} role="status">
          <p className="m-0 font-bold text-[17px]">{justJoined ? "Cheers! You’re buddied up. 🙌" : "You’re buddied up. 🙌"}</p>
          {data.hello && <p className="m-0 text-sm">Your hello: &ldquo;{data.hello}&rdquo;</p>}
          <p className="m-0 font-mono text-[10px] font-extrabold tracking-[0.1em] uppercase mt-1">What happens next</p>
          <div className="flex gap-2.5 items-start text-sm"><span aria-hidden>✉️</span><span><strong>Online:</strong> {goingAhead ? "we’ll match you up shortly" : "36 hrs out we match you up"} and email you your buddy&rsquo;s first name and hello.</span></div>
          <div className="flex gap-2.5 items-start text-sm"><span aria-hidden>👀</span><span><strong>On the day:</strong> look out for each other. Your GEM can help you find them.</span></div>
          <div className="flex gap-2.5 items-start text-sm"><span aria-hidden>☕</span><span><strong>After:</strong> grab a {drink} together at the Social Stretch.</span></div>
          <button type="button" onClick={() => { setEditing(true); setJustJoined(false); }} className="self-start font-bold text-sm underline underline-offset-2 mt-1">{data.hello ? "Change my hello" : "Add a hello"}</button>
        </div>
      )}

      {data.open && switchOn && (!data.on || editing) && (
        <div className="flex flex-col gap-3 animate-slide-down motion-reduce:animate-none">
          <p className="m-0 text-sm" style={{ color: GREY }}>
            Your first name and Say hello line are deleted a week after the session. For over-18s.
          </p>

          <label className="flex flex-col gap-1.5">
            <span className="font-bold text-sm">Say hello <span className="font-normal" style={{ color: GREY }}>(optional)</span></span>
            <textarea
              value={hello}
              onChange={(e) => setHello(e.target.value.slice(0, HELLO_MAX))}
              rows={2}
              maxLength={HELLO_MAX}
              placeholder="Ask me about…"
              className="w-full rounded-xl border-2 px-3 py-2 bg-white"
              style={{ borderColor: INK, fontSize: 16 }}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            {HELLO_PROMPTS.map((p) => (
              <button key={p} type="button" onClick={() => addPrompt(p)} className="rounded-pill px-3 py-1.5 font-bold text-[13px] border-2" style={{ borderColor: INK }}>
                {p}
              </button>
            ))}
          </div>
          <p className="m-0 text-xs flex justify-between gap-3" style={{ color: "rgba(20,17,15,.55)" }}>
            <span>{NO_CONTACT_DETAILS}</span>
            <span className="flex-shrink-0">{hello.length}/{HELLO_MAX}</span>
          </p>

          <p className="m-0 text-sm" style={{ color: GREY }}>
            <strong style={{ color: INK }}>How matching works:</strong> at 36 hrs out we match you up. Usually pairs. Uneven numbers? A few of you go together.
          </p>

          <button type="button" onClick={save} disabled={busy || (data.on && !dirty)} className="rounded-pill px-5 py-3 font-bold text-[15px] disabled:opacity-60" style={{ background: INK, color: "#FCBB16" }}>
            {busy ? "Saving…" : data.on ? "Save my hello" : "Buddy Me Up 👋"}
          </button>
          {data.on && (
            <button type="button" onClick={() => { setHello(data.hello ?? ""); setEditing(false); }} disabled={busy} className="self-center font-bold text-sm underline underline-offset-2">Cancel</button>
          )}
        </div>
      )}

      {err && <p className="m-0 text-sm font-bold" role="alert">{err}</p>}
      {msg && <p className="m-0 text-sm font-bold" role="status">{msg}</p>}
    </div>
  );
}
