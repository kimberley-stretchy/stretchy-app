"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SMark from "@/components/SMark";

const T = {
  black:  "#1A1A1A",
  cream:  "#F5EDE3",
  yellow: "#FFD166",
  olive:  "#7A8330",
  blue:   "#2C8FE0",
  purple: "#A535C7",
  mono:   "'JetBrains Mono', monospace",
  body:   "'Space Grotesk', system-ui, sans-serif",
};

const MOVEMENT_TYPES = [
  { value: "yoga",    label: "YOGA",    color: "#A535C7" },
  { value: "pilates", label: "PILATES", color: "#2A3FE0" },
  { value: "breath",  label: "BREATH",  color: "#7A8330" },
  { value: "sound",   label: "SOUND",   color: "#4FB8E0" },
  { value: "flow",    label: "FLOW",    color: "#FF6B35" },
  { value: "run",     label: "RUN",     color: "#E63946" },
  { value: "hiit",    label: "HIIT",    color: "#2C8FE0" },
];

const DURATIONS = [
  { value: 45,  label: "45 min" },
  { value: 60,  label: "60 min" },
  { value: 75,  label: "75 min" },
  { value: 90,  label: "90 min" },
  { value: 120, label: "2 hours" },
];

const STRETCHY_FEE = 23; // $20 + 15% GST
function calcPrice(target: number, spots: number) {
  return Math.round((target + STRETCHY_FEE) / spots);
}

export default function AdminCreateSessionPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle]               = useState("");
  const [description, setDescription]   = useState("");
  const [movementType, setMovementType] = useState("yoga");
  const [date, setDate]                 = useState("");
  const [time, setTime]                 = useState("09:00");
  const [durationMins, setDurationMins] = useState(60);
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [gettingThere, setGettingThere] = useState("");
  const [hostTarget, setHostTarget]     = useState(200);
  const [minAttendees, setMinAttendees] = useState(8);
  const [maxAttendees, setMaxAttendees] = useState(20);
  const [socialVenue, setSocialVenue]   = useState("");
  const [socialNote, setSocialNote]     = useState("");
  const [whatToBring, setWhatToBring]   = useState("");

  // Derived prices
  const startingPrice = calcPrice(hostTarget, minAttendees);
  const floorPrice    = calcPrice(hostTarget, maxAttendees);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const starts_at = `${date}T${time}:00+12:00`; // NZ time

    try {
      const res = await fetch("/api/admin/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          movement_type: movementType,
          starts_at,
          duration_mins: durationMins,
          location_name: locationName,
          location_address: locationAddress,
          getting_there: gettingThere,
          host_target: hostTarget,
          min_attendees: minAttendees,
          max_attendees: maxAttendees,
          social_stretch_venue: socialVenue,
          social_stretch_note: socialNote,
          what_to_bring: whatToBring
            ? whatToBring.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create session");

      router.push("/admin/sessions");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const selectedType = MOVEMENT_TYPES.find((t) => t.value === movementType)!;

  return (
    <main style={{ background: T.black, minHeight: "100vh", color: T.cream, fontFamily: T.body }}>
      {/* Nav */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 20px", maxWidth: 640, margin: "0 auto",
      }}>
        <Link href="/admin/sessions">
          <SMark size={28} className="text-cream" />
        </Link>
        <div style={{
          display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
          borderRadius: 999, background: T.cream,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: T.blue }} />
          <span style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: T.black, letterSpacing: "0.18em" }}>
            STRETCHY HQ
          </span>
        </div>
        <Link href="/admin/sessions" style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 700, color: "rgba(245,237,227,0.5)", letterSpacing: "0.12em", textDecoration: "none" }}>
          ← BACK
        </Link>
      </nav>

      <form onSubmit={handleSubmit} style={{ maxWidth: 640, margin: "0 auto", padding: "0 20px 60px" }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "rgba(245,237,227,0.4)", letterSpacing: "0.2em", marginBottom: 8 }}>
            NEW SESSION
          </p>
          <h1 style={{ fontSize: "clamp(36px,10vw,52px)", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 0.92, margin: 0 }}>
            Create a<br />Stretchy.
          </h1>
        </div>

        {/* Movement Type */}
        <Section label="MOVEMENT TYPE">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {MOVEMENT_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setMovementType(t.value)}
                style={{
                  padding: "8px 16px", borderRadius: 999, border: "none", cursor: "pointer",
                  fontFamily: T.mono, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em",
                  background: movementType === t.value ? t.color : "rgba(245,237,227,0.10)",
                  color: movementType === t.value ? T.cream : "rgba(245,237,227,0.55)",
                  transition: "all .15s",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Title */}
        <Section label="SESSION NAME">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`e.g. ${selectedType.label === "YOGA" ? "Sunday Slow Flow" : "Morning " + selectedType.label.charAt(0) + selectedType.label.slice(1).toLowerCase()}`}
            style={inputStyle}
          />
        </Section>

        {/* Description */}
        <Section label="DESCRIPTION">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell people what to expect — the vibe, the format, the teacher."
            rows={3}
            style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5 }}
          />
        </Section>

        {/* Date + Time + Duration */}
        <Section label="DATE & TIME">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label style={smallLabelStyle}>DATE</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={smallLabelStyle}>TIME</label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={smallLabelStyle}>DURATION</label>
              <select
                value={durationMins}
                onChange={(e) => setDurationMins(Number(e.target.value))}
                style={inputStyle}
              >
                {DURATIONS.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>
        </Section>

        {/* Location */}
        <Section label="LOCATION">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label style={smallLabelStyle}>VENUE NAME</label>
              <input
                required
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. Grey Lynn Community Centre"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={smallLabelStyle}>ADDRESS</label>
              <input
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                placeholder="e.g. 510 Richmond Road, Grey Lynn, Auckland"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={smallLabelStyle}>GETTING THERE / ACCESS NOTES</label>
              <input
                value={gettingThere}
                onChange={(e) => setGettingThere(e.target.value)}
                placeholder="e.g. Enter via the side gate. Mats provided. BYO water."
                style={inputStyle}
              />
            </div>
          </div>
        </Section>

        {/* What to Bring */}
        <Section label="WHAT TO BRING">
          <input
            value={whatToBring}
            onChange={(e) => setWhatToBring(e.target.value)}
            placeholder="e.g. mat, water bottle, towel (comma separated)"
            style={inputStyle}
          />
        </Section>

        {/* Pricing */}
        <Section label="PRICING">
          <div style={{
            background: "rgba(245,237,227,0.06)", borderRadius: 16, padding: 20,
            border: "1px solid rgba(245,237,227,0.10)",
          }}>
            {/* Host target */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={smallLabelStyle}>HOST EARNINGS TARGET</label>
                <span style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 700, color: T.yellow }}>
                  ${hostTarget}
                </span>
              </div>
              <input
                type="range" min={50} max={500} step={10}
                value={hostTarget}
                onChange={(e) => setHostTarget(Number(e.target.value))}
                style={{ width: "100%", accentColor: T.yellow }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: T.mono, fontSize: 10, color: "rgba(245,237,227,0.4)", marginTop: 4 }}>
                <span>$50</span><span>$500</span>
              </div>
            </div>

            {/* Min spots */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={smallLabelStyle}>MINIMUM TO GO AHEAD</label>
                <span style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 700, color: T.cream }}>{minAttendees}</span>
              </div>
              <input
                type="range" min={3} max={30} step={1}
                value={minAttendees}
                onChange={(e) => setMinAttendees(Number(e.target.value))}
                style={{ width: "100%", accentColor: T.cream }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: T.mono, fontSize: 10, color: "rgba(245,237,227,0.4)", marginTop: 4 }}>
                <span>3</span><span>30</span>
              </div>
            </div>

            {/* Max capacity */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <label style={smallLabelStyle}>MAX CAPACITY</label>
                <span style={{ fontFamily: T.mono, fontSize: 22, fontWeight: 700, color: T.cream }}>{maxAttendees}</span>
              </div>
              <input
                type="range" min={minAttendees} max={60} step={1}
                value={maxAttendees}
                onChange={(e) => setMaxAttendees(Number(e.target.value))}
                style={{ width: "100%", accentColor: T.cream }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: T.mono, fontSize: 10, color: "rgba(245,237,227,0.4)", marginTop: 4 }}>
                <span>{minAttendees}</span><span>60</span>
              </div>
            </div>

            {/* Price summary */}
            <div style={{
              background: T.black, borderRadius: 12, padding: 16,
              border: "1px solid rgba(245,237,227,0.12)",
            }}>
              <p style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "rgba(245,237,227,0.4)", letterSpacing: "0.16em", marginBottom: 12 }}>
                WHAT ATTENDEES PAY
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <p style={{ fontFamily: T.mono, fontSize: 10, color: "rgba(245,237,227,0.4)", letterSpacing: "0.1em", marginBottom: 4 }}>
                    STARTING PRICE
                  </p>
                  <p style={{ fontFamily: T.mono, fontSize: 28, fontWeight: 700, color: T.yellow }}>
                    ${startingPrice}
                  </p>
                  <p style={{ fontSize: 11, color: "rgba(245,237,227,0.4)", marginTop: 2 }}>
                    at {minAttendees} people + GST
                  </p>
                </div>
                <div>
                  <p style={{ fontFamily: T.mono, fontSize: 10, color: "rgba(245,237,227,0.4)", letterSpacing: "0.1em", marginBottom: 4 }}>
                    BEST PRICE
                  </p>
                  <p style={{ fontFamily: T.mono, fontSize: 28, fontWeight: 700, color: T.cream }}>
                    ${floorPrice}
                  </p>
                  <p style={{ fontSize: 11, color: "rgba(245,237,227,0.4)", marginTop: 2 }}>
                    at {maxAttendees} people + GST
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Social Stretch */}
        <Section label="SOCIAL STRETCH (OPTIONAL)">
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div>
              <label style={smallLabelStyle}>VENUE / PLACE</label>
              <input
                value={socialVenue}
                onChange={(e) => setSocialVenue(e.target.value)}
                placeholder="e.g. Little Bird Café next door"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={smallLabelStyle}>NOTE</label>
              <input
                value={socialNote}
                onChange={(e) => setSocialNote(e.target.value)}
                placeholder="e.g. Bring a friend — the more the merrier ☕"
                style={inputStyle}
              />
            </div>
          </div>
        </Section>

        {/* Error */}
        {error && (
          <div style={{
            marginBottom: 20, padding: 16, borderRadius: 12,
            background: "rgba(230,57,70,0.15)", border: "1px solid rgba(230,57,70,0.3)",
            color: "#E63946", fontFamily: T.mono, fontSize: 13, fontWeight: 600,
          }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          style={{
            width: "100%", padding: "20px 28px", borderRadius: 999,
            background: saving ? "rgba(245,237,227,0.3)" : T.cream,
            color: T.black, border: "none", cursor: saving ? "not-allowed" : "pointer",
            fontFamily: T.body, fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em",
          }}
        >
          {saving ? "Creating session…" : "Create session →"}
        </button>
      </form>
    </main>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
        color: "rgba(245,237,227,0.4)", letterSpacing: "0.20em", marginBottom: 10,
      }}>
        {label}
      </p>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "14px 16px", borderRadius: 12,
  background: "rgba(245,237,227,0.08)", border: "1px solid rgba(245,237,227,0.12)",
  color: "#F5EDE3", fontFamily: "'Space Grotesk', system-ui, sans-serif",
  fontSize: 15, fontWeight: 500, outline: "none",
  boxSizing: "border-box",
};

const smallLabelStyle: React.CSSProperties = {
  display: "block", fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
  fontWeight: 700, color: "rgba(245,237,227,0.4)", letterSpacing: "0.16em",
  marginBottom: 6,
};
