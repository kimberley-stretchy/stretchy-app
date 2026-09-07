"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSession } from "./actions";
import {
  calculatePrice,
  startingPrice,
  floorPrice,
  getHostPricingPrompt,
  getPriceCurve,
  formatPrice,
} from "@/lib/pricing";
import type { MovementType } from "@/types";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const SESSION_TYPES: { value: MovementType; label: string; emoji: string }[] = [
  { value: "yoga",    label: "Yoga",       emoji: "🧘" },
  { value: "pilates", label: "Pilates",    emoji: "🏋️" },
  { value: "flow",    label: "Flow",       emoji: "🌊" },
  { value: "breath",  label: "Breathwork", emoji: "💨" },
  { value: "sound",   label: "Sound bath", emoji: "🔔" },
  { value: "run",     label: "Run club",   emoji: "🏃" },
  { value: "hiit",    label: "HIIT",       emoji: "⚡" },
];

const DURATIONS = [
  { value: 45,  label: "45 min" },
  { value: 60,  label: "60 min" },
  { value: 75,  label: "75 min" },
  { value: 90,  label: "90 min" },
];

const NEIGHBOURHOODS = [
  "Grey Lynn", "Ponsonby", "Herne Bay", "Newmarket", "Parnell",
  "Pt Chevalier", "Mt Eden", "Kingsland", "Morningside",
  "Sandringham", "Eden Terrace", "Freemans Bay", "City Centre", "Other",
];

type Step = 0 | 1 | 2 | 3;
const STEP_LABELS = ["The session", "When & where", "Pricing", "Review"];

// ─── FORM STATE ───────────────────────────────────────────────────────────────

interface FormState {
  sessionType: MovementType | null;
  title: string;
  description: string;
  durationMinutes: number;
  date: string;
  time: string;
  neighbourhood: string;
  venueName: string;
  venueNotes: string;
  hasSocialStretch: boolean;
  costBase: string;
  revenueTarget: string;
  minimumSpots: string;
  maxCapacity: string;
  // Charity / fundraiser
  isCharity: boolean;
  charityName: string;
  charityWebsite: string;
  charityInstagram: string;
  charityNote: string;
}

const INITIAL_STATE: FormState = {
  sessionType: null,
  title: "",
  description: "",
  durationMinutes: 60,
  date: "",
  time: "18:00",
  neighbourhood: "",
  venueName: "",
  venueNotes: "",
  hasSocialStretch: false,
  costBase: "",
  revenueTarget: "",
  minimumSpots: "",
  maxCapacity: "",
  isCharity: false,
  charityName: "",
  charityWebsite: "",
  charityInstagram: "",
  charityNote: "",
};

// ─── PRICE CURVE SVG ──────────────────────────────────────────────────────────

function PriceCurve({
  costBase,
  revenueTarget,
  minimumSpots,
  maxCapacity,
  simulatedSpots,
}: {
  costBase: number;
  revenueTarget: number;
  minimumSpots: number;
  maxCapacity: number;
  simulatedSpots: number;
}) {
  const points = useMemo(
    () => getPriceCurve(costBase, revenueTarget, minimumSpots, maxCapacity, simulatedSpots),
    [costBase, revenueTarget, minimumSpots, maxCapacity, simulatedSpots]
  );

  if (points.length < 2) return null;

  const W = 300;
  const H = 72;
  const PAD = 4;

  const minPrice = points[points.length - 1].price;
  const maxPrice = points[0].price;
  const priceRange = maxPrice - minPrice || 1;
  const spotRange = maxCapacity - minimumSpots || 1;

  const toX = (spots: number) =>
    PAD + ((spots - minimumSpots) / spotRange) * (W - PAD * 2);
  const toY = (price: number) =>
    PAD + ((maxPrice - price) / priceRange) * (H - PAD * 2);

  // Build SVG path
  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${toX(p.spots).toFixed(1)},${toY(p.price).toFixed(1)}`)
    .join(" ");

  // Filled area under the curve
  const fillD =
    pathD +
    ` L${toX(maxCapacity).toFixed(1)},${H - PAD} L${toX(minimumSpots).toFixed(1)},${H - PAD} Z`;

  // Current simulated spot marker
  const simX = toX(Math.min(Math.max(simulatedSpots, minimumSpots), maxCapacity));
  const simPrice = calculatePrice(costBase, revenueTarget, Math.min(Math.max(simulatedSpots, minimumSpots), maxCapacity));
  const simY = toY(simPrice);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden>
      {/* Fill */}
      <path d={fillD} fill="rgba(122,131,48,0.08)" />
      {/* Line */}
      <path d={pathD} fill="none" stroke="#716F39" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Simulated position dot */}
      <circle cx={simX} cy={simY} r="5" fill="#0000FF" stroke="white" strokeWidth="2" />
    </svg>
  );
}

// ─── STEP 1 — THE SESSION ─────────────────────────────────────────────────────

function StepBasics({ form, update }: { form: FormState; update: (p: Partial<FormState>) => void }) {
  const typeConfig = SESSION_TYPES.find((t) => t.value === form.sessionType);

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-semibold text-ink mb-3">What kind of session?</label>
        <div className="grid grid-cols-4 gap-2">
          {SESSION_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                update({
                  sessionType: t.value,
                  title: form.title || `${t.label} with me`,
                });
              }}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-card border-2 transition-all text-xs font-medium ${
                form.sessionType === t.value
                  ? "border-olive bg-olive text-white"
                  : "border-border bg-white text-ink hover:border-olive"
              }`}
            >
              <span className="text-xl">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">
          Session title
        </label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder={typeConfig ? `e.g. ${typeConfig.label} in the Park` : "Give your session a name"}
          className="w-full px-4 py-3 rounded-card border-2 border-border bg-white text-ink placeholder-muted focus:outline-none focus:border-olive transition-colors text-base"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-3">How long?</label>
        <div className="flex gap-2">
          {DURATIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => update({ durationMinutes: d.value })}
              className={`flex-1 py-2.5 rounded-pill border-2 text-sm font-medium transition-all ${
                form.durationMinutes === d.value
                  ? "border-olive bg-olive text-white"
                  : "border-border bg-white text-ink hover:border-olive"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">
          Description <span className="font-normal text-muted">(optional)</span>
        </label>
        <textarea
          value={form.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Tell people what to expect — style, level, vibe…"
          rows={3}
          className="w-full px-4 py-3 rounded-card border-2 border-border bg-white text-ink placeholder-muted focus:outline-none focus:border-olive transition-colors text-sm resize-none"
        />
      </div>
    </div>
  );
}

// ─── STEP 2 — WHEN & WHERE ────────────────────────────────────────────────────

function StepSchedule({ form, update }: { form: FormState; update: (p: Partial<FormState>) => void }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Date</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => update({ date: e.target.value })}
            min={new Date().toISOString().split("T")[0]}
            className="w-full px-4 py-3 rounded-card border-2 border-border bg-white text-ink focus:outline-none focus:border-olive transition-colors text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">Start time</label>
          <input
            type="time"
            value={form.time}
            onChange={(e) => update({ time: e.target.value })}
            className="w-full px-4 py-3 rounded-card border-2 border-border bg-white text-ink focus:outline-none focus:border-olive transition-colors text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Neighbourhood</label>
        <select
          value={form.neighbourhood}
          onChange={(e) => update({ neighbourhood: e.target.value })}
          className="w-full px-4 py-3 rounded-card border-2 border-border bg-white text-ink focus:outline-none focus:border-olive transition-colors text-sm appearance-none"
        >
          <option value="">Select neighbourhood…</option>
          {NEIGHBOURHOODS.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">Venue name</label>
        <input
          type="text"
          value={form.venueName}
          onChange={(e) => update({ venueName: e.target.value })}
          placeholder="e.g. Grey Lynn Park, Studio One…"
          className="w-full px-4 py-3 rounded-card border-2 border-border bg-white text-ink placeholder-muted focus:outline-none focus:border-olive transition-colors text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">
          Venue notes <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          type="text"
          value={form.venueNotes}
          onChange={(e) => update({ venueNotes: e.target.value })}
          placeholder="Parking tips, entry instructions, what to bring…"
          className="w-full px-4 py-3 rounded-card border-2 border-border bg-white text-ink placeholder-muted focus:outline-none focus:border-olive transition-colors text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-3">Social stretch?</label>
        <p className="text-sm text-muted mb-3">
          A casual hang after — coffee, tea, a drink. The best part.
        </p>
        <div className="flex gap-2">
          {[
            { val: true,  label: "Yes, let's do it 🤙" },
            { val: false, label: "Just the session" },
          ].map(({ val, label }) => (
            <button
              key={String(val)}
              type="button"
              onClick={() => update({ hasSocialStretch: val })}
              className={`flex-1 py-2.5 px-4 rounded-pill border-2 text-sm font-medium transition-all ${
                form.hasSocialStretch === val
                  ? "border-olive bg-olive text-white"
                  : "border-border bg-white text-ink hover:border-olive"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CHARITY / FUNDRAISER ── */}
      <div className="rounded-card overflow-hidden" style={{ border: "1.5px solid #E0D9D0" }}>
        {/* Toggle header */}
        <button
          type="button"
          onClick={() => update({ isCharity: !form.isCharity })}
          className="w-full flex items-center justify-between px-4 py-4 transition-colors hover:bg-sand-dark"
          style={{ backgroundColor: form.isCharity ? "#FFF4E6" : "#fff" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🎗️</span>
            <div className="text-left">
              <p className="text-sm font-semibold text-ink">Charity or fundraiser?</p>
              <p className="text-xs text-muted mt-0.5">Stretchy discounts the platform fee for good causes.</p>
            </div>
          </div>
          <div
            className="w-11 h-6 rounded-full flex-shrink-0 transition-colors relative"
            style={{ backgroundColor: form.isCharity ? "#E96709" : "#D4CFC9" }}
          >
            <div
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white border-2 border-ink transition-transform"
              style={{ transform: form.isCharity ? "translateX(22px)" : "translateX(2px)" }}
            />
          </div>
        </button>

        {/* Expanded fields */}
        {form.isCharity && (
          <div className="px-4 pb-5 space-y-3" style={{ backgroundColor: "#FFF4E6", borderTop: "1px solid #F8DFC5" }}>

            {/* Fee discount callout */}
            <div className="rounded-card px-4 py-3 flex items-start gap-2" style={{ backgroundColor: "#E96709", border: "2px solid #14110F" }}>
              <span className="text-sm flex-shrink-0 mt-0.5">✓</span>
              <p className="text-sm font-semibold text-white leading-snug">
                Stretchy reduces the platform fee for charity events. We&apos;ll confirm the discount amount when you submit.
              </p>
            </div>

            {/* Charity name */}
            <div>
              <label className="block font-mono text-xs font-bold uppercase tracking-widest text-muted mb-1.5">
                Charity / cause name
              </label>
              <input
                type="text"
                value={form.charityName}
                onChange={(e) => update({ charityName: e.target.value })}
                placeholder="e.g. Mental Health Foundation NZ"
                className="w-full px-4 py-3 rounded-pill border-2 border-border bg-white text-ink placeholder-muted focus:outline-none focus:border-hot-blue transition-colors text-sm"
              />
            </div>

            {/* Website */}
            <div>
              <label className="block font-mono text-xs font-bold uppercase tracking-widest text-muted mb-1.5">
                Website <span className="normal-case font-normal">(optional)</span>
              </label>
              <input
                type="url"
                value={form.charityWebsite}
                onChange={(e) => update({ charityWebsite: e.target.value })}
                placeholder="https://..."
                className="w-full px-4 py-3 rounded-pill border-2 border-border bg-white text-ink placeholder-muted focus:outline-none focus:border-hot-blue transition-colors text-sm"
              />
            </div>

            {/* Instagram */}
            <div>
              <label className="block font-mono text-xs font-bold uppercase tracking-widest text-muted mb-1.5">
                Instagram <span className="normal-case font-normal">(optional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">@</span>
                <input
                  type="text"
                  value={form.charityInstagram}
                  onChange={(e) => update({ charityInstagram: e.target.value.replace(/^@/, "") })}
                  placeholder="charityhandle"
                  className="w-full pl-8 pr-4 py-3 rounded-pill border-2 border-border bg-white text-ink placeholder-muted focus:outline-none focus:border-hot-blue transition-colors text-sm"
                />
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="block font-mono text-xs font-bold uppercase tracking-widest text-muted mb-1.5">
                Tell movers what it&apos;s for <span className="normal-case font-normal">(optional)</span>
              </label>
              <textarea
                value={form.charityNote}
                onChange={(e) => update({ charityNote: e.target.value })}
                placeholder="e.g. All proceeds go toward youth mental health programmes in Auckland..."
                rows={3}
                className="w-full px-4 py-3 rounded-card border-2 border-border bg-white text-ink placeholder-muted focus:outline-none focus:border-hot-blue transition-colors text-sm resize-none"
              />
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

// ─── STEP 3 — PRICING ─────────────────────────────────────────────────────────

function StepPricing({ form, update }: { form: FormState; update: (p: Partial<FormState>) => void }) {
  const [simulatedSpots, setSimulatedSpots] = useState<number | null>(null);

  const costBase = parseFloat(form.costBase) || 0;
  const target = parseFloat(form.revenueTarget) || 0;
  const minSpots = parseInt(form.minimumSpots) || 0;
  const maxCap = parseInt(form.maxCapacity) || 0;

  const hasValidInputs = target > 0 && minSpots >= 2 && maxCap >= minSpots;

  const ceiling = hasValidInputs ? startingPrice(costBase, target, minSpots) : null;
  const floor = hasValidInputs ? floorPrice(costBase, target, maxCap) : null;

  const effectiveSimulated = simulatedSpots ?? minSpots;
  const simPrice = hasValidInputs ? calculatePrice(costBase, target, Math.min(Math.max(effectiveSimulated, minSpots), maxCap)) : null;

  const marketPrompt = useMemo(() => {
    if (!hasValidInputs || !form.sessionType) return null;
    return getHostPricingPrompt(form.sessionType, form.durationMinutes, costBase, target, minSpots);
  }, [hasValidInputs, form.sessionType, form.durationMinutes, costBase, target, minSpots]);

  return (
    <div className="space-y-6">

      {/* ── Inputs ── */}
      <div className="space-y-4">

        {/* Cost base */}
        <div>
          <label className="block text-sm font-semibold text-ink mb-1">
            What does this session cost to run?
          </label>
          <p className="text-xs text-muted mb-2">
            Teacher, venue, GEM, charity contribution — whatever it takes to put it on.
          </p>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink font-semibold text-lg">$</span>
            <input
              type="number"
              value={form.costBase}
              onChange={(e) => {
                update({ costBase: e.target.value });
                setSimulatedSpots(null);
              }}
              placeholder="200"
              min="0"
              step="10"
              className="w-full pl-9 pr-4 py-3.5 rounded-card border-2 border-border bg-white text-ink placeholder-muted focus:outline-none focus:border-olive transition-colors text-lg font-semibold"
            />
          </div>
        </div>

        {/* Revenue target */}
        <div>
          <label className="block text-sm font-semibold text-ink mb-1">
            What's the target on top?
          </label>
          <p className="text-xs text-muted mb-2">
            What this session aims to net for Stretchy, beyond covering its costs.
          </p>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink font-semibold text-lg">$</span>
            <input
              type="number"
              value={form.revenueTarget}
              onChange={(e) => {
                update({ revenueTarget: e.target.value });
                setSimulatedSpots(null);
              }}
              placeholder="200"
              min="0"
              step="10"
              className="w-full pl-9 pr-4 py-3.5 rounded-card border-2 border-border bg-white text-ink placeholder-muted focus:outline-none focus:border-olive transition-colors text-lg font-semibold"
            />
          </div>
        </div>

        {/* Spots row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-ink mb-1">
              Minimum mats
            </label>
            <p className="text-xs text-muted mb-2">Needed to go ahead</p>
            <input
              type="number"
              value={form.minimumSpots}
              onChange={(e) => {
                update({ minimumSpots: e.target.value });
                setSimulatedSpots(null);
              }}
              placeholder="8"
              min="2"
              max="100"
              className="w-full px-4 py-3.5 rounded-card border-2 border-border bg-white text-ink placeholder-muted focus:outline-none focus:border-olive transition-colors text-lg font-semibold text-center"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink mb-1">
              Maximum mats
            </label>
            <p className="text-xs text-muted mb-2">Venue limit</p>
            <input
              type="number"
              value={form.maxCapacity}
              onChange={(e) => {
                update({ maxCapacity: e.target.value });
                setSimulatedSpots(null);
              }}
              placeholder="20"
              min={minSpots || 2}
              max="200"
              className="w-full px-4 py-3.5 rounded-card border-2 border-border bg-white text-ink placeholder-muted focus:outline-none focus:border-olive transition-colors text-lg font-semibold text-center"
            />
          </div>
        </div>
      </div>

      {/* ── Live pricing display ── */}
      {hasValidInputs ? (
        <div className="space-y-4 animate-fade-in">

          {/* Price breakdown card */}
          <div className="bg-white rounded-card border-2 border-olive/20 overflow-hidden">

            {/* Formula banner */}
            <div className="bg-sand-light px-4 py-2.5 border-b border-border">
              <p className="text-xs text-muted font-medium text-center">
                (${costBase} costs + ${target} target) ÷ mats = price per person
              </p>
            </div>

            {/* Price range */}
            <div className="px-5 pt-4 pb-3">
              <div className="flex items-end justify-between mb-1">
                <div>
                  <p className="text-xs text-muted font-medium uppercase tracking-wide mb-1">Starting price</p>
                  <span className="price-pill text-4xl">{formatPrice(ceiling!)}</span>
                  <p className="text-xs text-muted mt-1">
                    at {minSpots} {minSpots === 1 ? "person" : "people"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted font-medium uppercase tracking-wide mb-1">Floor price</p>
                  <span className="price-pill text-2xl">{formatPrice(floor!)}</span>
                  <p className="text-xs text-muted mt-1">
                    at {maxCap} {maxCap === 1 ? "person" : "people"}
                  </p>
                </div>
              </div>

              {/* Price curve */}
              <div className="mt-3 mb-1">
                <PriceCurve
                  costBase={costBase}
                  revenueTarget={target}
                  minimumSpots={minSpots}
                  maxCapacity={maxCap}
                  simulatedSpots={effectiveSimulated}
                />
              </div>

              {/* Axis labels */}
              <div className="flex justify-between text-xs text-muted">
                <span>{minSpots} people</span>
                <span>{maxCap} people</span>
              </div>
            </div>

            {/* Simulator slider */}
            {maxCap > minSpots && (
              <div className="px-5 pb-5 pt-1 border-t border-border">
                <div className="flex items-center justify-between mb-2 mt-3">
                  <p className="text-xs font-semibold text-ink">What if…</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted">{effectiveSimulated} people join →</span>
                    <span className="price-pill text-sm">{formatPrice(simPrice!)}</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={minSpots}
                  max={maxCap}
                  value={effectiveSimulated}
                  onChange={(e) => setSimulatedSpots(parseInt(e.target.value))}
                  className="w-full accent-hot-blue cursor-pointer"
                />
                <div className="flex justify-between text-xs text-muted mt-1">
                  <span>Minimum ({minSpots})</span>
                  <span>Full ({maxCap})</span>
                </div>

                {simPrice !== null && simPrice < ceiling! && (
                  <p className="text-xs text-center mt-2 text-olive font-medium">
                    That's {formatPrice(ceiling! - simPrice)} cheaper than the starting price
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Cost + target callout */}
          <div className="flex items-center gap-3 bg-olive/10 rounded-card border-2 border-ink px-4 py-3">
            <div className="w-8 h-8 bg-olive rounded-full flex-shrink-0 flex items-center justify-center text-white text-sm">✓</div>
            <p className="text-sm text-ink">
              Costs of <span className="font-bold">{formatPrice(costBase)}</span> are covered and the{" "}
              <span className="font-bold">{formatPrice(target)}</span> target is hit at the minimum —
              every extra mat past that just drops the price.
            </p>
          </div>

          {/* Market rate hint */}
          {marketPrompt && (
            <div className={`rounded-card px-4 py-3 text-sm leading-relaxed border-2 ${
              ceiling! >= marketPrompt.marketMin && ceiling! <= marketPrompt.marketMax
                ? "bg-white border-olive/30 text-ink"
                : ceiling! < marketPrompt.marketMin
                ? "bg-white border-yellow-stretchy text-ink"
                : "bg-white border-pink-soft text-ink"
            }`}>
              <p className="font-semibold mb-0.5">
                {ceiling! >= marketPrompt.marketMin && ceiling! <= marketPrompt.marketMax
                  ? "✓ Looks about right"
                  : ceiling! < marketPrompt.marketMin
                  ? "👏 Very generous"
                  : "⚠ Above market"}
              </p>
              <p className="text-muted text-xs">{marketPrompt.message}</p>
            </div>
          )}

        </div>
      ) : (
        /* Empty state */
        <div className="rounded-card border-2 border-dashed border-border bg-white px-6 py-8 text-center">
          <p className="text-3xl mb-3">🧮</p>
          <p className="text-sm font-semibold text-ink mb-1">Your price will appear here</p>
          <p className="text-xs text-muted">
            Fill in your target and spot numbers above to see the live price calculation.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── STEP 4 — REVIEW ──────────────────────────────────────────────────────────

function StepReview({ form }: { form: FormState }) {
  const costBase = parseFloat(form.costBase) || 0;
  const target = parseFloat(form.revenueTarget) || 0;
  const minSpots = parseInt(form.minimumSpots) || 0;
  const maxCap = parseInt(form.maxCapacity) || 0;

  const ceiling = target > 0 && minSpots > 0 ? startingPrice(costBase, target, minSpots) : null;
  const floor = target > 0 && maxCap > 0 ? floorPrice(costBase, target, maxCap) : null;

  const typeConfig = SESSION_TYPES.find((t) => t.value === form.sessionType);

  const formattedDate = form.date
    ? new Date(form.date + "T12:00").toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "long", day: "numeric", month: "long" })
    : null;

  const formattedTime = form.time
    ? new Date(`2000-01-01T${form.time}`).toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit", hour12: true })
    : null;

  return (
    <div className="space-y-4">
      <div className="card space-y-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">{typeConfig?.emoji ?? "✨"}</span>
          <div>
            <h2 className="font-bold text-lg text-ink leading-tight">{form.title || "Untitled session"}</h2>
            <p className="text-sm text-muted">{form.durationMinutes} min</p>
          </div>
        </div>

        {form.description && (
          <p className="text-sm text-muted leading-relaxed">{form.description}</p>
        )}

        <div className="border-t border-border pt-4 space-y-2">
          {formattedDate && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">When</span>
              <span className="text-ink font-medium">{formattedDate}{formattedTime ? ` · ${formattedTime}` : ""}</span>
            </div>
          )}
          {form.neighbourhood && (
            <div className="flex justify-between text-sm">
              <span className="text-muted">Where</span>
              <span className="text-ink font-medium">{form.venueName ? `${form.venueName}, ` : ""}{form.neighbourhood}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted">Social stretch</span>
            <span className="text-ink font-medium">{form.hasSocialStretch ? "Yes 🤙" : "No"}</span>
          </div>
        </div>

        {ceiling !== null && floor !== null && (
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-muted uppercase tracking-wide font-medium">Starting price</p>
                <p className="text-3xl font-bold text-ink tabular-nums">{formatPrice(ceiling)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted uppercase tracking-wide font-medium">Floor price</p>
                <p className="text-xl font-bold text-olive tabular-nums">{formatPrice(floor)}</p>
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted">
              <span>Min {minSpots} mats to go ahead</span>
              <span>Up to {maxCap} people</span>
            </div>
            <div className="progress-track mt-2">
              <div className="progress-fill bg-olive" style={{ width: "0%" }} />
            </div>
          </div>
        )}
      </div>

      <div className="bg-olive/10 rounded-card border border-olive/20 px-4 py-3">
        <p className="text-xs font-semibold text-ink mb-1">Almost there 🙌</p>
        <p className="text-xs text-muted leading-relaxed">
          Hit Publish and your session goes live. Holds can start coming in straight away.
          You&apos;ll be able to manage it from your dashboard.
        </p>
      </div>
    </div>
  );
}

// ─── STEP VALIDATION ─────────────────────────────────────────────────────────

function canAdvance(step: Step, form: FormState): boolean {
  if (step === 0) return !!form.sessionType && form.title.trim().length > 0;
  if (step === 1) return !!form.date && !!form.neighbourhood && !!form.venueName;
  if (step === 2) {
    const costBase = parseFloat(form.costBase);
    const target = parseFloat(form.revenueTarget);
    const min = parseInt(form.minimumSpots);
    const max = parseInt(form.maxCapacity);
    return costBase >= 0 && target > 0 && min >= 2 && max >= min;
  }
  return true;
}

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: Step }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {STEP_LABELS.map((label, i) => (
        <div key={i} className="flex items-center gap-2 flex-1">
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div
              className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                i < step
                  ? "bg-olive text-white"
                  : i === step
                  ? "bg-ink text-white"
                  : "bg-border text-muted"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </div>
            <span
              className={`text-xs font-medium whitespace-nowrap hidden sm:block ${
                i === step ? "text-ink" : "text-muted"
              }`}
            >
              {label}
            </span>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div className={`h-0.5 flex-1 rounded-full transition-all ${i < step ? "bg-olive" : "bg-border"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function CreateSessionPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdSessionId, setCreatedSessionId] = useState<string | null>(null);

  const update = (patch: Partial<FormState>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const advance = async () => {
    if (step < 3) {
      setStep((s) => (s + 1) as Step);
      return;
    }

    // Final step — submit to Supabase
    setSubmitting(true);
    setSubmitError(null);

    const result = await createSession({
      sessionType: form.sessionType!,
      title: form.title,
      description: form.description,
      durationMinutes: form.durationMinutes,
      date: form.date,
      time: form.time,
      neighbourhood: form.neighbourhood,
      venueName: form.venueName,
      venueNotes: form.venueNotes,
      hasSocialStretch: form.hasSocialStretch,
      costBase: parseFloat(form.costBase) || 0,
      revenueTarget: parseFloat(form.revenueTarget),
      minimumSpots: parseInt(form.minimumSpots),
      maxCapacity: parseInt(form.maxCapacity),
      isCharity: form.isCharity,
      charityName: form.charityName,
      charityWebsite: form.charityWebsite,
      charityInstagram: form.charityInstagram,
      charityNote: form.charityNote,
    });

    setSubmitting(false);

    if (result.success) {
      setCreatedSessionId(result.sessionId ?? null);
      setSubmitted(true);
    } else {
      setSubmitError(result.error ?? "Something went wrong. Try again.");
    }
  };

  const back = () => {
    if (step > 0) setStep((s) => (s - 1) as Step);
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-cream">
        <div className="max-w-lg mx-auto px-6 py-16 text-center">
          <div className="w-16 h-16 bg-olive rounded-full mx-auto mb-6 flex items-center justify-center text-white text-3xl">
            ✓
          </div>
          <h1 className="font-display font-bold text-3xl text-ink mb-3 tracking-tight">
            Session live!
          </h1>
          <p className="text-muted mb-8 leading-relaxed">
            Your session is published and holds can start coming in immediately.
            Share the link with your community.
          </p>
          <div className="flex flex-col gap-3 items-center">
            {createdSessionId && (
              <button
                onClick={() => router.push(`/sessions/${createdSessionId}`)}
                className="btn-primary w-full max-w-xs"
              >
                View session page →
              </button>
            )}
            <button
              onClick={() => { setForm(INITIAL_STATE); setStep(0); setSubmitted(false); setCreatedSessionId(null); }}
              className="btn-ghost text-sm px-5 py-2.5"
            >
              Create another
            </button>
            <Link href="/host/dashboard" className="text-sm text-muted hover:text-ink transition-colors">
              Back to dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const stepTitles = [
    "Tell us about your session.",
    "When and where?",
    "Set your price.",
    "Ready to publish?",
  ];

  const stepSubtitles = [
    "What are you running?",
    "Location and timing details.",
    "You set your target. The platform handles the rest.",
    "Check everything looks right.",
  ];

  return (
    <main className="min-h-screen bg-cream">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-lg mx-auto">
        <Link href="/home" className="font-display font-bold text-xl text-ink tracking-tight">
          STRETCHY
        </Link>
        <Link href="/home" className="text-sm text-muted hover:text-ink transition-colors">
          Cancel
        </Link>
      </nav>

      <div className="max-w-lg mx-auto px-4 pb-16">
        {/* Progress */}
        <ProgressBar step={step} />

        {/* Header */}
        <div className="mb-6">
          <h1 className="font-display font-bold text-2xl text-ink tracking-tight leading-tight">
            {stepTitles[step]}
          </h1>
          <p className="text-muted text-sm mt-1">{stepSubtitles[step]}</p>
        </div>

        {/* Step content */}
        <div className="mb-8">
          {step === 0 && <StepBasics form={form} update={update} />}
          {step === 1 && <StepSchedule form={form} update={update} />}
          {step === 2 && <StepPricing form={form} update={update} />}
          {step === 3 && <StepReview form={form} />}
        </div>

        {/* Submit error */}
        {submitError && (
          <div className="mb-3 rounded-card px-4 py-3 bg-red-50 border border-red-200">
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={back}
              disabled={submitting}
              className="btn-ghost flex-shrink-0 px-5 py-3"
            >
              ← Back
            </button>
          )}
          <button
            type="button"
            onClick={advance}
            disabled={!canAdvance(step, form) || submitting}
            className={`flex-1 py-3 px-6 rounded-pill font-semibold text-base transition-all flex items-center justify-center gap-2 ${
              canAdvance(step, form) && !submitting
                ? step === 3
                  ? "bg-pink-stretchy text-white hover:brightness-110 active:scale-95"
                  : "bg-ink text-white hover:bg-olive active:scale-95"
                : "bg-border text-muted cursor-not-allowed"
            }`}
          >
            {submitting && (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {submitting ? "Publishing…" : step === 3 ? "Publish session →" : "Continue →"}
          </button>
        </div>

        {/* Validation hint */}
        {!canAdvance(step, form) && !submitting && (
          <p className="text-center text-xs text-muted mt-3">
            {step === 0 && "Choose a session type and add a title to continue."}
            {step === 1 && "Add a date, neighbourhood and venue name to continue."}
            {step === 2 && "Enter your target and spot numbers to see pricing."}
          </p>
        )}
      </div>
    </main>
  );
}
