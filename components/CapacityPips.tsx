// Shared room-capacity indicator — one pip per spot in the whole room (max
// capacity), not just up to the minimum. Three visual states per pip:
//   filled        — someone's holding that spot (the card's accent colour)
//   priority zone — still-empty spot within the minimum needed to go ahead
//                   (light grey block — "cover these first")
//   bonus zone    — still-empty spot beyond the minimum (faint outline only,
//                   de-emphasised since the session already works without it)
export default function CapacityPips({
  min,
  max,
  held,
  accent,
  pipClassName = "flex-1 h-[14px] lg:h-[18px] rounded-pill border-[1.5px]",
  gapClassName = "flex gap-[2px] lg:gap-[3px]",
}: {
  min: number;
  max: number;
  held: number;
  accent: string;
  pipClassName?: string;
  gapClassName?: string;
}) {
  return (
    <div className={gapClassName}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < held;
        const withinMin = i < min;
        const style = filled
          ? { backgroundColor: accent, borderColor: accent }
          : withinMin
          ? { backgroundColor: "#E1D5C6", borderColor: "#E1D5C6" }
          : { backgroundColor: "transparent", borderColor: "rgba(20,17,15,.15)" };
        return <div key={i} className={pipClassName} style={style} />;
      })}
    </div>
  );
}
