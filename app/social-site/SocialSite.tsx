"use client";

// stretchy.social — the one-page site, its four forms, the thank-you screens
// (with the optional "Help shape Stretchy Social" questions) and the terms page.
// Built from the Claude Design handover "Stretchy Social.dc.html" (Oct 2026):
// same sections, copy, colours and breakpoints. Views switch on the URL hash
// (#form-waitlist, #thanks-beta, #terms…) like the design, so every state can
// be linked to and the back button works.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  TYPES, LEAD_TYPES, GROUPS, COUNTRIES, CURRENCY_FOR, SIZES, STARTS, BRINGS, STEP2_A, STEP2_B,
  SPEND_KEYS, spendLabel, validateStep1, type LeadType, type Currency,
} from "@/lib/socialLeads";

const INK = "#16110F";
const CREAM = "#F7F1EA";
const P = "#8E2F8C";
const YELLOW = "#FDB913";
const SKY = "#29A9E1";
const BLUE = "#0000F5";
const ORANGE = "#E8650A";
const RUST = "#B4500A";
const OLIVE = "#6F6E3A";
const SAND = "#E5D7C5";
const MARK = "/social/stretchy-s-ink.png";
const POT = 319.5; // Stretchy Yoga's Herne Bay session: costs + fair pay, shared
const DISPLAY = "'BN Chubb', sans-serif";
const MONO = "var(--font-space-mono), 'Space Mono', monospace";
const SY = "https://www.stretchyyoga.co.nz";
const SD = "https://www.studiodawn.org/";
const IG = "https://www.instagram.com/stretchy.yoga/";

type View = "page" | "form" | "thanks" | "terms";
type Form = { name: string; email: string; org: string; group: string; region: string; country: string; size: string; start: string; brings: string[]; about: string; message: string; optin: boolean; hp: string };
const EMPTY: Form = { name: "", email: "", org: "", group: "", region: "", country: "", size: "", start: "", brings: [], about: "", message: "", optin: false, hp: "" };

// Count a click for analytics, if Vercel Analytics is on the page. Never required.
function track(event: string, props?: Record<string, string>) {
  try {
    (window as unknown as { va?: (...a: unknown[]) => void }).va?.("event", { name: event, data: props });
  } catch { /* analytics is optional */ }
}

// ── Little building blocks ─────────────────────────────────────────────────
const mono = (size = 12, extra: React.CSSProperties = {}): React.CSSProperties => ({ fontFamily: MONO, fontSize: size, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", ...extra });
const h2: React.CSSProperties = { margin: 0, fontFamily: DISPLAY, fontWeight: 400, fontSize: "clamp(23px,4.05vw,60px)", lineHeight: 0.95, textTransform: "uppercase", overflowWrap: "break-word", maxWidth: "100%" } as React.CSSProperties;
const bodyText: React.CSSProperties = { margin: 0, fontSize: "clamp(12.5px,1.01vw,14px)", lineHeight: 1.55, textWrap: "pretty" } as React.CSSProperties;
const section = (extra: React.CSSProperties = {}): React.CSSProperties => ({ padding: "clamp(44px,8vw,112px) clamp(16px,2.5vw,40px)", borderBottom: `2px solid ${INK}`, ...extra });
const wrap: React.CSSProperties = { maxWidth: 1360, margin: "0 auto" };

function OutlineButton({ children, onClick, style, light }: { children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties; light?: boolean }) {
  const [hover, setHover] = useState(false);
  const fg = light ? CREAM : INK;
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ height: "clamp(38.5px,3.43vw,46px)", padding: "0 clamp(16px,1.8vw,24px)", borderRadius: 999, border: `2.25px solid ${fg}`, background: hover ? fg : "transparent", color: hover ? (light ? INK : CREAM) : fg, fontWeight: 600, fontSize: "clamp(12.5px,1.01vw,14px)", cursor: "pointer", ...style }}
    >
      {children}
    </button>
  );
}

function Mask({ color, style }: { color: string; style: React.CSSProperties }) {
  return <div aria-hidden="true" style={{ background: color, WebkitMask: `url(${MARK}) center/contain no-repeat`, mask: `url(${MARK}) center/contain no-repeat`, ...style }} />;
}

function Dots({ count, filled, dark, gap = 2 }: { count: number; filled: number; dark?: boolean; gap?: number }) {
  return (
    <div style={{ display: "flex", gap, alignItems: "center" }}>
      {Array.from({ length: count }, (_, i) => {
        const d = dark
          ? (i < filled ? { bg: CREAM, bd: CREAM } : { bg: "transparent", bd: "rgba(247,241,234,.45)" })
          : (i < filled ? { bg: P, bd: P } : i < 14 ? { bg: SAND, bd: SAND } : { bg: "transparent", bd: "#C9B9A4" });
        return <span key={i} style={{ flex: 1, aspectRatio: "1", borderRadius: 999, background: d.bg, border: `1px solid ${d.bd}` }} />;
      })}
    </div>
  );
}

function Chip({ label, on, onClick, small }: { label: string; on: boolean; onClick: () => void; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      style={small
        ? { minHeight: 30, padding: "4px 11px", borderRadius: 999, border: `1.5px solid ${INK}`, background: on ? INK : "transparent", color: on ? CREAM : INK, fontWeight: 500, fontSize: 11, lineHeight: 1.2, cursor: "pointer" }
        : { minHeight: 40, padding: "7px 14px", borderRadius: 999, border: `2.25px solid ${INK}`, background: on ? INK : "transparent", color: on ? CREAM : INK, fontWeight: 600, fontSize: 11.5, lineHeight: 1.2, cursor: "pointer" }}
    >
      {label}
    </button>
  );
}

// ── Content ────────────────────────────────────────────────────────────────
const BUILD = [
  { c: P, t: "People-powered Pricing engine", d: "The price responds as people join, built around your goals." },
  { c: BLUE, t: "Events, bookings & payments", d: "Scheduling, place-holding and payment in one spot." },
  { c: ORANGE, t: "Go / no-go built in", d: "If it doesn’t make sense to run, nobody’s charged." },
  { c: SKY, t: "Pay per event or subscribe", d: "Shaped to how your organisation runs." },
  { c: YELLOW, t: "Goals people can see", d: "Revenue and fundraising goals that fill up together." },
  { c: OLIVE, t: "Community-first tools", d: "For the hosts and helpers who keep a group together." },
  { c: P, t: "White-labelled alternative", d: "To ClassPass, Momence and Eventbrite. Your brand, your community, your data." },
  { c: BLUE, t: "Integrations & connections", d: "Plugs into what you already use: Stripe, Google Calendar, Resend for CRM and more." },
];
const WHO_ONGOING = [
  { n: "01", tag: "Community clubs", c: YELLOW, fg: INK, t: "Community clubs", d: "Bring people together around a shared interest, with a model designed to support your costs and revenue goals.", eg: "Book clubs, social sports, craft nights and membership-based communities." },
  { n: "02", tag: "Movement communities", c: SKY, fg: INK, t: "Movement communities", d: "Create experiences that extend beyond the activity itself, with simpler ways to organise and manage participation.", eg: "Run clubs, meditation meetups, pilates pop-ups." },
  { n: "03", tag: "Studios", c: BLUE, fg: CREAM, t: "Movement and wellbeing studios", d: "For those wanting to bring the world some good, while covering their base costs. No third-party class marketplace needed.", eg: "Community classes, outdoor sessions, off-peak timetable slots." },
];
const WHO_ONEOFF = [
  { n: "04", tag: "Good causes", c: P, fg: CREAM, t: "Charities and fundraisers", d: "Bring people together around a shared cause and a fundraising goal everyone can see.", eg: "Set a $1,000 charity goal and split it between everyone who comes to the picnic." },
  { n: "05", tag: "Public or private", c: ORANGE, fg: INK, t: "Public or private events", d: "Share the cost fairly, so the more who come, the less everyone pays.", eg: "A private line-dancing party or a bachelorette, split by those attending." },
  { n: "06", tag: "Event organisers", c: OLIVE, fg: CREAM, t: "Event organisers", d: "Manage scheduling, bookings and payments without committing to a costly, ongoing platform.", eg: "Workshops, gigs, supper clubs and pop-up markets." },
];
const PLANS = [
  { k: "Per event", c: YELLOW, t: "Event licence", d: "Pay for the events you run. Ideal for one-offs, fundraisers and seasonal series.", best: "Best for one-off, casual events" },
  { k: "Membership", c: SKY, t: "Host membership", d: "For regular hosts running a handful of sessions a month, with the core tools included.", best: "Best for clubs and communities" },
  { k: "Subscription", c: P, t: "Ongoing platform", d: "White-labelled under your brand, with integrations and support, for studios and organisations running weekly sessions.", best: "Best for studios and organisations" },
];

// ── The page ───────────────────────────────────────────────────────────────
export default function SocialSite() {
  const [view, setView] = useState<View>("page");
  const [type, setType] = useState<LeadType>("waitlist");
  const [f, setF] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [lastCountry, setLastCountry] = useState("");
  const [s2, setS2] = useState<Record<string, string | string[] | undefined>>({});
  const [s2state, setS2state] = useState<"open" | "sent" | "skipped">("open");
  const [n, setN] = useState(10);
  const [w, setW] = useState(1440);
  const [menu, setMenu] = useState(false);

  const top = () => window.scrollTo(0, 0);
  const go = useCallback((hash: string) => {
    if (location.hash !== hash) history.pushState(null, "", hash || location.pathname);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }, []);

  useEffect(() => {
    const onR = () => setW(window.innerWidth);
    const onH = () => {
      const h = location.hash;
      if (h === "#terms") { setView("terms"); top(); return; }
      const m = h.slice(1).match(/^(form|thanks)-(waitlist|beta|talk|invest)$/);
      if (m) {
        setType(m[2] as LeadType);
        setView(m[1] as View);
        top();
        return;
      }
      setView("page");
    };
    onR();
    onH();
    window.addEventListener("resize", onR);
    window.addEventListener("hashchange", onH);
    window.addEventListener("popstate", onH);
    return () => { window.removeEventListener("resize", onR); window.removeEventListener("hashchange", onH); window.removeEventListener("popstate", onH); };
  }, []);

  const open = (t: LeadType) => () => { track("cta_click", { form: t }); setErrors({}); setSendError(null); go(`#form-${t}`); };
  const goHome = () => { history.pushState(null, "", location.pathname); setView("page"); top(); };
  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setMenu(false);
    if (view !== "page") { history.pushState(null, "", location.pathname); setView("page"); }
    setTimeout(() => { const el = document.getElementById(id); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72, behavior: "smooth" }); }, 0);
  };

  const wide = w >= 1100;
  const narrow = w < 700;
  const t = TYPES[type];
  const on = n >= 14;
  const statusShort = n >= 30 ? "Full room" : on ? "It’s on" : `${14 - n} more to go ahead`;
  const priceText = `$${(POT / Math.max(n, 14)).toFixed(2)}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validateStep1(f);
    setErrors(errs);
    if (Object.keys(errs).length) { top(); return; }
    setSending(true);
    setSendError(null);
    const res = await fetch("/api/social-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, ...f, source: typeof document !== "undefined" && document.referrer ? `stretchy.social (from ${new URL(document.referrer).hostname})` : "stretchy.social" }),
    }).catch(() => null);
    const d = res ? await res.json().catch(() => ({})) : {};
    setSending(false);
    if (!res || !res.ok) {
      if (d.errors) setErrors(d.errors);
      setSendError(d.error ?? "Couldn’t send that just now. Please try again.");
      return;
    }
    track("form_submit", { form: type });
    setLeadId(d.id ?? null);
    setLastCountry(f.country);
    setF(EMPTY);
    setS2({});
    setS2state("open");
    go(`#thanks-${type}`);
  }

  // Step 2: currency defaults from the country; spend is saved as a range key + currency.
  const cur: Currency = (s2.currency as Currency) || CURRENCY_FOR[lastCountry] || "NZD";
  async function sendStep2() {
    setS2state("sent");
    if (!leadId) return;
    track("step2_submit", { form: type });
    await fetch(`/api/social-lead/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...s2, currency: cur }),
    }).catch(() => {});
  }
  const pickS2 = (k: string, key: string, multi?: boolean) => setS2((st) => {
    const prev = st[k];
    if (multi) {
      const list = (prev as string[] | undefined) ?? [];
      return { ...st, [k]: list.includes(key) ? list.filter((x) => x !== key) : [...list, key] };
    }
    return { ...st, [k]: prev === key && k !== "currency" ? undefined : key };
  });
  const s2Questions = useMemo(() => STEP2_A.filter((q) => q.skipFor !== type), [type]);

  const errorCount = Object.values(errors).filter(Boolean).length;
  const field = (bad?: boolean): React.CSSProperties => ({ height: 56, padding: "0 18px", borderRadius: 16, border: `2px solid ${bad ? "#B3261E" : INK}`, background: "#FFFBF6", color: INK, fontSize: 16, outline: "none", width: "100%" });
  const label: React.CSSProperties = mono(10.5, { letterSpacing: ".12em" });

  return (
    <div style={{ fontFamily: "var(--font-bricolage), 'Bricolage Grotesque', system-ui, sans-serif", color: INK, background: CREAM, minHeight: "100%" }}>
      {/* ── Header ── */}
      <header style={{ position: "sticky", top: 0, zIndex: 20, background: CREAM, borderBottom: `2px solid ${INK}` }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "14px clamp(16px,2.5vw,40px)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "clamp(10px,2vw,24px)" }}>
          <a href="#top" onClick={(e) => { e.preventDefault(); goHome(); }} style={{ display: "flex", alignItems: "center", gap: "clamp(8px,1.4vw,12px)", textDecoration: "none", color: INK, minWidth: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MARK} alt="" style={{ height: "clamp(36px,6.16vw,36px)", width: "auto", display: "block", flex: "none" }} />
            <span style={{ fontFamily: DISPLAY, fontSize: "clamp(12.5px,3.17vw,23px)", lineHeight: 0.95, letterSpacing: ".01em", display: "flex", flexWrap: "wrap", columnGap: ".3em", minWidth: 0 }}><span>STRETCHY</span><span>SOCIAL</span></span>
          </a>
          {wide && (
            <nav style={{ display: "flex", gap: 28, ...mono(10.5) }}>
              {[["building", "What we're building"], ["what", "How it works"], ["who", "Who it's for"], ["pricing", "Pricing"], ["shape", "Get involved"]].map(([id, l]) => (
                <a key={id} href={`#${id}`} onClick={scrollTo(id)} style={{ textDecoration: "none", color: INK }}>{l}</a>
              ))}
            </nav>
          )}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flex: "none" }}>
            <OutlineButton onClick={open("waitlist")} style={{ height: "clamp(36px,2.64vw,37px)", padding: "0 clamp(12px,2.6vw,20px)", fontSize: "clamp(11.5px,2.82vw,12.5px)", whiteSpace: "nowrap" }}>Join the waitlist</OutlineButton>
            {!wide && (
              <button onClick={() => setMenu((m) => !m)} aria-label="Menu" aria-expanded={menu} style={{ flex: "none", width: "clamp(36px,2.64vw,37px)", height: "clamp(36px,2.64vw,37px)", borderRadius: 999, border: `2.25px solid ${INK}`, background: menu ? INK : "transparent", color: menu ? CREAM : INK, fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{menu ? "×" : "≡"}</button>
            )}
          </div>
        </div>
        {!wide && menu && (
          <nav style={{ borderTop: `2px solid ${INK}`, display: "flex", flexDirection: "column", padding: "0 clamp(16px,2.5vw,40px)" }}>
            {[["building", "What we're building"], ["what", "How it works"], ["who", "Who it's for"], ["pricing", "Pricing"], ["shape", "Get involved"]].map(([id, l], i, a) => (
              <a key={id} href={`#${id}`} onClick={scrollTo(id)} style={{ textDecoration: "none", color: INK, padding: "18px 0", borderBottom: i < a.length - 1 ? `2px solid ${INK}` : "none", fontFamily: DISPLAY, fontSize: 21, textTransform: "uppercase" }}>{l}</a>
            ))}
          </nav>
        )}
      </header>

      {view === "page" && (
        <main>
          {/* ── Hero ── */}
          <section id="top" style={{ padding: "clamp(28px,6vw,88px) clamp(16px,2.5vw,40px) clamp(40px,7vw,104px)", borderBottom: `2px solid ${INK}`, overflow: "hidden" }}>
            <div style={{ ...wrap, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,520px),1fr))", gap: "clamp(40px,5vw,72px)", alignItems: "center" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
                <div style={mono(11.5)}>The tech behind Stretchy · Tāmaki Makaurau</div>
                <h1 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 400, fontSize: "clamp(28px,4.75vw,74px)", lineHeight: 0.92, textTransform: "uppercase", overflowWrap: "break-word", maxWidth: "100%" } as React.CSSProperties}>People-powered Pricing.</h1>
                <p style={{ margin: 0, fontSize: "clamp(14px,1.45vw,20px)", lineHeight: 1.25, fontWeight: 600, maxWidth: 600 }}>The more who move together, the better for all.</p>
                <p style={{ ...bodyText, maxWidth: 600, fontSize: "clamp(12.5px,1.01vw,15px)" }}>We&rsquo;re building technology to help communities bring people together, make events happen and make participation more accessible. Stretchy Social is the tech and intellectual property behind the Stretchy movement. We&rsquo;re hoping to get People-powered Pricing to more people, in more places. <strong style={{ fontWeight: 700 }}>It is truly a social movement.</strong></p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 4 }}>
                  {(["waitlist", "invest", "talk"] as LeadType[]).map((k) => (
                    <OutlineButton key={k} onClick={open(k)} style={{ flex: narrow ? "1 1 100%" : "0 0 auto" }}>{TYPES[k].label}</OutlineButton>
                  ))}
                </div>
              </div>

              <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 18, padding: "12px 0" }}>
                <Mask color={P} style={{ position: "absolute", top: 0, left: 0, right: 0, margin: "auto", width: "min(100%,600px)", height: "100%" }} />
                <a href={SY} target="_blank" rel="noopener" aria-label="See it live on Stretchy Yoga" style={{ position: "relative", display: "block", width: "min(100%,290px)", aspectRatio: "393/852", border: `3px solid ${INK}`, borderRadius: 54, background: CREAM, overflow: "hidden", textDecoration: "none", color: INK }}>
                  <div style={{ height: "100%", display: "flex", flexDirection: "column", padding: "14px 16px 18px", gap: 12 }}>
                    <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "center", height: 34, padding: "0 14px", fontWeight: 600, fontSize: 12.5 }}>
                      <span>14:29</span>
                      <span style={{ position: "absolute", left: "50%", top: 4, transform: "translateX(-50%)", width: 96, height: 28, borderRadius: 999, background: INK }} />
                      <span style={{ width: 16, height: 10, borderRadius: 2, background: `linear-gradient(90deg,${INK} 70%,transparent 70%)`, border: `1px solid ${INK}` }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 2px 10px", borderBottom: `2px solid ${INK}` }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}><img src={MARK} alt="" style={{ height: 24 }} /><span style={{ fontFamily: DISPLAY, fontSize: 13 }}>STRETCHY</span></span>
                      <span style={{ height: 28, padding: "0 12px", border: `1.5px solid ${INK}`, borderRadius: 999, fontFamily: MONO, fontSize: 9, fontWeight: 700, display: "inline-flex", alignItems: "center" }}>≡ MENU</span>
                    </div>
                    <div style={{ border: `2px solid ${INK}`, borderRadius: 22, overflow: "hidden", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
                      <div style={{ background: SKY, padding: "12px 14px 14px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 14, borderBottom: `2px solid ${INK}`, flex: 1, minHeight: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ background: CREAM, borderRadius: 12, padding: "6px 10px", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
                            <span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: P }}>FRI</span>
                            <span style={{ fontFamily: DISPLAY, fontSize: 19.5 }}>23</span>
                            <span style={{ fontFamily: MONO, fontSize: 9 }}>OCT</span>
                          </div>
                          <span style={{ display: "inline-flex", alignItems: "center", height: 24, padding: "0 10px", borderRadius: 999, background: on ? INK : P, color: CREAM, fontFamily: MONO, fontSize: 9, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>{statusShort}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <span style={mono(9)}>What&rsquo;s on next</span>
                          <span style={{ fontFamily: DISPLAY, fontSize: 24.5, lineHeight: 0.92, textTransform: "uppercase" }}>Move with us.</span>
                        </div>
                      </div>
                      <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                        <span style={{ fontFamily: DISPLAY, fontSize: 16.5, lineHeight: 1, textTransform: "uppercase" }}>Herne Bay | Morning</span>
                        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: ".08em", textTransform: "uppercase" }}>6:15–7:15am · 60 min · all levels</span>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "10px 0", borderTop: `1.5px solid ${SAND}`, borderBottom: `1.5px solid ${SAND}`, fontSize: 10.5 }}>
                          <div style={{ display: "flex", gap: 10 }}><span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: BLUE, width: 64, flex: "none" }}>MOVEMENT</span><span>Vinyasa yoga</span></div>
                          <div style={{ display: "flex", gap: 10 }}><span style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700, color: RUST, width: 64, flex: "none" }}>SOCIAL</span><span>Coffee after · pay your way</span></div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 8 }}>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 24.5, lineHeight: 1 }}>{priceText}</span>
                            <span style={{ fontSize: 9.5, opacity: 0.75 }}>per person · incl. GST</span>
                          </div>
                          <span style={{ height: 36, padding: "0 14px", borderRadius: 999, background: INK, color: CREAM, fontWeight: 600, fontSize: 11.5, display: "inline-flex", alignItems: "center" }}>Hold</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <div style={{ flex: 14 }}><Dots count={14} filled={Math.min(n, 14)} /></div>
                          <span style={{ width: 0, alignSelf: "stretch", borderLeft: `1.5px dashed ${INK}`, margin: "0 2px" }} />
                          <div style={{ flex: 16 }}>
                            <div style={{ display: "flex", gap: 2 }}>
                              {Array.from({ length: 16 }, (_, i) => {
                                const filled = i + 14 < n;
                                return <span key={i} style={{ flex: 1, aspectRatio: "1", borderRadius: 999, background: filled ? P : "transparent", border: `1px solid ${filled ? P : "#C9B9A4"}` }} />;
                              })}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 9, fontWeight: 700 }}><span>$22.82</span><span>$10.65</span></div>
                      </div>
                    </div>
                    <div style={{ alignSelf: "center", width: 120, height: 5, borderRadius: 999, background: INK }} />
                  </div>
                </a>
                <label style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, width: "min(100%,290px)", height: 60, background: CREAM, border: `3px solid ${INK}`, borderRadius: 999, padding: "0 22px" }}>
                  <span style={{ ...mono(9.5, { letterSpacing: ".1em" }), flex: "none", whiteSpace: "nowrap" }}>Try it · {n} in</span>
                  <input type="range" min={6} max={30} step={1} value={n} onChange={(e) => setN(+e.target.value)} aria-label="Number of people" style={{ flex: 1, minWidth: 0, accentColor: P, height: 24, cursor: "pointer" }} />
                </label>
              </div>
            </div>
          </section>

          {/* ── What we're building ── */}
          <section id="building" style={section({ background: CREAM })}>
            <div style={{ ...wrap, display: "flex", flexDirection: "column", gap: "clamp(24px,4vw,56px)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 18, alignItems: "flex-start" }}>
                <span style={{ display: "inline-flex", alignItems: "center", height: 32, padding: "0 14px", borderRadius: 999, background: ORANGE, color: INK, ...mono(9.5, { letterSpacing: ".12em" }) }}>What we&rsquo;re building</span>
                <h2 style={h2}>What if getting more people together made it better for everyone?</h2>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,420px),1fr))", gap: "clamp(20px,4vw,64px)", fontSize: "clamp(12.5px,1.01vw,14px)", lineHeight: 1.55 }}>
                <p style={{ margin: 0, fontWeight: 700 }}><a href={SY} target="_blank" rel="noopener" style={{ color: INK, textDecoration: "underline", textUnderlineOffset: 3 }}>Stretchy Social Yoga Club</a> uses People-powered Pricing to make getting together more accessible. As more people join a session, the price can drop for everyone, helping organisers build attendance, share costs and bring communities together.</p>
                <p style={{ margin: 0 }}>We saw the potential for this model to work beyond our own yoga community. So we&rsquo;re building a flexible, white-label event and payment platform that other businesses and communities can use to bring people together, manage bookings and payments, and create more sustainable events.</p>
              </div>
            </div>
          </section>

          {/* ── How it works ── */}
          <section id="what" style={section()}>
            <div style={{ ...wrap, display: "flex", flexDirection: "column", gap: "clamp(24px,4vw,56px)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={mono(11.5, { color: P })}>How it works · People-powered Pricing</div>
                <h2 style={h2}>Set the goal. People join. Better for all.</h2>
                <p style={{ ...bodyText, maxWidth: 760 }}>One simple flow, from the organiser setting the minimum to everyone sharing the final price. Here&rsquo;s how it runs at Stretchy Yoga.</p>
              </div>
              {narrow && <div style={{ ...mono(10.5, { letterSpacing: ".12em" }), marginBottom: -20 }}>SWIPE THROUGH THE STEPS →</div>}
              <div style={{ display: "grid", gridAutoFlow: "column", gridAutoColumns: narrow ? "86vw" : "minmax(min(82vw,320px),1fr)", gap: narrow ? 12 : 16, alignItems: narrow ? "start" : "stretch", ...(narrow ? {} : { gridTemplateRows: "auto auto", rowGap: 16 }), overflowX: "auto", scrollSnapType: "x mandatory", ...(narrow ? { margin: "0 -16px", padding: "0 16px 8px", scrollPadding: "0 16px" } : { paddingBottom: 8 }), WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
                <StepCard narrow={narrow} bg={YELLOW} fg={INK} step="01 | Before" num="01 / 03" title="Set the goal" lead="Your costs, fair pay for your people, your revenue or fundraising target." body="Set a minimum to go ahead and a maximum to cap the room." foot="You set the minimum">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}><img src={MARK} alt="" style={{ height: 24 }} /><span style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700 }}>HQ</span></span>
                    <span style={{ height: 28, padding: "0 12px", border: `1.5px solid ${INK}`, borderRadius: 999, fontFamily: MONO, fontSize: 9, fontWeight: 700, display: "inline-flex", alignItems: "center" }}>≡ MENU</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 10, borderTop: `2px solid ${INK}` }}>
                    <span style={mono(9, { color: P })}>NEW EVENT</span>
                    <span style={{ fontFamily: DISPLAY, fontSize: 24.5, lineHeight: 0.95, textTransform: "uppercase" }}>Set your goal</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <MiniField label="MIN TO GO AHEAD" value="14" />
                    <MiniField label="MAX" value="30" />
                  </div>
                  <MiniField label="YOUR GOAL" value="Costs + fair pay" />
                  <div style={{ border: `2px solid ${INK}`, borderRadius: 18, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                    <span style={mono(9, { letterSpacing: ".12em" })}>PRICE RANGE</span>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontFamily: MONO, fontWeight: 700 }}><span style={{ fontSize: 19.5 }}>$22.82</span><span style={{ fontSize: 11.5 }}>→</span><span style={{ fontSize: 19.5 }}>$10.65</span></div>
                    <span style={{ fontSize: 10.5, lineHeight: 1.4 }}>The more who join, the lower it goes.</span>
                  </div>
                  {!narrow && <FakeButton>Publish event</FakeButton>}
                </StepCard>

                <StepCard narrow={narrow} bg={SKY} fg={INK} step="02 | Joining" num="02 / 03" title="People join" lead="Enough people, it’s on. Not enough, nobody pays." body="You set the time limits, the rules around payment and make sure your minimums are covered." foot="Nothing charged yet">
                  {!narrow && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={MARK} alt="" style={{ height: 26 }} />
                      <span style={{ width: 34, height: 34, border: `1.5px solid ${INK}`, borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12.5 }}>♡</span>
                    </div>
                  )}
                  <span style={{ fontFamily: DISPLAY, fontSize: 24.5, lineHeight: 0.95, textTransform: "uppercase" }}>Hold your place</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontWeight: 600, fontSize: 11.5 }}>Places</span>
                    <span style={{ display: "flex", gap: 2, border: `2px solid ${INK}`, borderRadius: 999, padding: 2 }}>
                      {[1, 2, 3, 4].map((x) => <span key={x} style={{ width: 28, height: 28, borderRadius: 999, background: x === 1 ? INK : "transparent", color: x === 1 ? CREAM : INK, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10.5 }}>{x}</span>)}
                    </span>
                  </div>
                  <div style={{ border: `2px solid ${INK}`, borderRadius: 18, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                    <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 26.5, lineHeight: 1 }}>$22.82</span>
                    <span style={{ fontSize: 9.5, opacity: 0.75 }}>max per person · incl. GST</span>
                    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 9, fontWeight: 700 }}><span>4 MORE TO GO AHEAD</span><span>30 MAX</span></div>
                    <Dots count={14} filled={10} />
                  </div>
                  <div style={{ display: "flex", gap: 10, padding: "12px 0", borderTop: `2px solid ${INK}`, borderBottom: `2px solid ${INK}` }}>
                    <span style={{ ...mono(9, { letterSpacing: ".08em" }), width: 70, flex: "none" }}>UP TO 36 HRS OUT</span>
                    <span style={{ fontSize: 10.5, lineHeight: 1.4 }}><strong>Free to cancel.</strong> Not enough people? You pay nothing.</span>
                  </div>
                  {!narrow && <FakeButton>Hold my place</FakeButton>}
                </StepCard>

                <StepCard narrow={narrow} bg={P} fg={CREAM} step="03 | On the day" num="03 / 03" title="Better for all" lead="The more who join, the better it is." body="Costs covered, fair profits. Plus, more people means more social, so it’s great for community-based connection events and offerings." foot="Final price, shared">
                  {!narrow && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Mask color={CREAM} style={{ height: 26, aspectRatio: "1787/2084" }} />
                      <span style={{ fontFamily: DISPLAY, fontSize: 15 }}>STRETCHY</span>
                    </div>
                  )}
                  <span style={{ fontFamily: DISPLAY, fontSize: 26.5, lineHeight: 0.95, textTransform: "uppercase" }}>It&rsquo;s on. Your final price.</span>
                  <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.45, fontWeight: 600 }}>22 of us are moving together, so the price dropped for everyone.</p>
                  <div style={{ border: `2px solid ${CREAM}`, borderRadius: 18, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                    <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, lineHeight: 1 }}>$14.52</span>
                    <span style={{ fontSize: 9.5, opacity: 0.85 }}>charged 2 hours out · incl. GST</span>
                    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 9, fontWeight: 700 }}><span>22 IN</span><span>30 MAX</span></div>
                    <Dots count={30} filled={22} dark />
                  </div>
                  <div style={{ border: `2px solid ${CREAM}`, borderRadius: 18, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 4, marginTop: narrow ? 0 : "auto" }}>
                    <span style={mono(9, { letterSpacing: ".1em" })}>GOAL REACHED</span>
                    <span style={{ fontSize: 11.5, lineHeight: 1.4 }}>Costs covered, hosts paid fairly, and the group saved together.</span>
                  </div>
                </StepCard>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={mono(11.5, { color: P })}>The platform</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", borderTop: `2px solid ${INK}` }}>
                  {BUILD.map((b) => (
                    <div key={b.t} style={{ display: "flex", gap: 14, alignItems: "baseline", padding: "18px 8px", borderBottom: `2px solid ${INK}` }}>
                      <span style={{ flex: "none", width: 12, height: 12, borderRadius: 999, background: b.c }} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}><span style={{ fontWeight: 700, fontSize: 14 }}>{b.t}</span><span style={{ fontSize: 12, lineHeight: 1.45, opacity: 0.8 }}>{b.d}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── Who it's for ── */}
          <section id="who" style={section()}>
            <div style={{ ...wrap, display: "flex", flexDirection: "column", gap: "clamp(22px,4vw,48px)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 960 }}>
                <div style={mono(11.5, { color: BLUE })}>Who could it work for?</div>
                <h2 style={{ ...h2, fontSize: "clamp(24.5px,4.75vw,74px)", lineHeight: 0.92 }}>Anyone who brings people together.</h2>
              </div>
              <WhoRow n="01" title="Ongoing sessions" items={WHO_ONGOING} />
              <WhoRow n="02" title="One-off, casual events" items={WHO_ONEOFF} />
            </div>
          </section>

          {/* ── Pricing ── */}
          <section id="pricing" style={section()}>
            <div style={{ ...wrap, display: "flex", flexDirection: "column", gap: "clamp(22px,4vw,48px)" }}>
              {/* Headline runs across the full width, the paragraph sits under it. */}
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={mono(11.5, { color: P })}>Pricing</div>
                <h2 style={{ ...h2, fontSize: "clamp(24.5px,4.75vw,74px)", lineHeight: 0.92 }}>Shaped to how you run.</h2>
                <p style={{ ...bodyText, maxWidth: 760 }}>No costly lock-in membership platform. Pick the model that fits your organisation. Final pricing is being shaped with our beta partners.</p>
              </div>
              <div style={{ border: `2px solid ${INK}`, borderRadius: 26, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", margin: "0 -2px -2px 0" }}>
                  {PLANS.map((pl) => (
                    <div key={pl.t} style={{ display: "flex", flexDirection: "column", gap: 10, padding: "clamp(16px,2vw,28px)", borderRight: `2px solid ${INK}`, borderBottom: `2px solid ${INK}` }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}><span style={{ flex: "none", width: 14, height: 14, borderRadius: 999, background: pl.c }} /><span style={mono(10.5, { letterSpacing: ".12em" })}>{pl.k}</span></div>
                      <h3 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 400, fontSize: "clamp(21px,2.29vw,33.5px)", lineHeight: 0.95, textTransform: "uppercase" }}>{pl.t}</h3>
                      <p style={{ margin: 0, fontSize: "clamp(11.5px,0.88vw,12.5px)", lineHeight: 1.5, flex: 1 }}>{pl.d}</p>
                      <div style={{ paddingTop: 10, borderTop: `1.5px solid ${INK}` }}><span style={{ fontSize: 10.5, opacity: 0.75 }}>{pl.best}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── Case study ── */}
          <section id="case" style={section({ background: CREAM })}>
            {/* The blue box stretches to exactly the height of the copy beside it. */}
            <div style={{ ...wrap, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,480px),1fr))", gap: "clamp(32px,4vw,64px)", alignItems: "stretch" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={mono(11.5, { color: P })}>The case study · Built in Tāmaki Makaurau, made to travel</div>
                <h2 style={{ ...h2, fontSize: "clamp(23px,3.87vw,58px)", lineHeight: 0.94 }}>A labour of love. A real-world case study.</h2>
                <p style={bodyText}><a href={SY} target="_blank" rel="noopener" style={{ fontWeight: 600, color: INK }}>Stretchy Yoga</a> is our labour of love, our community and our case study. It&rsquo;s where the ideas are being put into practice, with real people, real events and a real mission to help people connect through movement.</p>
                <p style={bodyText}>Stretchy Social is the technology and IP behind that work, built by Kimberley Torrie at <a href={SD} target="_blank" rel="noopener" style={{ fontWeight: 600, color: INK }}>Studio Dawn</a> in Tāmaki Makaurau, Aotearoa New Zealand. A local labour of love with room to move.</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
                  <PillLink href={SY} filled>See Stretchy Yoga ↗</PillLink>
                  <PillLink href={SD}>Studio Dawn ↗</PillLink>
                  <PillLink href={IG}>@stretchy.yoga</PillLink>
                </div>
              </div>
              <div style={{ background: BLUE, color: CREAM, borderRadius: 30, padding: 10, maxWidth: 400, width: "100%", justifySelf: "center", display: "flex", minHeight: 360 }}>
                <div style={{ border: `2px solid ${CREAM}`, borderRadius: 26, display: "flex", flexDirection: "column", flex: 1 }}>
                  <div style={{ padding: "16px 22px", borderBottom: `2px solid ${CREAM}`, display: "flex", justifyContent: "space-between", ...mono(10.5, { letterSpacing: ".12em" }) }}><span>An experiment in</span><span>Est. 2024</span></div>
                  <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, overflow: "hidden" }}>
                    <Mask color={P} style={{ position: "absolute", inset: "8% 10%" }} />
                    <span style={{ position: "relative", fontFamily: DISPLAY, fontSize: "clamp(22px,2.6vw,38px)", lineHeight: 0.95, textTransform: "uppercase", textAlign: "center" }}>Purpose, people &amp; profit, in equal measure.</span>
                  </div>
                  <div style={{ padding: "14px 22px", borderTop: `2px solid ${CREAM}`, display: "flex", justifyContent: "space-between", ...mono(9.5, { letterSpacing: ".12em" }) }}><span>Because they can work together</span><span>→</span></div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Get involved ── */}
          <section id="shape" style={{ padding: "clamp(44px,8vw,112px) clamp(16px,2.5vw,40px)" }}>
            <div style={{ ...wrap, display: "flex", flexDirection: "column", gap: "clamp(22px,4vw,48px)" }}>
              {/* Headline runs across the full width, the paragraph sits under it. */}
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div style={mono(11.5, { color: RUST })}>Get involved</div>
                <h2 style={{ ...h2, fontSize: "clamp(24.5px,4.75vw,74px)", lineHeight: 0.92 }}>Help shape what comes next.</h2>
                <p style={{ ...bodyText, maxWidth: 760 }}>We&rsquo;re looking to connect with organisations who could use the technology, people who want to test it, collaborators who can help us build it, and investors interested in its potential.</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,300px),1fr))", gap: 16 }}>
                <ShapeCard bg={YELLOW} fg={INK} tag="01 | WAITLIST + BETA" right="EARLY ACCESS" title="JOIN THE WAITLIST" body="Hear about early access first. We'll invite people from the waitlist to beta test." button={{ label: "Join the waitlist", onClick: open("waitlist") }} />
                <ShapeCard bg={P} fg={CREAM} tag="02 | STRETCHY YOGA" right="IN YOUR HOOD" title="STRETCHY YOGA" body="See People-powered Pricing in action. Come to a session, or bring it to your hood with a Stretchy Yoga licence." link={{ label: "Stretchy Yoga ↗", href: SY }} />
                <ShapeCard bg={BLUE} fg={CREAM} tag="03 | INVEST" right="NEXT CHAPTER" title="INVEST IN THE MOVEMENT" body="Start a conversation about backing what comes next." button={{ label: "Chat investment", onClick: open("invest") }} />
                <ShapeCard bg={ORANGE} fg={INK} tag="04 | PARTNER" right="COLLAB" title="PARTNER & COLLAB" body="Got experience, or want to build with us? We'd love to hear from you." button={{ label: "Partner with us", onClick: open("talk") }} />
              </div>
            </div>
          </section>
        </main>
      )}

      {/* ── The form ── */}
      {view === "form" && (
        <main style={{ padding: "clamp(28px,4vw,56px) clamp(16px,2.5vw,40px) clamp(56px,8vw,104px)" }}>
          <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 26 }}>
            <a href="#top" onClick={(e) => { e.preventDefault(); goHome(); }} style={{ fontWeight: 600, fontSize: 13, textDecoration: "underline", textUnderlineOffset: 3, color: INK }}>← Back to Stretchy Social</a>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {LEAD_TYPES.map((k) => (
                <button key={k} type="button" onClick={open(k)} style={{ height: 40, padding: "0 16px", borderRadius: 999, border: 0, background: k === type ? INK : SAND, color: k === type ? CREAM : INK, ...mono(10.5, { letterSpacing: ".1em" }), cursor: "pointer" }}>{TYPES[k].short}</button>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <span style={mono(11.5, { color: t.ink })}>{t.label}</span>
              <h1 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 400, fontSize: "clamp(26.5px,5.28vw,60px)", lineHeight: 0.92, textTransform: "uppercase", overflowWrap: "anywhere" }}>{t.title}</h1>
              <p style={{ ...bodyText, lineHeight: 1.5, opacity: 0.85 }}>{t.sub}</p>
            </div>

            <form onSubmit={submit} noValidate style={{ display: "flex", flexDirection: "column", gap: 20, paddingTop: 24, borderTop: `2px solid ${INK}` }}>
              {(errorCount > 0 || sendError) && (
                <div role="alert" style={{ border: "2px solid #B3261E", borderRadius: 18, padding: "14px 18px", fontWeight: 600, fontSize: 14, color: "#8C1D18", background: "#FBE4DF" }}>
                  {errorCount > 0 ? (errorCount === 1 ? "One thing needs a look before we can send this." : `${errorCount} things need a look before we can send this.`) : sendError}
                </div>
              )}
              <Field label="Your name *" error={errors.name}>
                <input value={f.name} onChange={(e) => { setF({ ...f, name: e.target.value }); setErrors({ ...errors, name: "" }); }} autoComplete="name" style={field(!!errors.name)} />
              </Field>
              <Field label="Email *" error={errors.email}>
                <input type="email" value={f.email} onChange={(e) => { setF({ ...f, email: e.target.value }); setErrors({ ...errors, email: "" }); }} autoComplete="email" style={field(!!errors.email)} />
              </Field>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))", gap: 20 }}>
                <Field label="Organisation or group"><input value={f.org} onChange={(e) => setF({ ...f, org: e.target.value })} autoComplete="organization" style={field()} /></Field>
                <Field label="City or region"><input value={f.region} onChange={(e) => setF({ ...f, region: e.target.value })} style={field()} /></Field>
              </div>
              {type !== "invest" && (
                <Field label="What kind of group?">
                  <select value={f.group} onChange={(e) => setF({ ...f, group: e.target.value })} style={{ ...field(), padding: "0 16px" }}>
                    <option value="">Choose one</option>
                    {GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Country *" error={errors.country}>
                <select value={f.country} onChange={(e) => { setF({ ...f, country: e.target.value }); setErrors({ ...errors, country: "" }); }} style={{ ...field(!!errors.country), padding: "0 16px", height: "clamp(42px,3.52vw,49.5px)" }}>
                  <option value="">Choose one</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              {type === "beta" && (
                <>
                  <ChipGroup title="People per event, roughly">
                    {SIZES.map((z) => <Chip key={z} label={z} on={f.size === z} onClick={() => setF({ ...f, size: f.size === z ? "" : z })} />)}
                  </ChipGroup>
                  <ChipGroup title="When could you start testing?">
                    {STARTS.map((s) => <Chip key={s} label={s} on={f.start === s} onClick={() => setF({ ...f, start: f.start === s ? "" : s })} />)}
                  </ChipGroup>
                </>
              )}
              {type === "talk" && (
                <ChipGroup title="What do you bring?" hint="Pick any">
                  {BRINGS.map((b) => <Chip key={b} label={b} on={f.brings.includes(b)} onClick={() => setF({ ...f, brings: f.brings.includes(b) ? f.brings.filter((x) => x !== b) : [...f.brings, b] })} />)}
                </ChipGroup>
              )}
              {type === "invest" ? (
                <Field label="Tell us about you" note="Just a first conversation. We don’t share amounts, valuations or terms here.">
                  <textarea rows={5} value={f.about} onChange={(e) => setF({ ...f, about: e.target.value })} style={{ ...field(), height: "auto", padding: "16px 18px", lineHeight: 1.45, resize: "vertical", fontSize: 16 }} />
                </Field>
              ) : (
                <Field label={t.msgLabel}>
                  <textarea rows={4} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} style={{ ...field(), height: "auto", padding: "16px 18px", lineHeight: 1.45, resize: "vertical" }} />
                </Field>
              )}
              {/* Honeypot: hidden from people, filled in by bots. */}
              <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.hp} onChange={(e) => setF({ ...f, hp: e.target.value })} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} />
              <label style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer", fontSize: 13, lineHeight: 1.45 }}>
                <input type="checkbox" checked={f.optin} onChange={(e) => setF({ ...f, optin: e.target.checked })} style={{ width: 24, height: 24, margin: 0, flex: "none", accentColor: P }} />
                <span>Send me occasional Stretchy Social updates. Light on the comms, promise. (Optional)</span>
              </label>
              <button type="submit" disabled={sending} style={{ height: 50, width: "100%", borderRadius: 999, border: 0, background: INK, color: CREAM, fontWeight: 600, fontSize: 15, cursor: "pointer", marginTop: 4, opacity: sending ? 0.6 : 1 }}>{sending ? "Sending…" : t.cta}</button>
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, opacity: 0.75 }}>We&rsquo;ll only use your details to reply. <a href="#terms" onClick={(e) => { e.preventDefault(); go("#terms"); }} style={{ color: INK }}>Privacy &amp; terms</a></p>
            </form>
          </div>
        </main>
      )}

      {/* ── Thank you (+ optional step 2) ── */}
      {view === "thanks" && (
        <main style={{ padding: "clamp(28px,4vw,56px) clamp(16px,2.5vw,40px) clamp(56px,8vw,104px)" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", background: t.bg, color: t.fg, borderRadius: 34, padding: 12 }}>
            <div style={{ border: `2px solid ${t.fg}`, borderRadius: 26, display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "16px 22px", borderBottom: `2px solid ${t.fg}`, display: "flex", justifyContent: "space-between", ...mono(10.5, { letterSpacing: ".12em" }) }}><span>{t.label}</span><span>Received</span></div>
              <div style={{ padding: "clamp(24px,5vw,48px) clamp(20px,4vw,40px)", display: "flex", flexDirection: "column", gap: 18 }}>
                <Mask color={t.fg} style={{ height: 64, width: 55, alignSelf: "flex-start" }} />
                <h1 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 400, fontSize: "clamp(26.5px,5.63vw,70.5px)", lineHeight: 0.92, textTransform: "uppercase", overflowWrap: "anywhere" }}>{t.thanksTitle}</h1>
                <p style={{ margin: 0, fontSize: "clamp(15px,1.54vw,18.5px)", lineHeight: 1.3, fontWeight: 600 }}>{t.thanksAccent}</p>
                <p style={{ ...bodyText, maxWidth: 540 }}>{t.thanksBody}</p>
              </div>
              <div style={{ padding: "16px 22px", borderTop: `2px solid ${t.fg}`, display: "flex", flexWrap: "wrap", gap: 10 }}>
                <button onClick={goHome} style={{ flex: "1 1 200px", height: "clamp(37px,3.08vw,42px)", padding: "0 22px", borderRadius: 999, border: `3px solid ${t.fg}`, background: "transparent", color: t.fg, fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>← Back to the page</button>
                <a href={IG} target="_blank" rel="noopener" style={{ flex: "1 1 200px", display: "flex", alignItems: "center", justifyContent: "center", height: "clamp(37px,3.08vw,42px)", padding: "0 22px", borderRadius: 999, background: t.btn, color: t.btnFg, textDecoration: "none", fontWeight: 600, fontSize: 12.5 }}>Follow @stretchy.yoga</a>
              </div>
            </div>
          </div>

          {type !== "invest" && s2state === "open" && leadId && (
            <div style={{ maxWidth: 720, margin: "20px auto 0", border: `2px solid ${INK}`, borderRadius: 26, overflow: "hidden" }}>
              <div style={{ padding: "clamp(18px,3vw,28px) clamp(18px,3vw,28px) 20px", display: "flex", flexDirection: "column", gap: 10 }}>
                <span style={mono(10.5, { letterSpacing: ".12em", color: P })}>Optional · about a minute</span>
                <h2 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 400, fontSize: "clamp(23px,3.17vw,38.5px)", lineHeight: 0.95, textTransform: "uppercase" }}>Help shape Stretchy Social.</h2>
                <p style={{ margin: 0, fontSize: "clamp(12.5px,1.01vw,13px)", lineHeight: 1.5 }}>Tap what fits. Skip anything you like.</p>
              </div>
              {s2Questions.map((q) => (
                <Step2Row key={q.k} title={q.t} multi={q.multi}>
                  {(q.k === "monthly_spend" ? SPEND_KEYS.map((k) => [k, spendLabel(k, cur)] as const) : q.o.map((o) => [o, o] as const)).map(([key, lbl]) => {
                    const val = q.k === "currency" ? cur : s2[q.k];
                    const sel = q.multi ? ((val as string[] | undefined) ?? []).includes(key) : val === key;
                    return <Chip key={key} small label={lbl} on={sel} onClick={() => pickS2(q.k, key, q.multi)} />;
                  })}
                </Step2Row>
              ))}
              <label style={{ padding: "12px clamp(16px,2.6vw,24px)", borderTop: `1.5px solid ${INK}`, display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 12.5 }}>Biggest headache running events right now?</span>
                <input value={(s2.headache as string) ?? ""} onChange={(e) => setS2({ ...s2, headache: e.target.value })} placeholder="One line is plenty" style={{ height: 38, padding: "0 12px", borderRadius: 10, border: `1.5px solid ${INK}`, background: "#FFFBF6", color: INK, fontSize: 16, outline: "none" }} />
              </label>
              {STEP2_B.map((q) => (
                <Step2Row key={q.k} title={q.t}>
                  {q.o.map((o) => <Chip key={o} small label={o} on={s2[q.k] === o} onClick={() => pickS2(q.k, o)} />)}
                </Step2Row>
              ))}
              <div style={{ padding: "16px clamp(18px,3vw,28px)", borderTop: `2px solid ${INK}`, display: "flex", flexWrap: "wrap", gap: 10 }}>
                <button type="button" onClick={sendStep2} style={{ flex: "1 1 200px", height: "clamp(37px,3.08vw,42px)", borderRadius: 999, border: `3px solid ${INK}`, background: INK, color: CREAM, fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>Send my answers</button>
                <button type="button" onClick={() => setS2state("skipped")} style={{ flex: "1 1 200px", height: "clamp(37px,3.08vw,42px)", borderRadius: 999, border: `3px solid ${INK}`, background: "transparent", color: INK, fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>Skip for now</button>
              </div>
            </div>
          )}
          {s2state === "sent" && (
            <div style={{ maxWidth: 720, margin: "20px auto 0", border: `2px solid ${INK}`, borderRadius: 26, padding: "18px clamp(18px,3vw,28px)", display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ flex: "none", width: 14, height: 14, borderRadius: 999, background: P }} />
              <span style={{ fontWeight: 600, fontSize: "clamp(13px,1.14vw,15px)" }}>Thanks, that really helps us shape what we build.</span>
            </div>
          )}
        </main>
      )}

      {/* ── Terms, IP & privacy ── */}
      {view === "terms" && (
        <main id="terms" style={{ padding: "clamp(28px,4vw,56px) clamp(16px,2.5vw,40px) clamp(56px,8vw,104px)" }}>
          <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 26 }}>
            <a href="#top" onClick={(e) => { e.preventDefault(); goHome(); }} style={{ fontWeight: 600, fontSize: 13, textDecoration: "underline", textUnderlineOffset: 3, color: INK }}>← Back to Stretchy Social</a>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <span style={mono(11.5, { color: P })}>Terms</span>
              <h1 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 400, fontSize: "clamp(26.5px,5.28vw,60px)", lineHeight: 0.92, textTransform: "uppercase" }}>Terms, IP &amp; copyright.</h1>
            </div>
            <div style={{ border: `2px solid ${INK}`, borderRadius: 26, overflow: "hidden" }}>
              <TermsBlock dot={P} title="Intellectual property & copyright">
                <p style={termsP}>The concepts, technology, pricing model, systems, language and original materials presented here are proprietary to Stretchy Social and their respective rights holders. Please don&rsquo;t reproduce, copy, adapt or commercialise them without written permission. All rights reserved, subject to applicable law.</p>
                <p style={termsP}>Stretchy Yoga® and Stretching bodies minds &amp; social circles® are registered trade marks.</p>
              </TermsBlock>
              <TermsBlock dot={SKY} title="Privacy">
                <p style={termsP}>When you fill in a form here we collect your name, email, and anything else you choose to tell us (organisation, region, country, your answers). We use it only to reply to you, and to send occasional updates if you tick the box. We don&rsquo;t sell it or share it with anyone else.</p>
                <p style={termsP}>It&rsquo;s stored securely with our database provider (Supabase), which may keep it outside New Zealand, and our email provider (Resend) sends our replies. You can ask to see, correct or delete your details at any time: email <a href="mailto:kimberley@stretchyyoga.co.nz" style={{ color: INK }}>kimberley@stretchyyoga.co.nz</a>. This follows the New Zealand Privacy Act 2020.</p>
              </TermsBlock>
              <TermsBlock dot={YELLOW} title="Early development" last>
                <p style={termsP}>Stretchy Social is in early development. Features described here may change.</p>
              </TermsBlock>
            </div>
          </div>
        </main>
      )}

      {/* ── Footer: compact, two rows ── */}
      <footer style={{ background: INK, color: CREAM, padding: "clamp(28px,4vw,40px) clamp(16px,2.5vw,40px) 20px" }}>
        <div style={{ ...wrap, display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: "16px 32px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Mask color={CREAM} style={{ width: 26, height: 30, flex: "none" }} />
                <span style={{ fontFamily: DISPLAY, fontSize: 22, lineHeight: 1 }}>STRETCHY SOCIAL</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>Built by Kimberley Torrie at <a href={SD} target="_blank" rel="noopener" style={{ color: CREAM }}>Studio Dawn</a>, Tāmaki Makaurau.</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13, lineHeight: 1.5 }}>
              <span style={{ fontWeight: 600 }}>Like our thinking? Let&rsquo;s talk.</span>
              <a href="mailto:kimberley@stretchyyoga.co.nz" style={{ color: CREAM, fontWeight: 600 }}>kimberley@stretchyyoga.co.nz</a>
            </div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", ...mono(10, { letterSpacing: ".1em" }) }}>
              <a href={IG} target="_blank" rel="noopener" style={{ color: CREAM }}>Instagram</a>
              <a href="https://www.tiktok.com/@stretchy.yoga" target="_blank" rel="noopener" style={{ color: CREAM }}>TikTok</a>
              <a href={SY} target="_blank" rel="noopener" style={{ color: CREAM }}>Stretchy Yoga</a>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10, paddingTop: 14, borderTop: "1px solid rgba(247,241,234,.3)", fontFamily: MONO, fontSize: 10, letterSpacing: ".06em" }}>
            <span>© 2026 Studio Dawn · stretchy.social</span>
            <div style={{ display: "flex", gap: 16 }}>
              <a href="#terms" onClick={(e) => { e.preventDefault(); go("#terms"); }} style={{ color: CREAM }}>Privacy</a>
              <a href="#terms" onClick={(e) => { e.preventDefault(); go("#terms"); }} style={{ color: CREAM }}>Terms, IP &amp; copyright</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Pieces used above ──────────────────────────────────────────────────────
const termsP: React.CSSProperties = { margin: 0, fontSize: "clamp(12.5px,1.01vw,13px)", lineHeight: 1.6 };

function TermsBlock({ dot, title, children, last }: { dot: string; title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ padding: "clamp(18px,3vw,28px)", borderBottom: last ? "none" : `2px solid ${INK}`, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}><span style={{ width: 12, height: 12, borderRadius: 999, background: dot }} /><span style={mono(10.5, { letterSpacing: ".12em" })}>{title}</span></div>
      {children}
    </div>
  );
}

function Field({ label, error, note, children }: { label: string; error?: string; note?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <span style={mono(10.5, { letterSpacing: ".12em" })}>{label}</span>
      {children}
      {error && <span style={{ fontSize: 12.5, fontWeight: 600, color: "#B3261E" }}>{error}</span>}
      {note && <span style={{ fontSize: 11.5, lineHeight: 1.45, opacity: 0.75 }}>{note}</span>}
    </label>
  );
}

function ChipGroup({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <span style={mono(10.5, { letterSpacing: ".12em" })}>{title}</span>
        {hint && <span style={{ fontSize: 11.5, opacity: 0.75 }}>{hint}</span>}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{children}</div>
    </div>
  );
}

function Step2Row({ title, multi, children }: { title: string; multi?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ padding: "12px clamp(16px,2.6vw,24px)", borderTop: `1.5px solid ${INK}`, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 12.5 }}>{title}</span>
        <span style={{ flex: "none", ...mono(9.5, { letterSpacing: ".1em" }), opacity: 0.7 }}>{multi ? "Pick any" : "Pick one"}</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{children}</div>
    </div>
  );
}

function MiniField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={mono(9, { letterSpacing: ".1em" })}>{label}</span>
      <span style={{ height: 40, border: `2px solid ${INK}`, borderRadius: 12, display: "flex", alignItems: "center", padding: "0 12px", fontSize: 14 }}>{value}</span>
    </div>
  );
}

function FakeButton({ children }: { children: React.ReactNode }) {
  return <span style={{ height: 44, borderRadius: 999, background: INK, color: CREAM, fontWeight: 600, fontSize: 12.5, display: "flex", alignItems: "center", justifyContent: "center", marginTop: "auto" }}>{children}</span>;
}

function StepCard({ narrow, bg, fg, step, num, title, lead, body, foot, children }: {
  narrow: boolean; bg: string; fg: string; step: string; num: string; title: string; lead: string; body: string; foot: string; children: React.ReactNode;
}) {
  const line = `2px solid ${fg === CREAM ? CREAM : INK}`;
  if (narrow) {
    // Phone: one swipeable card per step, the screen mock inside it.
    return (
      <div style={{ scrollSnapAlign: "start", background: bg, color: fg, borderRadius: 26, padding: 10 }}>
        <div style={{ border: line, borderRadius: 18, display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "10px 14px", borderBottom: line, display: "flex", justifyContent: "space-between", ...mono(9.5, { letterSpacing: ".12em" }) }}><span>{step}</span><span>{num}</span></div>
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 6, borderBottom: line }}>
            <h3 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 400, fontSize: 23, lineHeight: 0.92, textTransform: "uppercase" }}>{title}</h3>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.4, fontWeight: 600 }}>{lead}</p>
          </div>
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
        </div>
      </div>
    );
  }
  // Wider: the step card, with the screen mock in its own card beneath. Both sit
  // straight in the parent's two-row grid, so all three step cards share one
  // height and all three mocks share another, and everything lines up.
  return (
    <>
      <div style={{ background: bg, color: fg, borderRadius: 30, padding: 12, scrollSnapAlign: "start", display: "flex" }}>
        <div style={{ border: line, borderRadius: 22, display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ padding: "16px 20px", borderBottom: line, display: "flex", justifyContent: "space-between", ...mono(10.5, { letterSpacing: ".12em" }) }}><span>{step}</span><span>{num}</span></div>
          <div style={{ padding: "22px 20px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
            <h3 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 400, fontSize: "clamp(23px,2.46vw,37px)", lineHeight: 0.92, textTransform: "uppercase" }}>{title}</h3>
            <p style={{ margin: 0, fontSize: "clamp(12.5px,0.92vw,13px)", lineHeight: 1.45, fontWeight: 600 }}>{lead}</p>
            <p style={{ margin: 0, fontSize: "clamp(11.5px,0.88vw,12.5px)", lineHeight: 1.5 }}>{body}</p>
          </div>
          <div style={{ padding: "14px 20px", borderTop: line, display: "flex", justifyContent: "space-between", ...mono(9.5, { letterSpacing: ".12em" }) }}><span>{foot}</span><span>→</span></div>
        </div>
      </div>
      <div style={{ border: `2px solid ${INK}`, borderRadius: 40, background: bg, color: fg, padding: "20px 18px 24px", display: "flex", flexDirection: "column", gap: 14, minHeight: 500 }}>{children}</div>
    </>
  );
}

function WhoRow({ n, title, items }: { n: string; title: string; items: typeof WHO_ONGOING }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, paddingBottom: 12, borderBottom: `2px solid ${INK}` }}>
        <span style={mono(10.5)}>{n}</span>
        <span style={{ fontFamily: DISPLAY, fontSize: "clamp(19.5px,1.94vw,26.5px)", textTransform: "uppercase" }}>{title}</span>
      </div>
      <div style={{ display: "grid", gridAutoFlow: "column", gridAutoColumns: "minmax(min(82vw,320px),1fr)", gap: 16, alignItems: "stretch", overflowX: "auto", scrollSnapType: "x mandatory", paddingBottom: 8, WebkitOverflowScrolling: "touch" } as React.CSSProperties}>
        {items.map((w) => (
          <div key={w.n} style={{ border: `2px solid ${INK}`, borderRadius: 26, display: "flex", flexDirection: "column", overflow: "hidden", scrollSnapAlign: "start" }}>
            <div style={{ background: w.c, color: w.fg, padding: "14px 20px", borderBottom: `2px solid ${INK}`, display: "flex", justifyContent: "space-between", ...mono(9.5, { letterSpacing: ".12em" }) }}><span>{w.tag}</span><span>{w.n}</span></div>
            <div style={{ padding: "22px 20px 24px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
              <h3 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 400, fontSize: 21, lineHeight: 1, textTransform: "uppercase" }}>{w.t}</h3>
              <p style={{ margin: 0, fontSize: "clamp(11.5px,0.88vw,12.5px)", lineHeight: 1.5 }}>{w.d}</p>
              <p style={{ margin: "auto 0 0", paddingTop: 12, borderTop: `1.5px solid ${INK}`, fontSize: 12, lineHeight: 1.45 }}><strong style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: ".1em" }}>EG.</strong> {w.eg}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PillLink({ href, children, filled }: { href: string; children: React.ReactNode; filled?: boolean }) {
  return (
    <a href={href} target="_blank" rel="noopener" style={{ display: "inline-flex", alignItems: "center", height: "clamp(36px,2.99vw,40.5px)", padding: "0 20px", borderRadius: 999, ...(filled ? { background: INK, color: CREAM } : { border: `3px solid ${INK}`, color: INK }), textDecoration: "none", fontWeight: 600, fontSize: 12.5 }}>
      {children}
    </a>
  );
}

function ShapeCard({ bg, fg, tag, right, title, body, button, link }: {
  bg: string; fg: string; tag: string; right: string; title: string; body: string;
  button?: { label: string; onClick: () => void }; link?: { label: string; href: string };
}) {
  const line = `2px solid ${fg}`;
  const btn: React.CSSProperties = { flex: "1 1 140px", height: "clamp(37px,3.08vw,42px)", padding: "0 16px", borderRadius: 999, border: `2.25px solid ${fg}`, background: "transparent", color: fg, fontWeight: 600, fontSize: 12.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" };
  return (
    <div style={{ background: bg, color: fg, borderRadius: 30, padding: 12 }}>
      <div style={{ border: line, borderRadius: 22, display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ padding: "16px 20px", borderBottom: line, display: "flex", flexWrap: "wrap", columnGap: 12, rowGap: 4, justifyContent: "space-between", fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: ".12em" }}><span>{tag}</span><span>{right}</span></div>
        <div style={{ padding: "24px 20px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
          {/* Sized so the longest word ("MOVEMENT") never splits across lines in a four-across row. */}
          <h3 style={{ margin: 0, fontFamily: DISPLAY, fontWeight: 400, fontSize: "clamp(23px,1.76vw,26.5px)", lineHeight: 0.92, overflowWrap: "break-word" }}>{title}</h3>
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, fontWeight: 500 }}>{body}</p>
        </div>
        <div style={{ padding: "16px 20px", borderTop: line, display: "flex", flexWrap: "wrap", gap: 10 }}>
          {button && <button type="button" onClick={button.onClick} style={btn}>{button.label}</button>}
          {link && <a href={link.href} target="_blank" rel="noopener" style={btn}>{link.label}</a>}
        </div>
      </div>
    </div>
  );
}
