// ─── HOW TO STRETCHY ─────────────────────────────────────────────────────────
// Shared yellow explanation card. Single source of truth — edit here, updates everywhere.

const STEPS = [
  {
    n: 1,
    title: "A session is listed.",
    body: "Price starts at a max. There's a minimum number of people needed to make it happen.",
    blue: false,
  },
  {
    n: 2,
    title: "Hold your place.",
    body: "No charge yet. Once enough people hold, the session is on — and the price starts dropping. Tell a mate. Tell a workmate. Tell a random.",
    blue: false,
  },
  {
    n: 3,
    title: "24 hours out — go or no go.",
    body: "Minimum met? Session confirmed. The more people who join from here, the lower everyone's price. No cancellations from this point.",
    blue: false,
  },
  {
    n: 4,
    title: "Two hours out — doors close.",
    body: "Final price locks. Everyone pays. That's it.",
    blue: false,
  },
  {
    n: 5,
    title: "Show up. Move. Social stretch.",
    body: "✌️",
    blue: true, // blue dot for step 5
  },
];

export default function HowToStretchy() {
  return (
    <div className="rounded-card p-5" style={{ backgroundColor: "#FFD166" }}>

      {/* Label */}
      <p
        className="font-mono text-xs font-bold uppercase tracking-[0.20em] mb-3"
        style={{ color: "rgba(26,26,26,0.50)" }}
      >
        How to Stretchy
      </p>

      {/* Headline */}
      <h2
        className="font-display font-bold text-ink mb-5"
        style={{ fontSize: "clamp(22px, 6vw, 28px)", letterSpacing: "-0.03em", lineHeight: "1.05" }}
      >
        The more who join,<br />the less you pay.
      </h2>

      {/* Steps */}
      <div className="space-y-4">
        {STEPS.map(({ n, title, body, blue }) => (
          <div key={n} className="flex items-start gap-3">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
              style={{ backgroundColor: blue ? "#2C8FE0" : "#1A1A1A" }}
            >
              {n}
            </span>
            <p className="text-sm text-ink leading-snug">
              <strong>{title}</strong>{body ? <> {body}</> : null}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
