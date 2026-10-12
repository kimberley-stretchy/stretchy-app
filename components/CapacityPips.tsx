import { Fragment } from "react";

// Shared room-capacity indicator — one pip per place in the whole room (max
// capacity), not just up to the minimum. Three visual states per pip:
//   filled        — someone's holding that place (the card's accent colour)
//   priority zone — still-empty place within the minimum needed to go ahead
//                   (sand block — "cover these first")
//   bonus zone    — still-empty place beyond the minimum (faint outline only,
//                   de-emphasised since the session already works without it)
//
// Two optional extras (COPY_REFRESH_HANDOVER.md section 1):
//   showMinLine — a dashed vertical ink line after the last minimum pip, so
//                 "this many and we're on" is visible at a glance
//   mine        — how many places the signed-in person holds; those pips (the
//                 last `mine` of the filled ones) get a thin ink outline so
//                 they can see themselves in the room
export default function CapacityPips({
  min,
  max,
  held,
  accent,
  showMinLine = false,
  mine = 0,
  // Always a true circle: width and height locked 1:1, capped at the old pip
  // height so they shrink on narrow screens but never stretch into ovals on
  // wide ones. `justify-between` keeps the first and last dot lined up with
  // the labels above and the prices below.
  pipClassName = "flex-1 self-center aspect-square max-w-[14px] lg:max-w-[18px] rounded-full border-[1.5px]",
  gapClassName = "flex items-center justify-between gap-[2px] lg:gap-[3px]",
}: {
  min: number;
  max: number;
  held: number;
  accent: string;
  showMinLine?: boolean;
  mine?: number;
  pipClassName?: string;
  gapClassName?: string;
}) {
  // Never outline more pips than are actually filled.
  const mineCount = Math.max(0, Math.min(mine, held, max));
  // The line only means something when the minimum sits inside the room.
  const lineAfter = showMinLine && min > 0 && min < max ? min - 1 : -1;

  return (
    <div className={gapClassName}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < held;
        const withinMin = i < min;
        const isMine = filled && i >= held - mineCount;
        const style: React.CSSProperties = filled
          ? { backgroundColor: accent, borderColor: accent }
          : withinMin
          ? { backgroundColor: "#E1D5C6", borderColor: "#E1D5C6" }
          : { backgroundColor: "transparent", borderColor: "rgba(20,17,15,.15)" };
        if (isMine) {
          style.outline = "1.5px solid #14110F";
          style.outlineOffset = "1px";
        }
        return (
          <Fragment key={i}>
            <div className={pipClassName} style={style} />
            {i === lineAfter && (
              <span
                aria-hidden
                className="flex-none self-stretch"
                style={{ width: 0, borderLeft: "2px dashed #14110F", margin: "-4px 1px" }}
              />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
