import { Fragment } from "react";

// Shared room-capacity indicator — one pip per place in the whole room (max
// capacity), not just up to the minimum. Three visual states per pip:
//   filled        — someone's holding that place (the card's accent colour)
//   priority zone — still-empty place within the minimum needed to go ahead
//                   (sand block — "cover these first")
//   bonus zone    — still-empty place beyond the minimum (faint outline only,
//                   de-emphasised since the session already works without it)
//
// One optional extra (COPY_REFRESH_HANDOVER.md section 1):
//   showMinLine — a dashed vertical ink line after the last minimum pip, so
//                 "this many and we're on" is visible at a glance
// (The spec's `mine` outline around a person's own places was dropped by
// Kimberley on 13 Oct — every held place looks the same.)
export default function CapacityPips({
  min,
  max,
  held,
  accent,
  showMinLine = false,
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
  pipClassName?: string;
  gapClassName?: string;
}) {
  // The line only means something when the minimum sits inside the room.
  const lineAfter = showMinLine && min > 0 && min < max ? min - 1 : -1;

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
