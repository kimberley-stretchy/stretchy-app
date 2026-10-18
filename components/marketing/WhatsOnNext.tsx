import Link from "next/link";
import Image from "next/image";
import { calculatePrice, formatPrice, maxPriceToPromise, priceRightNow } from "@/lib/pricing";
import CapacityPips from "@/components/CapacityPips";
import { roomLabel } from "@/lib/places";
import { phase, formatDay, formatTimeRange } from "@/lib/sessionTimes";
import { locationTheme } from "@/lib/locationColours";
import PriceEnds from "@/components/PriceEnds";

export type MarketingSession = {
  id: string;
  title?: string;
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
  state?: string;
  isPlaceholder?: boolean;
};

const CARD_PHOTOS = ["/images/marketing/arriving-honey-sundays.jpg", "/images/marketing/inside-honey-sundays.jpg"];
const ACCENTS = ["#902F8A", "#E96709"]; // purple, orange — alternating per card, matching the design's two examples

function timeOfDay(startsAt: string): string {
  // getHours() reads the server's own local time (UTC on Vercel), not NZ
  // time — always resolve the NZ-local hour explicitly instead.
  const h = Number(
    new Date(startsAt).toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", hour12: false })
  );
  if (h < 12) return "MORNING";
  if (h < 17) return "LUNCH";
  return "EVENING";
}

function movementLabel(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function SessionCard({ s, index }: { s: MarketingSession; index: number }) {
  // Each location has its own colour; placeholders keep the alternating pair.
  const theme = s.isPlaceholder ? null : locationTheme(s);
  const accent = theme?.accent ?? ACCENTS[index % ACCENTS.length];
  const accentText = theme?.textAccent ?? accent;
  const onAccent = theme?.onAccent ?? "#F7F0E8";
  const photo = CARD_PHOTOS[index % CARD_PHOTOS.length];
  const start = new Date(s.starts_at);
  const end = s.duration_mins ? new Date(start.getTime() + s.duration_mins * 60 * 1000) : null;
  const dayShort = s.isPlaceholder ? "" : start.toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "short" }).toUpperCase();
  const dayNum = s.isPlaceholder ? "XX" : start.toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", day: "2-digit" });
  const monthShort = s.isPlaceholder ? "AUG" : start.toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", month: "short" }).toUpperCase();
  const timeRange = end
    ? `${start.toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit" })}–${end.toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit" })}`
    : start.toLocaleTimeString("en-NZ", { timeZone: "Pacific/Auckland", hour: "numeric", minute: "2-digit" });
  const durationLabel = s.duration_mins ? `${s.duration_mins} MIN` : "";

  const holds = s.current_holds ?? 0;
  // "Going ahead ✓" only once the session is actually confirmed (36 hrs out,
  // or HQ kept it alive) — reaching the minimum earlier isn't a promise yet.
  const confirmed = s.state === "confirmed";
  const label = roomLabel(holds, s.min_attendees, s.max_attendees, confirmed).toUpperCase();
  // The big price is the most this person can pay: the at-minimum price until
  // 36 hrs out, the current price after (lib/pricing.ts → maxPriceToPromise).
  const price = maxPriceToPromise(s.cost_base, s.revenue_target, s.min_attendees, holds, phase(s.starts_at, s.state) === "before36");
  // Past the minimum the price right now is lower than the cap; it's shown as
  // "CURRENT $21.30" under the latest dot (PriceEnds). The big price is the cap.
  const now = priceRightNow(s.cost_base, s.revenue_target, s.min_attendees, holds);
  const openingPrice = calculatePrice(s.cost_base, s.revenue_target, s.min_attendees);
  const floorPrice = calculatePrice(s.cost_base, s.revenue_target, s.max_attendees);

  // Any real session with "TEST" in its title gets the same blackout as a
  // synthetic placeholder card — catches every test session as they're
  // created/renamed, not just whichever one was live when this was written.
  const isTestSession = (s.title ?? "").toUpperCase().includes("TEST");
  const showPlaceholderOverlay = s.isPlaceholder || isTestSession;

  return (
    <div className="border-2 border-ink rounded-[18px] lg:rounded-[22px] overflow-hidden relative flex flex-col">
      <div className="relative">
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
      </div>
      <div className="absolute top-3 left-3 lg:top-4 lg:left-4 bg-cream rounded-[10px] lg:rounded-xl px-[11px] py-[7px] lg:px-[14px] lg:py-[10px] text-center">
        <div className="font-mono text-[13px] lg:text-[15px] font-extrabold" style={{ color: accentText }}>{dayShort}</div>
        <div className="font-display text-[26px] lg:text-[32px] leading-[.9]">{dayNum}</div>
        <div className="font-mono text-[10px] lg:text-[11px] font-extrabold text-ink/55">{monthShort}</div>
      </div>
      <div className="absolute top-3 right-3 lg:top-4 lg:right-4 flex flex-col lg:flex-row gap-[5px] lg:gap-1.5 items-end lg:items-center">
        <span
          className="rounded-pill px-[11px] lg:px-3.5 py-1.5 lg:py-2 font-mono text-[9px] lg:text-[11px] font-extrabold whitespace-nowrap"
          style={{ backgroundColor: accent, color: onAccent }}
        >
          {label}
        </span>
      </div>

      <div className="p-4 pb-[18px] lg:p-[24px_26px_26px] flex flex-col gap-[13px] lg:gap-4 flex-1">
        <div>
          <div className="font-display text-[26px] lg:text-[34px] leading-[.98] lg:leading-[.95]">
            {s.location_name.toUpperCase()} <span className="text-ink/30">|</span> {timeOfDay(s.starts_at)}
          </div>
          <div className="font-mono text-[12.5px] lg:text-[14px] font-extrabold tracking-[0.09em] lg:tracking-[0.1em] text-ink/75 mt-1.5 lg:mt-2">
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
            <div className="text-[11px] lg:text-xs font-semibold text-ink/55 mt-1">max per person &middot; incl. GST</div>
          </div>
          <Link
            href={s.isPlaceholder ? "/sessions" : `/sessions/${s.id}`}
            className="inline-flex items-center justify-center bg-ink text-cream rounded-pill h-11 px-[26px] text-[14px] lg:text-[15px] font-bold whitespace-nowrap"
          >
            Hold my place
          </Link>
        </div>

        <div className="mt-auto">
          <div className="flex justify-between gap-2.5 font-mono text-[9px] lg:text-[10px] font-extrabold tracking-[0.11em] lg:tracking-[0.12em] text-ink/50 mb-1.5">
            <span>{label}</span>
            <span>{s.max_attendees} MAX</span>
          </div>
          <CapacityPips min={s.min_attendees} max={s.max_attendees} held={holds} accent={accent} showMinLine />
          <PriceEnds
            className="font-mono text-[9px] lg:text-[10px] font-extrabold tracking-[0.11em] lg:tracking-[0.12em] text-ink/50 mt-1.5"
            openingPrice={openingPrice}
            floorPrice={floorPrice}
            nowPrice={s.isPlaceholder ? undefined : now}
            held={holds}
            max={s.max_attendees}
          />
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
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-5 border-2 border-dashed border-ink/75 rounded-[18px] lg:rounded-[20px] p-[18px] lg:p-[20px_24px] text-ink/75">
          <div className="lg:min-w-[280px]">
            <div className="font-mono text-[9px] lg:text-[10px] font-extrabold tracking-[0.11em] lg:tracking-[0.12em]">ALSO COMING UP</div>
            <div className="font-display text-[22px] lg:text-[23px] leading-none mt-1.5">
              {(notifySession.title ?? `${notifySession.location_name} | ${timeOfDay(notifySession.starts_at)}`).toUpperCase()}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              <span className="font-mono text-[10px] lg:text-[11px] font-extrabold tracking-[0.06em] uppercase border-2 border-ink/75 rounded-pill px-2.5 py-1">
                {formatDay(notifySession.starts_at)}
              </span>
              <span className="font-mono text-[10px] lg:text-[11px] font-extrabold tracking-[0.06em] uppercase border-2 border-ink/75 rounded-pill px-2.5 py-1">
                {formatTimeRange(notifySession.starts_at, notifySession.duration_mins)}
              </span>
            </div>
            <div className="text-xs lg:text-[13px] font-semibold mt-2.5">
              {formatPrice(calculatePrice(notifySession.cost_base, notifySession.revenue_target, notifySession.min_attendees))} max &middot; {notifySession.min_attendees} needed
            </div>
          </div>
          <Link
            href={`/sessions/${notifySession.id}`}
            className="w-full lg:w-auto inline-flex items-center justify-center h-11 px-6 bg-ink/75 text-cream rounded-pill text-sm font-bold whitespace-nowrap"
          >
            Hold my place
          </Link>
        </div>
      )}

      <Link
        href="/sessions"
        className="self-center inline-flex items-center justify-center h-12 px-8 mt-1 lg:mt-2 bg-ink text-cream rounded-pill text-sm font-bold whitespace-nowrap"
      >
        See all Stretchy sessions →
      </Link>
    </div>
  );
}
