/**
 * STRETCHY PRICING ENGINE
 *
 * The formula: (hostTarget + $20 + GST) ÷ currentSpots = price per person
 *
 * - hostTarget: what the host needs to earn (NZD, set by host)
 * - $20 + GST: Stretchy platform fee per session ($23 NZD — GST is 15% in NZ)
 * - currentSpots: number of confirmed holds (price drops as this goes up)
 *
 * Starting price (ceiling): (hostTarget + 23) ÷ minimumSpots
 * Floor price (best deal): (hostTarget + 23) ÷ maxCapacity
 *
 * Example: $200 target, 8 minimum spots → ($200 + $23) ÷ 8 = $27.88 ≈ $28
 */

import type { PricingState, PriceCurvePoint, SessionPhase } from "@/types";

// NZ GST rate is 15%
const STRETCHY_BASE_FEE = 20;
const GST_RATE = 0.15;
export const STRETCHY_FEE = STRETCHY_BASE_FEE * (1 + GST_RATE); // $23.00

/**
 * Core formula — price per person at any number of spots.
 * Rounds to 2 decimal places.
 */
export function calculatePrice(hostTarget: number, spots: number): number {
  if (spots <= 0) return 0;
  const raw = (hostTarget + STRETCHY_FEE) / spots;
  return Math.round(raw * 100) / 100;
}

/**
 * The most anyone will ever pay — price at minimum spots.
 */
export function startingPrice(hostTarget: number, minimumSpots: number): number {
  return calculatePrice(hostTarget, minimumSpots);
}

/**
 * The best possible deal — price if the venue fills completely.
 */
export function floorPrice(hostTarget: number, maxCapacity: number): number {
  return calculatePrice(hostTarget, maxCapacity);
}

/**
 * Full pricing state for a session — everything the UI needs.
 */
export function getPricingState(
  hostTarget: number,
  minimumSpots: number,
  maxCapacity: number,
  currentSpots: number,
  phase: SessionPhase
): PricingState {
  const ceiling = startingPrice(hostTarget, minimumSpots);
  const floor = floorPrice(hostTarget, maxCapacity);

  // Price only starts dropping once minimum is reached
  const activeSpots = currentSpots >= minimumSpots ? currentSpots : minimumSpots;
  const current = calculatePrice(hostTarget, activeSpots);

  // How far we've dropped as a percentage (0 = at ceiling, 100 = at floor)
  const totalDrop = ceiling - floor;
  const currentDrop = ceiling - current;
  const percentDrop = totalDrop > 0 ? Math.round((currentDrop / totalDrop) * 100) : 0;

  return {
    startingPrice: ceiling,
    currentPrice: current,
    floorPrice: floor,
    stretchyFee: STRETCHY_FEE,
    hostTarget,
    minimumSpots,
    currentSpots,
    maxCapacity,
    pricePercentDrop: percentDrop,
    spotsUntilMin: Math.max(0, minimumSpots - currentSpots),
    phase,
  };
}

/**
 * Data points for the price curve chart.
 * Shows price from minimumSpots → maxCapacity.
 */
export function getPriceCurve(
  hostTarget: number,
  minimumSpots: number,
  maxCapacity: number,
  currentSpots: number
): PriceCurvePoint[] {
  const points: PriceCurvePoint[] = [];
  const step = Math.max(1, Math.floor((maxCapacity - minimumSpots) / 10));

  for (let spots = minimumSpots; spots <= maxCapacity; spots += step) {
    points.push({
      spots,
      price: calculatePrice(hostTarget, spots),
      isCurrent: spots === Math.min(Math.max(currentSpots, minimumSpots), maxCapacity),
      isMin: spots === minimumSpots,
      isMax: spots === maxCapacity,
    });
  }

  // Always include max capacity as last point
  if (points[points.length - 1]?.spots !== maxCapacity) {
    points.push({
      spots: maxCapacity,
      price: calculatePrice(hostTarget, maxCapacity),
      isMax: true,
    });
  }

  return points;
}

/**
 * The host pricing prompt — the "sanity check" shown when creating a session.
 * Tells the host if their pricing feels about right vs. market rate.
 */
export function getHostPricingPrompt(
  sessionType: string,
  durationMinutes: number,
  hostTarget: number,
  minimumSpots: number
): { message: string; marketMin: number; marketMax: number; suggestedPrice: number } {
  // NZ Auckland market rates (approximate — host can always override)
  const marketRates: Record<string, { min: number; max: number }> = {
    yoga: { min: 25, max: 35 },
    pilates: { min: 28, max: 40 },
    run_club: { min: 10, max: 20 },
    breathwork: { min: 35, max: 60 },
    sound_bath: { min: 40, max: 80 },
    dance: { min: 20, max: 35 },
    hiit: { min: 20, max: 30 },
    other: { min: 20, max: 40 },
  };

  // For longer sessions, scale up market rates
  const durationMultiplier = durationMinutes > 75 ? durationMinutes / 60 : 1;
  const base = marketRates[sessionType] || marketRates.other;
  const marketMin = Math.round(base.min * durationMultiplier);
  const marketMax = Math.round(base.max * durationMultiplier);

  const suggestedPrice = startingPrice(hostTarget, minimumSpots);

  const sessionLabel =
    durationMinutes === 60
      ? "60-min"
      : durationMinutes === 45
      ? "45-min"
      : durationMinutes >= 120
      ? `${durationMinutes / 60}-hour`
      : `${durationMinutes}-min`;

  const typeLabel = sessionType.replace("_", " ");

  const message =
    `For a ${sessionLabel} ${typeLabel} in Auckland, fair market range is $${marketMin}–$${marketMax}. ` +
    `At your $${hostTarget} target with ${minimumSpots} minimum spots, your starting price is $${suggestedPrice.toFixed(2)}. ` +
    (suggestedPrice >= marketMin && suggestedPrice <= marketMax
      ? "Feels about right."
      : suggestedPrice < marketMin
      ? "That's generous — your community will love it."
      : "That's above market — make sure your session is worth it.");

  return { message, marketMin, marketMax, suggestedPrice };
}

/**
 * Determine what phase a session is in based on its data.
 * Used to drive UI state and automation triggers.
 */
export function getSessionPhase(
  startsAt: Date,
  currentHolds: number,
  minimumSpots: number,
  confirmedAt?: Date,
  lockedAt?: Date,
  cancelledAt?: Date
): SessionPhase {
  if (cancelledAt) return "CANCELLED";

  const now = new Date();
  const sessionTime = new Date(startsAt);
  const twoHoursBefore = new Date(sessionTime.getTime() - 2 * 60 * 60 * 1000);
  const twentyFourHoursBefore = new Date(sessionTime.getTime() - 24 * 60 * 60 * 1000);

  if (lockedAt || now >= twoHoursBefore) return "LOCKED";
  if (confirmedAt) return "CONFIRMED";
  if (now >= twentyFourHoursBefore && !confirmedAt) return "CANCELLED"; // auto-cancel
  if (currentHolds >= minimumSpots) return "HOLD_DROPPING";
  return "HOLD_BELOW_MIN";
}

/**
 * Human-readable status label + colour for session cards.
 */
export function getSessionStatusDisplay(
  currentSpots: number,
  minimumSpots: number,
  maxCapacity: number,
  phase: SessionPhase
): { label: string; color: "pink" | "yellow" | "deep-yellow" | "hot-pink" | "green" | "grey" } {
  if (phase === "CANCELLED") return { label: "Cancelled", color: "grey" };
  if (phase === "LOCKED" || phase === "COMPLETED") return { label: "Locked in", color: "green" };

  const fillPercent = currentSpots / maxCapacity;

  if (fillPercent >= 0.8) return { label: "⚡ Almost full", color: "hot-pink" };
  if (fillPercent >= 0.75) return { label: "Filling fast", color: "deep-yellow" };
  if (currentSpots >= minimumSpots) return { label: "Price dropping", color: "yellow" };
  return { label: "Open", color: "pink" };
}

/**
 * Format price as NZD string.
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Simulate what happens if one more person joins.
 * Used for the "see the price drop → add a person" slider.
 */
export function simulatePriceDrop(
  hostTarget: number,
  currentSpots: number,
  additionalPeople: number
): { newPrice: number; saving: number; savingPercent: number } {
  const currentPrice = calculatePrice(hostTarget, currentSpots);
  const newPrice = calculatePrice(hostTarget, currentSpots + additionalPeople);
  const saving = currentPrice - newPrice;
  const savingPercent = Math.round((saving / currentPrice) * 100);
  return { newPrice, saving, savingPercent };
}
