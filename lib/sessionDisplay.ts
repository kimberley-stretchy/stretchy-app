// ─────────────────────────────────────────────────────────────────────────────
// Turning a session's raw fields into the words shown on the session page,
// Manage my booking and (later) emails. Everything comes from the session —
// nothing is hard-coded — and anything that can't be worked out comes back
// empty so its row is hidden, never shown as "TBC".
// COPY_REFRESH_HANDOVER.md section 1, "Everything is dynamic".
// ─────────────────────────────────────────────────────────────────────────────

const MOVEMENT_LABELS: Record<string, string> = {
  yoga: "Yoga",
  pilates: "Pilates",
  breath: "Breathwork",
  breathwork: "Breathwork",
  sound: "Sound bath",
  sound_bath: "Sound bath",
  run: "Run club",
  run_club: "Run club",
  flow: "Flow",
  hiit: "HIIT",
  dance: "Dance",
  other: "Movement",
};

export function movementName(type?: string | null): string {
  if (!type) return "Movement";
  return MOVEMENT_LABELS[type] ?? type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, " ");
}

/**
 * HQ writes style and level in one field, "Vinyasa · all levels".
 *   → style "Vinyasa yoga", level "all levels"
 * With nothing written: style "Yoga", no level.
 */
export function styleAndLevel(description?: string | null, movementType?: string | null): { style: string; level: string | null } {
  const movement = movementName(movementType);
  const parts = (description ?? "").split(/\s*[·|]\s*/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return { style: movement, level: null };
  const first = parts[0];
  const style = first.toLowerCase().includes(movement.toLowerCase()) ? first : `${first} ${movement.toLowerCase()}`;
  return { style, level: parts.slice(1).join(" · ") || null };
}

/**
 * The suburb, for "Bayfield Primary School Hall | Herne Bay". Sessions have no
 * suburb field, so: the part of the address before the city ("…, Herne Bay,
 * Auckland"), else the first half of a "Herne Bay | Morning" title, else nothing.
 */
export function suburbOf(session: { location_address?: string | null; title?: string | null }): string | null {
  const parts = (session.location_address ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)
    .filter((p) => !/^(auckland|tāmaki makaurau|new zealand|aotearoa|nz)\b/i.test(p) && !/^\d{4}$/.test(p));
  if (parts.length >= 2) return parts[parts.length - 1];
  const fromTitle = (session.title ?? "").split("|")[0]?.trim();
  if (fromTitle && (session.title ?? "").includes("|")) return fromTitle;
  return null;
}

/** "Bayfield Primary School Hall | Herne Bay" (just the venue if no suburb). */
export function venueLine(session: { location_name?: string | null; location_address?: string | null; title?: string | null }, separator = " | "): string {
  const venue = (session.location_name ?? "").trim();
  const suburb = suburbOf(session);
  if (!suburb || venue.toLowerCase().includes(suburb.toLowerCase())) return venue;
  return venue ? `${venue}${separator}${suburb}` : suburb;
}

/** "Meet your teacher, Gamo, and your GEM (Esmay)." — teacher first, GEM only if assigned. */
export function meetLine(teacherName?: string | null, gemName?: string | null): string | null {
  const t = (teacherName ?? "").trim();
  const g = (gemName ?? "").trim();
  if (t && g) return `Meet your teacher, ${t}, and your GEM (${g}).`;
  if (t) return `Meet your teacher, ${t}.`;
  if (g) return `Meet your GEM, ${g}.`;
  return null;
}
