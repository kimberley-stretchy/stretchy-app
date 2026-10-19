import { formatPrice, priceHasDropped } from "@/lib/pricing";

// The prices under the people dots: the price at the minimum under the left
// end, the full-room price under the right end — and, once the session is past
// its minimum, "CURRENT $21.30 PP" under the dot for the latest person in
// (PP = per person; there isn't room to spell it out under the dots).
// The big price above stays the "max per person" cap.
export default function PriceEnds({
  openingPrice,
  floorPrice,
  nowPrice,
  held,
  max,
  className,
  showEnds = true,
}: {
  openingPrice: number;
  floorPrice: number;
  /** The price right now (lib/pricing → priceRightNow). */
  nowPrice?: number;
  held: number;
  max: number;
  className: string;
  /** false = only the CURRENT label (cards that don't show the end prices). */
  showEnds?: boolean;
}) {
  const showNow = nowPrice != null && held > 0 && held < max && priceHasDropped(nowPrice, openingPrice);
  // Where the latest person's dot sits, 0 (first dot) → 1 (last dot).
  const at = max > 1 ? Math.min(Math.max((held - 1) / (max - 1), 0), 1) : 0;
  // Too close to either end and it would sit on top of the end prices, so it
  // drops onto its own line instead.
  const fitsUnderDot = !showEnds || (at >= 0.22 && at <= 0.78);
  if (!showEnds && !showNow) return null;
  const current = showNow ? <span className="whitespace-nowrap text-ink">CURRENT {formatPrice(nowPrice!)} PP</span> : null;

  return (
    <div className={className}>
      <div className="relative flex justify-between gap-2.5">
        <span className={showEnds ? "" : "invisible"}>{formatPrice(openingPrice)}</span>
        {current && fitsUnderDot && (
          <span className="absolute top-0" style={{ left: `${at * 100}%`, transform: `translateX(-${at * 100}%)` }}>
            {current}
          </span>
        )}
        <span className={showEnds ? "" : "invisible"}>{formatPrice(floorPrice)}</span>
      </div>
      {current && !fitsUnderDot && <div className="mt-1 text-right">{current}</div>}
    </div>
  );
}
