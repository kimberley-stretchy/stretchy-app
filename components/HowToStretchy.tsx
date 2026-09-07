// ─── HOW TO STRETCHY ─────────────────────────────────────────────────────────
// Shared yellow explanation card. Single source of truth — edit here, updates everywhere.

const STEPS = [
  {
    n: "01",
    title: "Hold your place.",
    body: "Nothing is charged yet. You see the most you could ever pay, up front. Session confirmed at 36 hours before — no cancellation from this point, just gets better.",
  },
  {
    n: "02",
    title: "The room fills, gets better for all.",
    body: "Once the minimum viable mats are reached, the session is locked in. Your final price is locked 2 hours out.",
  },
  {
    n: "03",
    title: "We move together.",
    body: "Your teacher guides the practice, and our Good Energy Managers are there for the community vibes.",
  },
  {
    n: "04",
    title: "The Social Stretch.",
    body: "The fun bit after the bit. Café, bar, grass. Always say “kia ora” to someone new. (Pay your own way for food & drink.)",
  },
];

const NOTE =
  "Can’t make it? Cancel free before the 36-hour mark. After that, the price stands — that’s what keeps it fair for everyone showing up. Can’t make it happen on our end? You’re refunded in full, always.";

export default function HowToStretchy() {
  return (
    <div className="rounded-card p-5" style={{ backgroundColor: "#FCBB16", border: "2px solid #14110F" }}>

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
        {STEPS.map(({ n, title, body }) => (
          <div key={n} className="flex items-start gap-3">
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5"
              style={{ backgroundColor: "#14110F" }}
            >
              {n}
            </span>
            <p className="text-sm text-ink leading-snug">
              <strong>{title}</strong> {body}
            </p>
          </div>
        ))}

        {/* Cancellation note — unnumbered, separated from the steps */}
        <div className="flex items-start gap-3 pt-3" style={{ borderTop: "1px solid rgba(20,17,15,.15)" }}>
          <span className="w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5 text-ink/40">—</span>
          <p className="text-sm text-ink leading-snug">{NOTE}</p>
        </div>
      </div>
    </div>
  );
}
