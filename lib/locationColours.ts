// Each Stretchy location has its own colour, used on session cards, the
// session page and lists (agreed with Kimberley, Oct 2026):
//   Herne Bay → purple · Ōrākei → orange · St Heliers → yellow · Ponsonby → blue
// Anywhere else falls back to the colour for the type of movement.

export type LocationTheme = {
  /** Fills: badges, pills, filled dots. */
  accent: string;
  /** Text on top of an accent fill (yellow needs ink, the rest take white). */
  onAccent: string;
  /** Accent-coloured text on a white/cream background (yellow isn't readable there). */
  textAccent: string;
};

const PURPLE = "#902F8A";
const ORANGE = "#E96709";
const YELLOW = "#FCBB16";
const BLUE = "#0000FF";
const INK = "#14110F";
const WHITE = "#FFFFFF";

const PLACES: { match: string[]; accent: string }[] = [
  { match: ["herne bay"], accent: PURPLE },
  { match: ["orakei"], accent: ORANGE },
  { match: ["st heliers", "saint heliers", "st. heliers"], accent: YELLOW },
  { match: ["ponsonby"], accent: BLUE },
];

const MOVEMENT: Record<string, string> = {
  yoga: PURPLE, pilates: BLUE, breath: "#29ABE2", sound: "#716F39", flow: YELLOW, run: ORANGE, hiit: PURPLE,
};

// "Ōrākei" → "orakei": drop macrons and case so any spelling matches.
const plain = (v?: string | null) => (v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function theme(accent: string): LocationTheme {
  const yellow = accent === YELLOW;
  return { accent, onAccent: yellow ? INK : WHITE, textAccent: yellow ? INK : accent };
}

export function locationTheme(s: {
  title?: string | null;
  location_name?: string | null;
  location_address?: string | null;
  movement_type?: string | null;
}): LocationTheme {
  // The title's area ("Herne Bay | Morning") first, then the venue and address.
  for (const text of [s.title?.split("|")[0], s.location_name, s.location_address]) {
    const t = plain(text);
    if (!t) continue;
    const hit = PLACES.find((p) => p.match.some((m) => t.includes(m)));
    if (hit) return theme(hit.accent);
  }
  return theme(MOVEMENT[s.movement_type ?? ""] ?? PURPLE);
}
