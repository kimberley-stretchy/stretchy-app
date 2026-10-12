import { NewTabLink, CANCELLATION_POLICY_HREF } from "@/components/PolicyLinks";

// ─── HOW TO STRETCHY ─────────────────────────────────────────────────────────
// Shared yellow explanation card (What's on). The same five steps and
// cancelling line as the homepage's "How it works" band — if one changes, change
// both. Words follow STRETCHY_WORDS.md.

const STEPS = [
  { n: "01", title: "Hold your place.", body: "We save your card and show you the most you’ll pay." },
  {
    n: "02",
    title: "36 hours out: going ahead, or not.",
    body: "If we get enough people, we’re on. Not enough? It’s called off and you pay nothing. Free cancelling ends here.",
  },
  { n: "03", title: "Still room to join.", body: "More people can join, and the price keeps dropping for everyone." },
  {
    n: "04",
    title: "2 hours out: final price charged.",
    body: "Joining closes and we charge your card the final price. The more who joined, the less it is. Never more than the max price shown.",
  },
  {
    n: "05",
    title: "Move, then the Social Stretch.",
    body: "Your teacher guides the practice, our Good Energy Managers bring the vibes. Then coffee after, pay your own way.",
  },
];

export default function HowToStretchy() {
  return (
    <div className="rounded-card p-5" style={{ backgroundColor: "#FCBB16", border: "2px solid #14110F" }}>
      <p className="font-mono text-xs font-bold uppercase tracking-[0.20em] mb-3" style={{ color: "rgba(26,26,26,0.50)" }}>
        How it works
      </p>

      <h2
        className="font-display font-bold text-ink mb-5"
        style={{ fontSize: "clamp(22px, 6vw, 28px)", letterSpacing: "-0.03em", lineHeight: "1.05" }}
      >
        The more we move together, the better it gets for all.
      </h2>

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

        {/* Cancelling — unnumbered, separated from the steps */}
        <div className="flex items-start gap-3 pt-3" style={{ borderTop: "1px solid rgba(20,17,15,.15)" }}>
          <span className="w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5 text-ink/40">—</span>
          <p className="text-sm text-ink leading-snug">
            <strong>Cancelling:</strong> free until 36 hours out. After that you&rsquo;re in, and you&rsquo;ll pay the final price. If we ever cancel, you don&rsquo;t pay.{" "}
            <NewTabLink href={CANCELLATION_POLICY_HREF} className="font-bold underline underline-offset-2 whitespace-nowrap">Cancellation policy</NewTabLink>
          </p>
        </div>
      </div>
    </div>
  );
}
