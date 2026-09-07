"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import HQShell from "@/components/hq/HQShell";
import { calculatePrice } from "@/lib/pricing";

function nzDateParts(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString("en-CA", { timeZone: "Pacific/Auckland" }),
    time: d.toLocaleTimeString("en-GB", { timeZone: "Pacific/Auckland", hour: "2-digit", minute: "2-digit", hour12: false }),
  };
}

const T = {
  ink: "#14110F",
  cream: "#F7F0E8",
  yellow: "#FCBB16",
  blue: "#0000FF",
  purple: "#902F8A",
  orange: "#E96709",
  mono: "'JetBrains Mono', monospace",
};

const MOVEMENT_TYPES = ["yoga", "pilates", "breath", "sound", "flow", "run", "hiit"];
const CURRENCIES = ["NZD", "AUD", "GBP", "USD"];
const REPEAT_OPTIONS = ["Daily", "Weekly", "Fortnightly", "Monthly", "Quarterly"];

type Person = { id: string; name: string };

export default function BuildAStretchyPage() {
  return (
    <Suspense fallback={<HQShell><main style={{ background: "#14110F", minHeight: "100vh" }} /></HQShell>}>
      <BuildAStretchyForm />
    </Suspense>
  );
}

function BuildAStretchyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateId = searchParams.get("duplicate");
  const [teachers, setTeachers] = useState<Person[]>([]);
  const [gems, setGems] = useState<Person[]>([]);
  const [saving, setSaving] = useState<"publish" | "draft" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingDuplicate, setLoadingDuplicate] = useState(!!duplicateId);

  useEffect(() => {
    fetch("/api/admin/people").then((r) => r.json()).then((d) => { setTeachers(d.teachers ?? []); setGems(d.gems ?? []); }).catch(() => {});
  }, []);

  const [neighbourhood, setNeighbourhood] = useState("Herne Bay");
  const [timeOfDay, setTimeOfDay] = useState("Morning");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [durationMins, setDurationMins] = useState(60);
  const [movementType, setMovementType] = useState("yoga");
  const [movementStyle, setMovementStyle] = useState("Vinyasa · all levels");

  const [teacherId, setTeacherId] = useState("");
  const [teacherRate, setTeacherRate] = useState(120);
  const [venueName, setVenueName] = useState("Bayfield School Hall");
  const [venueAddress, setVenueAddress] = useState("");
  const [gettingThere, setGettingThere] = useState("");
  const [venueRate, setVenueRate] = useState(69.75);
  const [socialVenue, setSocialVenue] = useState("Honey Sundays · café");
  const [socialNote, setSocialNote] = useState("3 min walk · pay your own");
  const [gemId, setGemId] = useState("");
  const [gemRate, setGemRate] = useState(18);
  const [charityName, setCharityName] = useState("Stretchy Donation");
  const [charityRate, setCharityRate] = useState(10);
  const [extraLines, setExtraLines] = useState<{ name: string; amount: number }[]>([]);

  const [currency, setCurrency] = useState("NZD");
  const [minMats, setMinMats] = useState(14);
  const [maxMats, setMaxMats] = useState(32);
  const [stretchyAmount, setStretchyAmount] = useState(200);
  const [simulateN, setSimulateN] = useState(18);

  const [isRepeat, setIsRepeat] = useState(false);
  const [repeatFrequency, setRepeatFrequency] = useState("Weekly");

  useEffect(() => {
    if (!duplicateId) return;
    fetch(`/api/admin/sessions?id=${duplicateId}`)
      .then((r) => r.json())
      .then((rows) => {
        const s = Array.isArray(rows) ? rows[0] : rows;
        if (!s) return;

        const [nb, tod] = (s.title ?? "").split("|").map((p: string) => p.trim());
        setNeighbourhood(nb || s.title || "");
        setTimeOfDay(tod || "");
        const { date: d, time: t } = nzDateParts(s.starts_at);
        setDate(d);
        setTime(t);
        setDurationMins(s.duration_mins ?? 60);
        setMovementType(s.movement_type ?? "yoga");
        setMovementStyle(s.description ?? "");
        setVenueName(s.location_name ?? "");
        setVenueAddress(s.location_address ?? "");
        setGettingThere(s.getting_there ?? "");
        setSocialVenue(s.social_stretch_venue ?? "");
        setSocialNote(s.social_stretch_note ?? "");
        setCurrency(s.currency ?? "NZD");
        setMinMats(s.min_attendees ?? 14);
        setMaxMats(s.max_attendees ?? 32);
        setTeacherId(s.host_id ?? "");
        setGemId(s.gem_host_id ?? "");
        setIsRepeat(!!s.is_repeat);
        if (s.repeat_frequency) setRepeatFrequency(s.repeat_frequency);

        const lines: { role: string; name: string; amount: number }[] = Array.isArray(s.cost_lines) ? s.cost_lines : [];
        const teacherLine = lines.find((l) => l.role === "Teacher");
        const venueLine = lines.find((l) => l.role === "Venue");
        const gemLine = lines.find((l) => l.role === "GEM");
        const charityLine = lines.find((l) => l.role === "Charity");
        const otherLines = lines.filter((l) => !["Teacher", "Venue", "GEM", "Charity"].includes(l.role));
        if (teacherLine) setTeacherRate(teacherLine.amount);
        if (venueLine) setVenueRate(venueLine.amount);
        if (gemLine) setGemRate(gemLine.amount);
        if (charityLine) { setCharityName(charityLine.name); setCharityRate(charityLine.amount); }
        if (otherLines.length) setExtraLines(otherLines.map((l) => ({ name: l.name, amount: l.amount })));

        if (s.revenue_target != null) setStretchyAmount(s.revenue_target);
        setLoadingDuplicate(false);
      })
      .catch(() => setLoadingDuplicate(false));
  }, [duplicateId]);

  const teacherName = teachers.find((t) => t.id === teacherId)?.name ?? "";
  const gemName = gems.find((g) => g.id === gemId)?.name ?? "";

  const costLines = useMemo(
    () => [
      { role: "Teacher", name: teacherName || "Teacher (unassigned)", amount: teacherRate },
      { role: "Venue", name: venueName || "Venue", amount: venueRate },
      { role: "GEM", name: gemName || "GEM (unassigned)", amount: gemRate },
      { role: "Charity", name: charityName || "Charity", amount: charityRate },
      ...extraLines.map((l) => ({ role: "Other", name: l.name || "Cost line", amount: l.amount })),
    ],
    [teacherName, teacherRate, venueName, venueRate, gemName, gemRate, charityName, charityRate, extraLines]
  );

  const costBase = costLines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const revenueTarget = stretchyAmount;
  const openingPriceCap = calculatePrice(costBase, revenueTarget, minMats);
  const floorPrice = calculatePrice(costBase, revenueTarget, maxMats);
  const effectiveN = Math.min(Math.max(simulateN, minMats), maxMats);
  const previewPrice = calculatePrice(costBase, revenueTarget, effectiveN);
  const nextPrice = calculatePrice(costBase, revenueTarget, Math.min(effectiveN + 1, maxMats));
  const spotsToGoAhead = Math.max(0, minMats - simulateN);
  const spotsLeft = Math.max(0, maxMats - simulateN);
  const goingAhead = simulateN >= minMats;
  const title = `${neighbourhood} | ${timeOfDay}`;

  async function submit(mode: "publish" | "draft") {
    if (!neighbourhood || !date || !venueName) {
      setError("Neighbourhood, date, and venue are required.");
      return;
    }
    setError(null);
    setSaving(mode);
    try {
      const res = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: movementStyle,
          movement_type: movementType,
          starts_at: `${date}T${time}:00+12:00`,
          duration_mins: durationMins,
          location_name: venueName,
          location_address: venueAddress,
          getting_there: gettingThere,
          revenue_target: revenueTarget,
          currency,
          min_attendees: minMats,
          max_attendees: maxMats,
          social_stretch_venue: socialVenue,
          social_stretch_note: socialNote,
          cost_lines: costLines,
          host_id: teacherId || undefined,
          gem_host_id: gemId || undefined,
          is_draft: mode === "draft",
          is_repeat: isRepeat,
          repeat_frequency: isRepeat ? repeatFrequency : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save this session");
      router.push("/admin/sessions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSaving(null);
    }
  }

  return (
    <HQShell>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        {/* Center form */}
        <div style={{ flex: 1, background: T.cream, padding: "28px 36px 80px", minWidth: 0 }}>
          <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: T.purple, marginBottom: 6 }}>
            SESSIONS / {duplicateId ? "DUPLICATE" : "NEW"}
          </p>
          <h1 style={{ fontFamily: "'BN Chubb', 'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 40, letterSpacing: "-0.02em", lineHeight: 1, textTransform: "uppercase", color: T.ink, marginBottom: 24 }}>
            {loadingDuplicate ? "Loading…" : "Build a Stretchy"}
          </h1>

          <Section label="THE BASICS">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Pill value={neighbourhood} onChange={setNeighbourhood} placeholder="Neighbourhood" />
              <Pill value={timeOfDay} onChange={setTimeOfDay} placeholder="Morning / Evening" />
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={pillStyle} />
              <div style={{ display: "flex", gap: 6 }}>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} style={{ ...pillStyle, flex: 1 }} />
                <select value={durationMins} onChange={(e) => setDurationMins(Number(e.target.value))} style={{ ...pillStyle, flex: 1 }}>
                  {[30, 45, 60, 75, 90, 120].map((m) => <option key={m} value={m}>{m} min</option>)}
                </select>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "rgba(20,17,15,.5)", marginTop: 8 }}>
              Name renders as <strong>{title.toUpperCase()}</strong> everywhere.
            </p>

            <div style={{ marginTop: 14 }}>
              <button
                type="button"
                onClick={() => setIsRepeat((v) => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "10px 14px", borderRadius: 999, border: `2px solid ${T.ink}`, cursor: "pointer",
                  background: isRepeat ? T.ink : "transparent", color: isRepeat ? T.cream : T.ink,
                }}
              >
                <span
                  style={{
                    width: 34, height: 20, borderRadius: 999, flexShrink: 0, position: "relative",
                    background: isRepeat ? T.yellow : "rgba(20,17,15,.15)", transition: "background .15s",
                  }}
                >
                  <span style={{
                    position: "absolute", top: 2, left: isRepeat ? 16 : 2, width: 16, height: 16, borderRadius: "50%",
                    background: isRepeat ? T.ink : "#fff", transition: "left .15s",
                  }} />
                </span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{isRepeat ? "On repeat" : "Make this a repeat"}</span>
              </button>

              {isRepeat && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                  {REPEAT_OPTIONS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setRepeatFrequency(f)}
                      style={{
                        padding: "7px 14px", borderRadius: 999, border: `2px solid ${T.ink}`, cursor: "pointer",
                        background: repeatFrequency === f ? T.ink : "transparent", color: repeatFrequency === f ? T.cream : T.ink,
                        fontSize: 12, fontWeight: 700,
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Section>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <Section label="MOVEMENT" labelColor={T.blue}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <select value={movementType} onChange={(e) => setMovementType(e.target.value)} style={{ ...pillStyle, borderColor: T.blue }}>
                  {MOVEMENT_TYPES.map((m) => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                </select>
                <Pill value={movementStyle} onChange={setMovementStyle} placeholder="Style · level" borderColor={T.blue} />
                <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} style={{ ...pillStyle, borderColor: T.blue }}>
                  <option value="">Pick a teacher…</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </Section>

            <Section label="SOCIAL STRETCH" labelColor={T.orange}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Pill value={socialVenue} onChange={setSocialVenue} placeholder="Venue · style" borderColor={T.orange} />
                <select value={gemId} onChange={(e) => setGemId(e.target.value)} style={{ ...pillStyle, borderColor: T.orange }}>
                  <option value="">Pick a GEM…</option>
                  {gems.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <Pill value={socialNote} onChange={setSocialNote} placeholder="Distance · who pays" borderColor={T.orange} />
              </div>
            </Section>
          </div>

          <Section label="VENUE">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Pill value={venueName} onChange={setVenueName} placeholder="Venue name" />
              <Pill value={venueAddress} onChange={setVenueAddress} placeholder="Address" />
            </div>
            <textarea
              value={gettingThere}
              onChange={(e) => setGettingThere(e.target.value)}
              placeholder="Anything you need to know… directions, parking, props to bring, entry code, anything else worth flagging."
              rows={3}
              style={{ ...pillStyle, borderRadius: 14, marginTop: 10, resize: "vertical", fontFamily: "inherit" }}
            />
          </Section>

          <Section label="RATES & CURRENCY">
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
              {CURRENCIES.map((c) => (
                <button key={c} type="button" onClick={() => setCurrency(c)} style={{
                  padding: "6px 14px", borderRadius: 999, border: `2px solid ${T.ink}`, cursor: "pointer",
                  background: currency === c ? T.ink : "transparent", color: currency === c ? T.cream : T.ink,
                  fontFamily: T.mono, fontSize: 11, fontWeight: 700,
                }}>{c}</button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "rgba(20,17,15,.5)", marginBottom: 12 }}>
              These are hard costs — what you&rsquo;re actually paying out. Includes GST (15%, NZD).
            </p>

            <div style={{ border: `2px solid ${T.ink}`, borderRadius: 12, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", padding: "8px 14px", background: T.ink }}>
                {["RATE", "AMOUNT"].map((h) => (
                  <span key={h} style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 800, color: "rgba(247,240,232,.6)", letterSpacing: "0.08em" }}>{h}</span>
                ))}
              </div>

              <RateRow label="Teacher" value={teacherRate} onChange={setTeacherRate} />
              <RateRow label="Venue" value={venueRate} onChange={setVenueRate} />
              <RateRow label="GEM" value={gemRate} onChange={setGemRate} />
              <RateRow label="Charity" value={charityRate} onChange={setCharityRate} name={charityName} onNameChange={setCharityName} />
              {extraLines.map((l, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", alignItems: "center", padding: "8px 14px", borderTop: "1px solid rgba(20,17,15,.12)" }}>
                  <input value={l.name} onChange={(e) => setExtraLines((prev) => prev.map((x, xi) => xi === i ? { ...x, name: e.target.value } : x))} placeholder="Cost line" style={{ ...inlineInputStyle, fontWeight: 600 }} />
                  <input type="number" value={l.amount} onChange={(e) => setExtraLines((prev) => prev.map((x, xi) => xi === i ? { ...x, amount: Number(e.target.value) } : x))} style={{ ...inlineInputStyle, background: T.yellow, borderRadius: 999, padding: "3px 10px", fontWeight: 700, width: 70 }} />
                  <button type="button" onClick={() => setExtraLines((prev) => prev.filter((_, xi) => xi !== i))} style={{ border: "none", background: "none", cursor: "pointer", color: "rgba(20,17,15,.4)", fontSize: 16 }}>×</button>
                </div>
              ))}
              <RateRow label="Stretchy" value={stretchyAmount} onChange={setStretchyAmount} />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderTop: "1px solid rgba(20,17,15,.12)", background: T.ink }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.cream }}>Total to cover</span>
                <span style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 800, color: T.yellow }}>${(costBase + revenueTarget).toFixed(2)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setExtraLines((prev) => [...prev, { name: "", amount: 0 }])}
              style={{ marginTop: 10, width: "100%", padding: "10px 0", borderRadius: 999, border: `2px dashed rgba(20,17,15,.3)`, background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "rgba(20,17,15,.6)" }}
            >
              + Add a cost line
            </button>
          </Section>

          <Section label="THE ROOM">
            <div style={{ background: "rgba(41,171,226,0.14)", border: `2px solid ${T.ink}`, borderRadius: 16, padding: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 10 }}>
                <NumberField label="MINIMUM MATS" value={minMats} onChange={(v) => setMinMats(Math.max(1, v))} />
                <NumberField label="MAXIMUM MATS" value={maxMats} onChange={(v) => setMaxMats(Math.max(minMats, v))} />
                <NumberField label="OPENING PRICE CAP" value={openingPriceCap} step={0.01} prefix="$" readOnly />
              </div>
              <p style={{ fontSize: 11, color: "rgba(20,17,15,.5)", marginBottom: 14 }}>
                Fewer mats = higher price each. More mats = lower price each — that&rsquo;s the whole idea: the price drops as the room fills.
              </p>
              <div style={{ fontSize: 12, color: "rgba(20,17,15,.6)", marginBottom: 14 }}>
                At <strong>{minMats} mats</strong> (the fewest, so the ceiling): <strong>${openingPriceCap.toFixed(2)}</strong> each.
                {" "}At <strong>{maxMats} mats</strong> (full room, the floor): <strong>${floorPrice.toFixed(2)}</strong> each.
              </div>
              <div>
                <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "rgba(20,17,15,.6)", marginBottom: 6 }}>SIMULATE THE ROOM</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <StepButton onClick={() => setSimulateN((n) => Math.max(0, n - 1))}>−</StepButton>
                  <span style={{ fontFamily: T.mono, fontSize: 15, fontWeight: 800, minWidth: 50, textAlign: "center" }}>{simulateN} in</span>
                  <StepButton onClick={() => setSimulateN((n) => Math.min(maxMats, n + 1))}>+</StepButton>
                </div>
              </div>
            </div>
          </Section>

          {error && <p style={{ color: "#C6362E", fontSize: 13, fontWeight: 600, marginTop: 4 }}>{error}</p>}
        </div>

        {/* Right live preview */}
        <div style={{ width: 300, flexShrink: 0, background: T.blue, color: T.cream, padding: "28px 24px", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
          <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", opacity: 0.75, marginBottom: 14 }}>LIVE PREVIEW</p>
          <p style={{ fontFamily: T.mono, fontSize: 42, fontWeight: 800, lineHeight: 1, marginBottom: 4 }}>${previewPrice.toFixed(2)}</p>
          <p style={{ fontSize: 12, opacity: 0.8, marginBottom: 16 }}>per person · incl. GST · at {simulateN} mats</p>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(247,240,232,0.12)", borderRadius: 10, padding: "10px 14px", marginBottom: 16 }}>
            <span style={{ fontSize: 12, opacity: 0.85 }}>Total to cover</span>
            <span style={{ fontFamily: T.mono, fontSize: 16, fontWeight: 800 }}>${(costBase + revenueTarget).toFixed(2)}</span>
          </div>

          <div style={{ background: T.yellow, color: T.ink, borderRadius: 14, padding: 16, marginBottom: 16 }}>
            <p style={{ fontFamily: "'BN Chubb', 'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, lineHeight: 1.25, textTransform: "uppercase" }}>
              {goingAhead
                ? `Going ahead. ${spotsLeft} spots left, and each one drops the price.`
                : `${spotsToGoAhead} spot${spotsToGoAhead === 1 ? "" : "s"} to go ahead.`}
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: T.mono, fontSize: 10, fontWeight: 700, opacity: 0.8, marginBottom: 6 }}>
              <span>{goingAhead ? "GOING AHEAD" : "TO GO AHEAD"}</span>
              <span>{maxMats} MAX</span>
            </div>
            <div style={{ display: "flex", gap: 2 }}>
              {Array.from({ length: maxMats }).map((_, i) => (
                <span key={i} style={{ flex: 1, height: 8, borderRadius: 2, background: i < simulateN ? T.yellow : "rgba(247,240,232,0.25)" }} />
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16, fontSize: 13 }}>
            <PreviewRow label="Opens at" value={`$${openingPriceCap.toFixed(2)}`} />
            <PreviewRow label="Best case, full room" value={`$${floorPrice.toFixed(2)}`} />
            <PreviewRow label="One more person" value={`$${nextPrice.toFixed(2)}`} />
          </div>

          <p style={{ fontSize: 11, opacity: 0.7, lineHeight: 1.5, marginBottom: 20 }}>
            Go/no-go checked 36h out. Final price locked and cards charged 2h out.
          </p>

          <button
            onClick={() => submit("publish")}
            disabled={saving !== null}
            style={{ width: "100%", height: 48, borderRadius: 999, border: "none", cursor: "pointer", background: T.yellow, color: T.ink, fontWeight: 800, fontSize: 15, marginBottom: 10 }}
          >
            {saving === "publish" ? "Publishing…" : "Publish this Stretchy"}
          </button>
          <button
            onClick={() => submit("draft")}
            disabled={saving !== null}
            style={{ width: "100%", height: 48, borderRadius: 999, border: `2px solid ${T.cream}`, cursor: "pointer", background: "transparent", color: T.cream, fontWeight: 700, fontSize: 14 }}
          >
            {saving === "draft" ? "Saving…" : "Save as draft"}
          </button>
        </div>
      </div>
    </HQShell>
  );
}

function Section({ label, labelColor, children }: { label: string; labelColor?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: labelColor ?? "rgba(20,17,15,.5)", marginBottom: 8 }}>{label}</p>
      {children}
    </div>
  );
}

function Pill({ value, onChange, placeholder, borderColor }: { value: string; onChange: (v: string) => void; placeholder: string; borderColor?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ ...pillStyle, ...(borderColor ? { borderColor } : {}) }}
    />
  );
}

function RateRow({ label, value, onChange, name, onNameChange }: {
  label: string; value: number; onChange: (v: number) => void; name?: string; onNameChange?: (v: string) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", padding: "8px 14px", borderTop: "1px solid rgba(20,17,15,.12)" }}>
      {onNameChange ? (
        <input value={name} onChange={(e) => onNameChange(e.target.value)} style={{ ...inlineInputStyle, fontWeight: 600 }} />
      ) : (
        <span style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{label}</span>
      )}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ...inlineInputStyle, background: T.yellow, borderRadius: 999, padding: "3px 10px", fontWeight: 700, width: 70 }}
      />
    </div>
  );
}

function NumberField({ label, value, onChange, step = 1, prefix, readOnly }: { label: string; value: number; onChange?: (v: number) => void; step?: number; prefix?: string; readOnly?: boolean }) {
  return (
    <div>
      <p style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: "0.06em", color: "rgba(20,17,15,.55)", marginBottom: 5 }}>{label}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 6, background: readOnly ? "rgba(20,17,15,.05)" : "#fff", border: `2px solid ${T.ink}`, borderRadius: 999, padding: "6px 12px" }}>
        {prefix && <span style={{ fontSize: 13, color: "rgba(20,17,15,.5)" }}>{prefix}</span>}
        {readOnly ? (
          <span style={{ fontSize: 14, fontWeight: 700, width: "100%", fontFamily: T.mono, color: "rgba(20,17,15,.7)" }}>
            {step < 1 ? value.toFixed(2) : value}
          </span>
        ) : (
          <input
            type="number"
            step={step}
            value={value}
            onChange={(e) => onChange!(Number(e.target.value))}
            style={{ border: "none", outline: "none", background: "transparent", fontSize: 14, fontWeight: 700, width: "100%", fontFamily: T.mono }}
          />
        )}
      </div>
    </div>
  );
}

function StepButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} style={{ width: 30, height: 30, borderRadius: "50%", border: `2px solid ${T.ink}`, background: "#fff", cursor: "pointer", fontSize: 16, fontWeight: 700, lineHeight: 1 }}>
      {children}
    </button>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 8, borderBottom: "1px solid rgba(247,240,232,0.18)" }}>
      <span style={{ opacity: 0.8 }}>{label}</span>
      <span style={{ fontFamily: T.mono, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

const pillStyle: React.CSSProperties = {
  width: "100%", padding: "11px 16px", borderRadius: 999, border: `2px solid ${T.ink}`,
  background: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", color: T.ink,
};

const inlineInputStyle: React.CSSProperties = {
  border: "none", outline: "none", background: "transparent", fontSize: 14, color: T.ink, fontFamily: "'Space Grotesk', sans-serif",
};
