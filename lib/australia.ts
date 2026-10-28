// Stretchy Australia (Oct 2026): Sydney first, with Brisbane / QLD, Melbourne
// and Perth / Fremantle in mind. One place for the waitlist's answer lists, the
// social links and referral grouping, used by the pop-up, /australia, the
// welcome email and HQ. Copy agreed with Kimberley, 28 Oct 2026.

export const LAUNCH_LINE = "Launching soon (yes, this side of summer!)";

export const LINKS = {
  auInstagram: { href: "https://www.instagram.com/stretchyyoga.au/", label: "@stretchyyoga.au" },
  nzInstagram: { href: "https://www.instagram.com/stretchy.yoga/", label: "@stretchy.yoga" },
  tiktok: { href: "https://www.tiktok.com/@stretchy.yoga", label: "TikTok @stretchy.yoga" },
};
/** Always shown next to the Australian Instagram. */
export const NZ_VIBES = "Check out the Auckland vibes at";

export const SYDNEY_AREAS = [
  "Eastern beaches (Bondi, Bronte, Coogee)",
  "Paddington, Woollahra & Double Bay",
  "Surry Hills & inner city",
  "Inner west (Newtown, Glebe, Balmain)",
  "North Shore",
  "Northern beaches (Manly and up)",
  "Parramatta & the west",
];
export const TIMES = [
  "Early morning (6–7am)",
  "Before work (7–8:30am)",
  "Lunchtime",
  "After work (5:30–7:30pm)",
  "Weekend mornings",
  "Weekend afternoons",
  "Pop-up events",
];
export const OTHER_CITIES = ["Brisbane", "Gold Coast & wider QLD", "Melbourne", "Perth & Fremantle"];
export const SOMEWHERE_ELSE = "Somewhere else";

const clean = (v: string) => v.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/**
 * Groups a free-text "How did you hear about us?" answer so referrals can be
 * counted. Hot Dog Yoga and Sophie Berry are tracked for a referral rate, so
 * their spellings (HD yoga, hotdog, Soph Berry…) all land in one group.
 * Anything unrecognised keeps the person's own words.
 */
export function referralGroup(raw: string | null | undefined): string | null {
  const t = clean(raw ?? "");
  if (!t) return null;
  const squashed = t.replace(/ /g, "");
  if (/ho+t+ ?d[o0]*g+|\bhd\b/.test(t) || squashed.includes("hotdog")) return "Hot Dog Yoga";
  if (/\bsoph(ie|y)?\b/.test(t) || squashed.includes("sophieberry") || squashed.includes("sophberry")) return "Sophie Berry";
  if (/insta|\big\b|ig /.test(t)) return "Instagram";
  if (/tik ?tok/.test(t)) return "TikTok";
  if (/google|search/.test(t)) return "Google";
  if (/friend|\bmates?\b|word of mouth|colleague|sister|brother|partner|mum|mom/.test(t)) return "A friend";
  return null;
}
