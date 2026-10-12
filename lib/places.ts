// ─────────────────────────────────────────────────────────────────────────────
// Wording for holding one place or several. Every page and email asks this file
// rather than writing its own "place / places" logic, so they can't drift.
// Words follow STRETCHY_WORDS.md ("your place", never "spot").
// See COPY_REFRESH_HANDOVER.md section 1, "Holding more than one place".
// ─────────────────────────────────────────────────────────────────────────────

/** A hold always covers at least one place. */
export const placeCount = (n?: number | null) => Math.max(1, Math.floor(n ?? 1));

/** "your place" · "your 3 places" */
export function yourPlaces(n?: number | null): string {
  const c = placeCount(n);
  return c === 1 ? "your place" : `your ${c} places`;
}

/** "Your place is held." · "Your 3 places are held." */
export function heldHeadline(n?: number | null): string {
  const c = placeCount(n);
  return c === 1 ? "Your place is held." : `Your ${c} places are held.`;
}

/** "you" · "you and your crew" — for intros. */
export function youOrCrew(n?: number | null): string {
  return placeCount(n) === 1 ? "you" : "you and your crew";
}

/** "Cancel my hold" · "Change or cancel places" */
export function cancelLabel(n?: number | null): string {
  return placeCount(n) === 1 ? "Cancel my hold" : "Change or cancel places";
}

const dollars = (amount: number) => `$${amount.toFixed(2)}`;

/**
 * The price row.
 *   1 place  → bold "$22.82 max per person"
 *   3 places → bold "$68.46 max for your 3 places", grey lead "$22.82 max per person."
 * The total here is for display only. Anything actually charged is worked out on
 * the server (lib/pricing.ts + the lock-in job), never from this.
 */
export function priceRow(maxPerPerson: number, n?: number | null): { bold: string; greyLead: string | null } {
  const c = placeCount(n);
  if (c === 1) return { bold: `${dollars(maxPerPerson)} max per person`, greyLead: null };
  // Total built from whole cents per person, the same way the charge is.
  const totalCents = Math.round(maxPerPerson * 100) * c;
  return {
    bold: `${dollars(totalCents / 100)} max for your ${c} places`,
    greyLead: `${dollars(maxPerPerson)} max per person.`,
  };
}

/**
 * The grey "bring with you" line. HQ's note as written for one place; for more,
 * it starts "For all 3 of you." Returns null when there's nothing to show.
 */
export function bringNote(note?: string | null, n?: number | null): string | null {
  const c = placeCount(n);
  const text = (note ?? "").trim();
  if (c === 1) return text || null;
  return `For all ${c} of you.${text ? ` ${text}` : ""}`;
}

/** "10 more to go ahead" (null once the minimum is reached). */
export function moreToGoAhead(held: number, min: number): string | null {
  const need = Math.max(0, min - held);
  return need > 0 ? `${need} more to go ahead` : null;
}

/** "17 in · still room to join" */
export function inAndRoom(held: number): string {
  return `${held} in · still room to join`;
}

/**
 * The one-line "how's the room doing" label used on every card, above the dots:
 *   under the minimum            → "10 more to go ahead"
 *   confirmed (36 hrs out or HQ) → "Going ahead ✓ · still room to join"
 *   minimum reached, not yet 36  → "17 in · still room to join"
 *   every place taken            → "Full" / "Going ahead ✓ · full"
 * "Going ahead ✓" is only ever said once the session is actually confirmed —
 * before 36 hrs out people can still cancel for free, so reaching the minimum
 * isn't a promise yet.
 */
export function roomLabel(held: number, min: number, max: number, confirmed: boolean): string {
  const full = held >= max;
  if (confirmed) return full ? "Going ahead ✓ · full" : "Going ahead ✓ · still room to join";
  if (full) return "Full";
  return moreToGoAhead(held, min) ?? inAndRoom(held);
}
