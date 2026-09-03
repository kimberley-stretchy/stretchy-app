/**
 * STRETCHY PRICING ENGINE
 *
 * pricePerPerson(n) = (costBase + revenueTarget) / max(n, minimumMats)
 *
 * - costBase: what it costs Stretchy to run the session (teacher, venue, GEM,
 *   charity contribution, running Stretchy) — set per session, no fixed platform fee
 * - revenueTarget: what the session is aiming to net on top of costBase
 * - n: number of mats currently held (price only ever drops as this rises)
 *
 * Opening price (ceiling) = price(minimumMats) — the most anyone can ever pay
 * Floor price (best case)  = price(maximumMats) — full room
 * Next price               = price(min(n+1, maximumMats)) — "one more person"
 *
 * Reference session (Herne Bay | Morning): costBase 201.25, revenueTarget 200,
 * min 14, max 32 → opening price (201.25+200)/14 = $28.66.
 *
 * Timeline: places open at 36 hours before the session (go/no-go on the
 * minimum); final price locks and cards are charged at 2 hours before.
 */

import type { PricingState, PriceCurvePoint, SessionPhase, MovementType } from "@/types";

export const DEFAULT_CURRENCY = "NZD";

/**
 * Core formula — price per person at a given headcount.
 * Rounds to 2 decimal places. Never divides by fewer than minimumMats.
 */
export function calculatePrice(
  costBase: number,
  revenueTarget: number,
  mats: number
): number {
  if (mats <= 0) return 0;
  const raw = (costBase + revenueTarget) / mats;
  return Math.round(raw * 100) / 100;
}

/** The most anyone will ever pay — price at the minimum. */
export function startingPrice(
  costBase: number,
  revenueTarget: number,
  minimumMats: number
): number {
  return calculatePrice(costBase, revenueTarget, minimumMats);
}

/** The best possible deal — price if the room fills completely. */
export function floorPrice(
  costBase: number,
  revenueTarget: number,
  maximumMats: number
): number {
  return calculatePrice(costBase, revenueTarget, maximumMats);
}

/** "One more person" — the price if headcount goes up by one, capped at the max. */
export function nextPrice(
  costBase: number,
  revenueTarget: number,
  peopleHolding: number,
  maximumMats: number
): number {
  return calculatePrice(costBase, revenueTarget, Math.min(peopleHolding + 1, maximumMats));
}

/**
 * Full pricing state for a session — everything the UI needs.
 */
export function getPricingState(
  costBase: number,
  revenueTarget: number,
  minimumMats: number,
  maximumMats: number,
  peopleHolding: number,
  phase: SessionPhase,
  currency: string = DEFAULT_CURRENCY
): PricingState {
  const ceiling = startingPrice(costBase, revenueTarget, minimumMats);
  const floor = floorPrice(costBase, revenueTarget, maximumMats);

  // Price only starts dropping once the minimum is reached
  const effectiveMats = peopleHolding >= minimumMats ? peopleHolding : minimumMats;
  const current = calculatePrice(costBase, revenueTarget, effectiveMats);
  const next = nextPrice(costBase, revenueTarget, effectiveMats, maximumMats);

  const totalDrop = ceiling - floor;
  const currentDrop = ceiling - current;
  const percentDrop = totalDrop > 0 ? Math.round((currentDrop / totalDrop) * 100) : 0;

  return {
    startingPrice: ceiling,
    currentPrice: current,
    floorPrice: floor,
    nextPrice: next,
    costBase,
    revenueTarget,
    minimumMats,
    maximumMats,
    peopleHolding,
    pricePercentDrop: percentDrop,
    matsUntilMin: Math.max(0, minimumMats - peopleHolding),
    phase,
    currency,
  };
}

/**
 * Data points for the price curve chart — headcount from minimumMats → maximumMats.
 */
export function getPriceCurve(
  costBase: number,
  revenueTarget: number,
  minimumMats: number,
  maximumMats: number,
  peopleHolding: number
): PriceCurvePoint[] {
  const points: PriceCurvePoint[] = [];
  const step = Math.max(1, Math.floor((maximumMats - minimumMats) / 10));

  for (let mats = minimumMats; mats <= maximumMats; mats += step) {
    points.push({
      spots: mats,
      price: calculatePrice(costBase, revenueTarget, mats),
      isCurrent: mats === Math.min(Math.max(peopleHolding, minimumMats), maximumMats),
      isMin: mats === minimumMats,
      isMax: mats === maximumMats,
    });
  }

  if (points[points.length - 1]?.spots !== maximumMats) {
    points.push({
      spots: maximumMats,
      price: calculatePrice(costBase, revenueTarget, maximumMats),
      isMax: true,
    });
  }

  return points;
}

/**
 * The host pricing prompt — the "sanity check" shown when building a session.
 * Tells the host if their pricing feels about right vs. market rate.
 */
export function getHostPricingPrompt(
  movementType: MovementType,
  durationMinutes: number,
  costBase: number,
  revenueTarget: number,
  minimumMats: number
): { message: string; marketMin: number; marketMax: number; suggestedPrice: number } {
  // NZ Auckland market rates (approximate — host can always override)
  const marketRates: Record<MovementType, { min: number; max: number }> = {
    yoga: { min: 25, max: 35 },
    pilates: { min: 28, max: 40 },
    run: { min: 10, max: 20 },
    breath: { min: 35, max: 60 },
    sound: { min: 40, max: 80 },
    flow: { min: 25, max: 38 },
    hiit: { min: 20, max: 30 },
  };

  const durationMultiplier = durationMinutes > 75 ? durationMinutes / 60 : 1;
  const base = marketRates[movementType] ?? marketRates.yoga;
  const marketMin = Math.round(base.min * durationMultiplier);
  const marketMax = Math.round(base.max * durationMultiplier);

  const suggestedPrice = startingPrice(costBase, revenueTarget, minimumMats);

  const sessionLabel =
    durationMinutes === 60
      ? "60-min"
      : durationMinutes === 45
      ? "45-min"
      : durationMinutes >= 120
      ? `${durationMinutes / 60}-hour`
      : `${durationMinutes}-min`;

  const message =
    `For a ${sessionLabel} ${movementType} in Auckland, fair market range is $${marketMin}–$${marketMax}. ` +
    `At $${costBase} cost base + $${revenueTarget} target with ${minimumMats} minimum mats, your opening price is $${suggestedPrice.toFixed(2)}. ` +
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
 *
 * Places open 36 hours before the session (go/no-go on the minimum);
 * the final price locks and cards are charged 2 hours before.
 */
export function getSessionPhase(
  startsAt: Date,
  peopleHolding: number,
  minimumMats: number,
  confirmedAt?: Date,
  lockedAt?: Date,
  cancelledAt?: Date
): SessionPhase {
  if (cancelledAt) return "CANCELLED";

  const now = new Date();
  const sessionTime = new Date(startsAt);
  const twoHoursBefore = new Date(sessionTime.getTime() - 2 * 60 * 60 * 1000);
  const thirtySixHoursBefore = new Date(sessionTime.getTime() - 36 * 60 * 60 * 1000);

  if (lockedAt || now >= twoHoursBefore) return "LOCKED";
  if (confirmedAt) return "CONFIRMED";
  if (now >= thirtySixHoursBefore && !confirmedAt) return "CANCELLED"; // auto-cancel — minimum wasn't met
  if (peopleHolding >= minimumMats) return "HOLD_DROPPING";
  return "HOLD_BELOW_MIN";
}

/**
 * Human-readable status label + colour for session cards.
 */
export function getSessionStatusDisplay(
  peopleHolding: number,
  minimumMats: number,
  maximumMats: number,
  phase: SessionPhase
): { label: string; color: "pink" | "yellow" | "deep-yellow" | "hot-pink" | "green" | "grey" } {
  if (phase === "CANCELLED") return { label: "Cancelled", color: "grey" };
  if (phase === "LOCKED" || phase === "COMPLETED") return { label: "Locked in", color: "green" };

  const fillPercent = peopleHolding / maximumMats;

  if (fillPercent >= 0.8) return { label: "⚡ Almost full", color: "hot-pink" };
  if (fillPercent >= 0.75) return { label: "Filling fast", color: "deep-yellow" };
  if (peopleHolding >= minimumMats) return { label: "Price better-ing", color: "yellow" };
  return { label: `${Math.max(0, minimumMats - peopleHolding)} spots to go ahead`, color: "pink" };
}

/**
 * Format a price using the session's currency (defaults to NZD).
 */
export function formatPrice(price: number, currency: string = DEFAULT_CURRENCY): string {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Simulate what happens if more people join.
 * Used for the "see the price drop → add a person" slider / room simulator.
 */
export function simulatePriceDrop(
  costBase: number,
  revenueTarget: number,
  peopleHolding: number,
  additionalPeople: number
): { newPrice: number; saving: number; savingPercent: number } {
  const currentPrice = calculatePrice(costBase, revenueTarget, peopleHolding);
  const newPrice = calculatePrice(costBase, revenueTarget, peopleHolding + additionalPeople);
  const saving = currentPrice - newPrice;
  const savingPercent = currentPrice > 0 ? Math.round((saving / currentPrice) * 100) : 0;
  return { newPrice, saving, savingPercent };
}
