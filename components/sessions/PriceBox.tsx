import CapacityPips from "@/components/CapacityPips";
import { formatPrice, priceHasDropped } from "@/lib/pricing";
import PriceEnds from "@/components/PriceEnds";

// The price block in a 2px ink outline box — the same block as the homepage
// card: big price + caption, "{label}" / "{max} MAX", dots with the minimum
// line, and the max / floor prices under the two ends.
// COPY_REFRESH_HANDOVER.md section 4.
export default function PriceBox({
  price,
  label,
  held,
  min,
  max,
  openingPrice,
  floorPrice,
  accent = "#902F8A",
  nowPrice,
}: {
  /** The big number: the most this person can pay (lib/pricing → maxPriceToPromise). */
  price: number;
  /** "10 more to go ahead" / "17 in · still room to join". */
  label: string;
  held: number;
  min: number;
  max: number;
  /** Price at the minimum — sits under the first dot. */
  openingPrice: number;
  /** Price with every place taken — sits under the last dot. */
  floorPrice: number;
  accent?: string;
  /** The price right now (lib/pricing → priceRightNow). Shown big once it's below the cap. */
  nowPrice?: number;
}) {
  const dropped = nowPrice != null && priceHasDropped(nowPrice, price);
  return (
    <div className="border-2 border-ink rounded-[22px] p-4 flex flex-col gap-[10px] bg-cream">
      <div>
        <p className="m-0 font-mono font-extrabold text-ink leading-none tabular-nums" style={{ fontSize: 44 }}>
          {formatPrice(dropped ? nowPrice! : price)}
        </p>
        <p className="m-0 mt-1 text-[13px] text-ink/60">
          {dropped ? <>right now &middot; never more than <strong className="text-ink">{formatPrice(price)}</strong> &middot; incl. GST</> : <>max per person &middot; incl. GST</>}
        </p>
      </div>
      <div className="flex justify-between gap-3 font-mono text-[11px] font-extrabold tracking-[0.08em] uppercase text-ink/60">
        <span className="text-ink">{label}</span>
        <span className="whitespace-nowrap">{max} max</span>
      </div>
      <div role="img" aria-label={`${held} of ${max} places held, goes ahead at ${min}`}>
        <CapacityPips min={min} max={max} held={held} accent={accent} showMinLine />
      </div>
      <PriceEnds
        className="font-mono text-[11px] font-extrabold tracking-[0.08em] text-ink/60"
        openingPrice={openingPrice}
        floorPrice={floorPrice}
        nowPrice={nowPrice}
        held={held}
        max={max}
      />
    </div>
  );
}
