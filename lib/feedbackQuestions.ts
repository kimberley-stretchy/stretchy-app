// The quick questions on stretchyyoga.co.nz/rate/[session] — tap an answer,
// or "Other" to write your own. One place for the page, the server check and
// HQ's tallies.

export type FeedbackQuestion = {
  k: string;
  q: string;
  /** Tap-to-pick answers. Leave empty for a write-in question. */
  options: string[];
  /** Pick more than one. */
  multi?: boolean;
  /** Adds an "Other" chip that opens a text box. */
  other?: boolean;
  placeholder?: string;
};

export const FEEDBACK_QUESTIONS: FeedbackQuestion[] = [
  { k: "overall", q: "How was your overall experience?", options: ["Loved it", "Really good", "It was OK", "Not for me"], other: true },
  { k: "booking", q: "How was the booking experience?", options: ["Easy", "Mostly easy", "A bit confusing", "Hard"], other: true },
  { k: "pricing", q: "People-powered Pricing: what did you think?", options: ["Got it, love it", "Got it", "Not sure I understand it", "Don’t get it yet"], other: true },
  { k: "social", q: "How was the Social Stretch?", options: ["Loved it", "Good chats", "Didn’t stay this time", "Not for me"], other: true },
  { k: "feeling", q: "What was your overall feeling of Stretchy?", options: ["Welcoming", "Fun", "Calm", "Social", "Energising", "Good value", "A bit much"], multi: true, other: true },
  { k: "improve", q: "What can we do to improve?", options: ["Times", "Locations", "Booking", "Price", "The class", "Social Stretch", "Communication"], multi: true, other: true },
  { k: "more", q: "More of?", options: ["More sessions", "More locations", "Different times", "Different styles", "More social", "Events"], multi: true, other: true },
  { k: "less", q: "Less of?", options: ["Emails", "Notifications", "Fine print", "Nothing, it’s great"], multi: true, other: true },
  { k: "comments", q: "Any comments or feedback for Stretchy?", options: [], placeholder: "Anything at all. We read every one." },
];

export const OTHER = "Other";

/** Keep only answers we asked for, in the shapes we expect. */
export function cleanAnswers(raw: unknown): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {};
  if (!raw || typeof raw !== "object") return out;
  const r = raw as Record<string, unknown>;
  const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : "");
  for (const q of FEEDBACK_QUESTIONS) {
    const allowed = q.other ? [...q.options, OTHER] : q.options;
    if (q.options.length === 0) {
      const t = text(r[q.k], 2000);
      if (t) out[q.k] = t;
      continue;
    }
    if (q.multi) {
      const list = Array.isArray(r[q.k]) ? (r[q.k] as unknown[]).filter((x): x is string => typeof x === "string" && allowed.includes(x)) : [];
      if (list.length) out[q.k] = Array.from(new Set(list));
    } else if (typeof r[q.k] === "string" && allowed.includes(r[q.k] as string)) {
      out[q.k] = r[q.k] as string;
    }
    const other = text(r[`${q.k}_other`], 300);
    if (q.other && other) out[`${q.k}_other`] = other;
  }
  return out;
}
