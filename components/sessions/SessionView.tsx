import InfoRows from "@/components/sessions/InfoRows";
import PriceBox from "@/components/sessions/PriceBox";
import PolicyLinks from "@/components/PolicyLinks";
import { calculatePrice, formatPrice, maxPriceToPromise, priceRightNow } from "@/lib/pricing";
import { sessionTimes } from "@/lib/sessionTimes";
import { styleAndLevel, suburbOf } from "@/lib/sessionDisplay";
import { moreToGoAhead, inAndRoom } from "@/lib/places";
import { locationTheme } from "@/lib/locationColours";

// The session page, top to bottom (COPY_REFRESH_HANDOVER.md section 4): title,
// the session as rows, the price block in its outline box, the action button,
// the grey timing rows, and the two links. Purely presentational — the page
// (app/sessions/[id]) loads the session and supplies the button. Kept separate
// so the same view can be shown with example data for sign-off.

export type SessionViewData = {
  id: string;
  title: string;
  description: string | null;
  movement_type: string;
  starts_at: string;
  duration_mins: number;
  location_name: string;
  location_address: string;
  cost_base: number;
  revenue_target: number;
  min_attendees: number;
  max_attendees: number;
  current_holds: number;
  state: string;
  social_stretch_venue: string | null;
  teacherName?: string | null;
};

/** What the page needs to choose its button. */
export function sessionStatus(s: SessionViewData, now?: Date) {
  const holds = s.current_holds || 0;
  const t = sessionTimes(s, now);
  return {
    before36: t.phase === "before36",
    joiningClosed: t.phase === "after2",
    full: holds >= s.max_attendees,
  };
}

export default function SessionView({
  s,
  now,
  action,
}: {
  s: SessionViewData;
  /** Override "now" (sign-off examples only). */
  now?: Date;
  /** The Hold my place button (or its replacement) — supplied by the page. */
  action: React.ReactNode;
}) {
  const holds = s.current_holds || 0;
  const t = sessionTimes(s, now);
  const before36 = t.phase === "before36";
  const joiningClosed = t.phase === "after2";
  // "Going ahead ✓" is only said once the session is actually confirmed.
  const goingAhead = s.state === "confirmed" || s.state === "locked";
  const full = holds >= s.max_attendees;

  const openingPrice = calculatePrice(s.cost_base, s.revenue_target, s.min_attendees);
  const floorPrice = calculatePrice(s.cost_base, s.revenue_target, s.max_attendees);
  // The most this person can pay: the at-minimum price until 36 hrs out, the
  // current price after that (when nobody can cancel, so it can only drop).
  const maxPrice = maxPriceToPromise(s.cost_base, s.revenue_target, s.min_attendees, holds, before36);
  const roomLine = before36 ? moreToGoAhead(holds, s.min_attendees) ?? inAndRoom(holds) : full ? `${holds} in · full` : inAndRoom(holds);

  const { style, level } = styleAndLevel(s.description, s.movement_type);
  const suburb = suburbOf(s);
  const whenLine = [t.timeRange, s.duration_mins ? `${s.duration_mins} min` : null, level].filter(Boolean).join(" · ");


  return (
    <div className="px-[18px] flex flex-col gap-4">
        {/* 1. Title — with the olive chip once it's confirmed */}
        <div className="flex flex-col gap-2.5 items-start">
          {goingAhead && (
            <span className="font-mono text-[10px] font-extrabold tracking-[0.08em] uppercase rounded-pill px-[9px] py-1 text-white" style={{ background: "#716F39" }}>
              Going ahead ✓
            </span>
          )}
          <h1 className="font-display font-bold text-ink m-0 uppercase" style={{ fontSize: "clamp(30px, 8.5vw, 40px)", lineHeight: 0.95 }}>
            {s.title}
          </h1>
        </div>

        {/* 2. The session, as rows on the background */}
        <InfoRows
          rows={[
            { label: "When", color: "#902F8A", bold: t.day, grey: whenLine },
            s.location_name && { label: "Where", color: "#14110F", bold: s.location_name, grey: suburb ?? undefined },
            { label: "Movement", color: "#0000FF", bold: style, grey: s.teacherName ? `with ${s.teacherName}` : undefined },
            s.social_stretch_venue && {
              label: "Social",
              color: "#E96709",
              bold: s.social_stretch_venue,
              grey: `From ${t.endTime} · pay your own way`,
            },
          ]}
        />

        {/* 3. Price block, in the outline box */}
        <PriceBox
          accent={locationTheme(s).accent}
          price={maxPrice}
          nowPrice={priceRightNow(s.cost_base, s.revenue_target, s.min_attendees, holds)}
          label={roomLine}
          held={holds}
          min={s.min_attendees}
          max={s.max_attendees}
          openingPrice={openingPrice}
          floorPrice={floorPrice}
        />

        {/* 4. Hold my place — directly under the box, not sticky */}
        <div className="-mt-1">{action}</div>

        {/* 5. Timing rows — everything grey */}
        <InfoRows
          tone="grey"
          labelWidth={96}
          closed
          rows={
            before36
              ? [
                  {
                    label: "Up to 36 hrs out",
                    bold: "Free to cancel",
                    grey: `If we get ${s.min_attendees} people, we’re on. Not enough people? You pay nothing.`,
                  },
                  {
                    label: "36 → 2 hrs out",
                    bold: "Still room to join",
                    grey: "More people can join and the price keeps dropping. No free cancelling from here.",
                  },
                  { label: "2 hrs out", bold: "Final price charged", grey: `Never more than ${formatPrice(openingPrice)}.` },
                ]
              : [
                  {
                    label: "Up to 36 hrs out",
                    bold: goingAhead ? "Going ahead ✓" : "Free cancelling has closed",
                    grey: goingAhead ? "Free cancelling has closed." : undefined,
                  },
                  joiningClosed
                    ? { label: "36 → 2 hrs out", bold: "Joining has closed" }
                    : {
                        label: "36 → 2 hrs out",
                        bold: "Still room to join, right now",
                        grey: "Join now and you’re in straight away. The price keeps dropping.",
                      },
                  {
                    label: "2 hrs out",
                    bold: "Final price charged",
                    grey: `${joiningClosed ? "" : "Joining closes. "}Never more than ${formatPrice(maxPrice)}.`,
                  },
                ]
          }
        />

        {/* 6. Links */}
        <PolicyLinks className="m-0 text-[13px] text-ink/60 flex flex-wrap gap-x-[14px] gap-y-1.5 [&>span[aria-hidden]]:hidden font-bold" />
      </div>
  );
}
