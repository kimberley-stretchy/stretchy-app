import Link from "next/link";
import Image from "next/image";
import { calculatePrice, formatPrice } from "@/lib/pricing";

export type MarketingSession = {
  id: string;
  movement_type: string;
  starts_at: string;
  duration_mins: number | null;
  location_name: string;
  cost_base: number;
  revenue_target: number;
  min_attendees: number;
  max_attendees: number;
  current_holds: number;
  social_stretch_venue: string | null;
  social_stretch_note: string | null;
  teacher_name?: string | null;
  isPlaceholder?: boolean;
};

const CARD_PHOTOS = ["/images/marketing/arriving-honey-sundays.jpg", "/images/marketing/inside-honey-sundays.jpg"];
const ACCENTS = ["#902F8A", "#E96709"]; // purple, orange — alternating per card, matching the design's two examples

function timeOfDay(startsAt: string): string {
  const h = new Date(startsAt).getHours();
  if (h < 12) return "MORNING";
  if (h < 17) return "LUNCH";
  return "EVENING";
}

function movementLabel(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function SessionCard({ s, index }: { s: MarketingSession; index: number }) {
  const accent = ACCENTS[index % ACCENTS.length];
  const photo = CARD_PHOTOS[index % CARD_PHOTOS.length];
  const start = new Date(s.starts_at);
  const end = s.duration_mins ? new Date(start.getTime() + s.duration_mins * 60 * 1000) : null;
  const dayShort = s.isPlaceholder ? "" : start.toLocaleDateString("en-NZ", { weekday: "short" }).toUpperCase();
  const dayNum = s.isPlaceholder ? "XX" : start.toLocaleDateString("en-NZ", { day: "2-digit" });
  const monthShort = s.isPlaceholder ? "AUG" : start.toLocaleDateString("en-NZ", { month: "short" }).toUpperCase();
  const timeRange = end
    ? `${start.toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" })}–${end.toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" })}`
    : start.toLocaleTimeString("en-NZ", { hour: "numeric", minute: "2-digit" });
  const durationLabel = s.duration_mins ? `${s.duration_mins} MIN` : "";

  const holds = s.current_holds ?? 0;
  const goingAhead = holds >= s.min_attendees;
  const price = calculatePrice(s.cost_base, s.revenue_target, Math.max(holds, s.min_attendees));
  const spotsNeeded = Math.max(0, s.min_attendees - holds);

  const pipCount = s.min_attendees;
  const pipsFilled = Math.min(holds, pipCount);

  // Temporary: a real test session dated Sat 19 Sept 2026 also needs the
  // blackout treatment on its photo, independent of isPlaceholder — remove
  // this once that test session is no longer live.
  const isSept19TestSession = start.toISOString().slice(0, 10) === "2026-09-19";
  const showPlaceholderOverlay = s.isPlaceholder || isSept19TestSession;

  return (
    <div className="border-2 border-ink rounded-[18px] lg:rounded-[22px] overflow-hidden relative flex flex-col">
      <Image
        src={photo}
        alt={s.location_name}
        width={640}
        height={260}
        className="block w-full h-[180px] lg:h-[260px] object-cover"
      />
      {showPlaceholderOverlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink/50 pointer-events-none">
          <span className="font-mono text-[11px] lg:text-sm font-extrabold tracking-[0.1em] text-cream text-center px-4 -rotate-12 border-2 border-cream rounded-lg py-1.5">
            PLACEHOLDER FOR APP TESTING
          </span>
        </div>
      )}
      <div className="absolute top-3 left-3 lg:top-4 lg:left-4 bg-cream rounded-[10px] lg:rounded-xl px-[11px] py-[7px] lg:px-[14px] lg:py-[10px] text-center">
        <div className="font-mono text-[13px] lg:text-[15px] font-extrabold" style={{ color: accent }}>{dayShort}</div>
        <div className="font-display text-[26px] lg:text-[32px] leading-[.9]">{dayNum}</div>
        <div className="font-mono text-[10px] lg:text-[11px] font-extrabold text-ink/55">{monthShort}</div>
      </div>
      <div className="absolute top-3 right-3 lg:top-4 lg:right-4 flex flex-col lg:flex-row gap-[5px] lg:gap-1.5 items-end lg:items-center">
        {goingAhead ? (
          <>
            <span
              className="text-cream rounded-pill px-[11px] lg:px-3.5 py-1.5 lg:py-2 font-mono text-[9px] lg:text-[11px] font-extrabold whitespace-nowrap"
              style={{ backgroundColor: accent }}
            >
              GOING AHEAD
            </span>
            <span
              className="bg-cream rounded-pill px-[11px] lg:px-3.5 py-1 lg:py-1.5 font-mono text-[9px] lg:text-[11px] font-extrabold border-2 whitespace-nowrap"
              style={{ color: accent, borderColor: accent }}
            >
              PRICE BETTER-ING
            </span>
          </>
        ) : (
          <span
            className="text-cream rounded-pill px-[11px] lg:px-3.5 py-1.5 lg:py-2 font-mono text-[9px] lg:text-[11px] font-extrabold whitespace-nowrap"
            style={{ backgroundColor: accent }}
          >
            {spotsNeeded} SPOTS TO GO AHEAD
          </span>
        )}
      </div>

      <div className="p-4 pb-[18px] lg:p-[24px_26px_26px] flex flex-col gap-[13px] lg:gap-4 flex-1">
        <div>
          <div className="font-display text-[26px] lg:text-[34px] leading-[.98] lg:leading-[.95]">
            {s.location_name.toUpperCase()} <span className="text-ink/30">|</span> {timeOfDay(s.starts_at)}
          </div>
          <div className="font-mono text-[10px] lg:text-[11px] font-extrabold tracking-[0.09em] lg:tracking-[0.1em] text-ink/55 mt-1.5 lg:mt-2">
            {timeRange.toUpperCase()}{durationLabel ? ` · ${durationLabel}` : ""} &middot; ALL LEVELS
          </div>
        </div>

        <div className="flex flex-col border-t-2 border-b-2 border-border">
          <div className="grid grid-cols-[76px_minmax(0,1fr)] lg:grid-cols-[90px_1fr] gap-2.5 lg:gap-3 py-2.5 lg:py-3 border-b border-border/70">
            <span className="font-mono text-[9px] lg:text-[10px] font-extrabold tracking-[0.09em] lg:tracking-[0.1em] text-hot-blue">MOVEMENT</span>
            <div className="min-w-0">
              <div className="text-[13px] lg:text-sm font-bold">
                {movementLabel(s.movement_type)}{s.teacher_name ? ` · ${s.teacher_name}` : ""}
              </div>
              <div className="text-[11px] lg:text-xs text-ink/60 mt-0.5">{s.location_name}</div>
            </div>
          </div>
          {s.social_stretch_venue && (
            <div className="grid grid-cols-[76px_minmax(0,1fr)] lg:grid-cols-[90px_1fr] gap-2.5 lg:gap-3 py-2.5 lg:py-3">
              <span className="font-mono text-[9px] lg:text-[10px] font-extrabold tracking-[0.09em] lg:tracking-[0.1em] text-orange">SOCIAL</span>
              <div className="min-w-0">
                <div className="text-[13px] lg:text-sm font-bold">{s.social_stretch_venue}</div>
                <div className="text-[11px] lg:text-xs text-ink/60 mt-0.5">{s.social_stretch_note ?? "Straight after"}</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-end justify-between gap-3.5">
          <div>
            <div className="font-mono text-[32px] lg:text-[42px] font-extrabold leading-none">{formatPrice(price)}</div>
            <div className="text-[11px] lg:text-xs font-semibold text-ink/55 mt-1">per person &middot; incl. GST</div>
          </div>
          <Link
            href={s.isPlaceholder ? "/sessions" : `/sessions/${s.id}`}
            className="inline-flex items-center justify-center bg-ink text-cream rounded-pill h-11 px-[26px] text-[14px] lg:text-[15px] font-bold whitespace-nowrap"
          >
            Hold a place
          </Link>
        </div>

        <div className="mt-auto">
          <div className="flex justify-between gap-2.5 font-mono text-[9px] lg:text-[10px] font-extrabold tracking-[0.11em] lg:tracking-[0.12em] text-ink/50 mb-1.5">
            <span>{goingAhead ? "GOING AHEAD" : "SPOTS TO MINIMUM"}</span>
            <span>{s.max_attendees} MAX</span>
          </div>
          <div className="flex gap-[2px] lg:gap-[3px]">
            {Array.from({ length: pipCount }).map((_, i) => (
              <div
                key={i}
                className="flex-1 h-[14px] lg:h-[18px] rounded-pill border-[1.5px]"
                style={
                  i < pipsFilled
                    ? { backgroundColor: accent, borderColor: accent }
                    : { backgroundColor: "transparent", borderColor: "#E1D5C6" }
                }
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WhatsOnNext({
  sessions,
  notifySession,
}: {
  sessions: MarketingSession[];
  notifySession: MarketingSession | null;
}) {
  return (
    <div id="whats-on" className="bg-cream border-t-2 border-ink px-[18px] py-[26px] lg:p-[60px_44px] flex flex-col gap-[18px] lg:gap-[26px]">
      <div>
        <div className="font-mono text-[9px] lg:text-[11px] font-extrabold tracking-[0.14em] lg:tracking-[0.15em]">WHAT&rsquo;S ON NEXT</div>
        <h2 className="font-display text-[34px] lg:text-[50px] leading-[.94] lg:leading-[.92] m-0 mt-2 lg:mt-0">Move with us.</h2>
      </div>

      {sessions.length === 0 ? (
        <p className="text-ink/60 text-sm">Nothing open yet — check back soon, or suggest a Stretchy below.</p>
      ) : (
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-5 lg:items-start">
          {sessions.map((s, i) => (
            <SessionCard key={s.id} s={s} index={i} />
          ))}
        </div>
      )}

      {notifySession && (
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-5 border-2 border-dashed border-ink/30 rounded-[18px] lg:rounded-[20px] p-[18px] lg:p-[20px_24px]">
          <div className="lg:min-w-[280px]">
            <div className="font-mono text-[9px] lg:text-[10px] font-extrabold tracking-[0.11em] lg:tracking-[0.12em] text-ink/50">
              {new Date(notifySession.starts_at).toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" }).toUpperCase()} &middot; NOT OPEN YET
            </div>
            <div className="font-display text-[22px] lg:text-[23px] leading-none mt-1.5 text-ink/80">
              {notifySession.location_name.toUpperCase()} | {timeOfDay(notifySession.starts_at)}
            </div>
            <div className="text-xs lg:text-[13px] text-ink/60 mt-1.5">Places open 36 hours before</div>
          </div>
          <button
            className="w-full lg:w-auto inline-flex items-center justify-center h-11 px-6 bg-transparent text-ink border-2 border-ink rounded-pill text-sm font-bold"
            type="button"
          >
            Notify me
          </button>
        </div>
      )}
    </div>
  );
}
