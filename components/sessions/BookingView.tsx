"use client";

import { useState } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";
import InfoRows from "@/components/sessions/InfoRows";
import CapacityPips from "@/components/CapacityPips";
import PolicyLinks from "@/components/PolicyLinks";
import { googleCalendarUrl, downloadIcs, sessionCalendarEvent } from "@/lib/calendar";
import { calculatePrice, formatPrice, maxPriceToPromise } from "@/lib/pricing";
import { sessionTimes } from "@/lib/sessionTimes";
import { styleAndLevel, venueLine, meetLine } from "@/lib/sessionDisplay";
import { heldHeadline, priceRow, bringNote, moreToGoAhead, inAndRoom } from "@/lib/places";

// Manage my booking — what someone holding a place sees. Purely presentational:
// the page (app/hold/[id]) loads the session and owns cancelling; this draws it.
// Kept separate so the same view can be shown with example data for sign-off.
// COPY_REFRESH_HANDOVER.md section 5.

export type BookingSession = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  duration_mins: number;
  location_name: string;
  location_address: string;
  getting_there: string | null;
  cost_base: number;
  revenue_target: number;
  min_attendees: number;
  max_attendees: number;
  current_holds: number;
  state: string;
  social_stretch_venue: string | null;
  social_stretch_note: string | null;
  description?: string | null;
  what_to_bring?: string[] | null;
  movement_type?: string | null;
  // HQ's "Bring with you" lines (added in the HQ group; absent until then).
  bring_title?: string | null;
  bring_note?: string | null;
  teacherName?: string | null;
  gemName?: string | null;
  my_hold_quantity?: number;
};

export const BOOKING_INK = "#14110F";
export const BOOKING_YELLOW = "#FCBB16";
export const bookingButton = "block w-full text-center rounded-pill py-[13px] px-[18px] font-bold text-[15px]";

export default function BookingView({
  session,
  myQty,
  now,
  cancelArea,
  embedded = false,
}: {
  session: BookingSession;
  myQty: number;
  /** Override "now" (sign-off examples only). */
  now?: Date;
  /** The cancel button / picker — the page supplies it; hidden after 36 hrs out. */
  cancelArea?: React.ReactNode;
  /** Drawn inside another page (no full-height background or nav). */
  embedded?: boolean;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  async function copyShareLink(url: string, msg: string) {
    try {
      await navigator.clipboard.writeText(url);
      setShareMsg(msg);
    } catch {
      setShareMsg("Couldn’t copy. Long-press the link to copy it.");
    }
    setTimeout(() => setShareMsg(null), 2500);
  }

  const INK = BOOKING_INK;
  const YELLOW = BOOKING_YELLOW;
  const holds = session.current_holds || 0;
  const t = sessionTimes(session, now);
  const before36 = t.phase === "before36";

  const floorPrice = calculatePrice(session.cost_base, session.revenue_target, session.max_attendees);
  const maxPrice = maxPriceToPromise(session.cost_base, session.revenue_target, session.min_attendees, holds, before36);
  const price = priceRow(maxPrice, myQty);
  const need = before36 ? moreToGoAhead(holds, session.min_attendees) : null;
  const priceGrey = [
    price.greyLead,
    need ? `${need}.` : `${inAndRoom(holds)}.`,
    holds < session.max_attendees ? `Drops to ${formatPrice(floorPrice)}${myQty > 1 ? " each" : ""} if all ${session.max_attendees} fill.` : null,
  ].filter(Boolean).join(" ");

  const { style, level } = styleAndLevel(session.description, session.movement_type);
  // "Bring with you": HQ's two lines once they exist; until then, the first
  // item from the older what-to-bring list. Hidden if there's nothing at all.
  const bringTitle = (session.bring_title ?? "").trim() || (session.what_to_bring ?? []).filter(Boolean)[0] || "";
  const bringGrey = bringNote(session.bring_note, myQty);
  const meet = meetLine(session.teacherName, session.gemName);
  const whereGrey = [session.location_address, session.getting_there].map((v) => (v ?? "").trim()).filter(Boolean).join(". ").replace(/\.\./g, ".");

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/sessions/${session.id}`;
  const shareText = `Join me at ${session.title} — the more of us who go, the cheaper it gets.`;
  const isIOS = typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);
  const smsHref = `sms:${isIOS ? "&" : "?"}body=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;
  const mailHref = `mailto:?subject=${encodeURIComponent(`Join me at ${session.title}`)}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
  const fbHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const calendarEvent = sessionCalendarEvent(session, { teacherName: session.teacherName, gemName: session.gemName });

  const filledBtn = bookingButton;

  return (
    <main className={embedded ? "pb-5 rounded-[26px] overflow-hidden" : "min-h-screen pb-16"} style={{ background: YELLOW, color: INK }}>
      <nav className={`${embedded ? "hidden" : "flex"} items-center justify-between px-[18px] py-4 max-w-lg mx-auto`}>
        <Link href="/sessions" aria-label="Back to What's on" style={{ color: INK }}><SMark size={28} /></Link>
        <Link href="/notifications" className="font-mono text-[10px] font-extrabold tracking-[0.1em] uppercase underline underline-offset-2">
          My bookings
        </Link>
      </nav>

      <div className={`px-[18px] max-w-lg mx-auto flex flex-col gap-[14px] ${embedded ? "pt-[18px]" : ""}`}>
        {/* 1. Headline — nothing else above the box */}
        <h1 className="font-display font-bold m-0 uppercase" style={{ fontSize: "clamp(32px, 9vw, 40px)", lineHeight: 0.92 }}>
          {heldHeadline(myQty)}
        </h1>

        {/* 2. The day, in one outline box */}
        <div className="border-2 rounded-[22px] p-4" style={{ borderColor: INK, background: YELLOW }}>
          <p className="m-0 font-bold text-[15px]">{t.dayAndRange}</p>
          <p className="m-0 mt-0.5 mb-2.5 text-[13px]" style={{ color: "rgba(20,17,15,.6)" }}>{venueLine(session)}</p>
          <p className="m-0 mb-1.5 font-mono text-[11px] font-extrabold tracking-[0.14em] uppercase">How it goes</p>

          <InfoRows
            ruleColor={INK}
            labelWidth={76}
            rows={[
              (bringTitle || bringGrey) && { label: "Bring with you", bold: bringTitle || "For the day", grey: bringGrey ?? undefined },
              (session.location_name || whereGrey) && {
                label: t.parkTime,
                bold: `Arrive at ${session.location_name}`,
                grey: whereGrey || undefined,
              },
              meet && { label: t.arriveTime, bold: "Say kia ora", grey: meet },
              {
                label: t.startTime,
                bold: [style, level].filter(Boolean).join(", "),
                grey: `${session.duration_mins || 60} minutes. Go at your own pace.`,
              },
              session.social_stretch_venue && {
                label: t.endTime,
                bold: `Social Stretch at ${session.social_stretch_venue.split("·")[0].trim()}`,
                grey: "Coffee and chats. Pay your own way.",
              },
              { label: "Price now", bold: price.bold, grey: priceGrey },
            ]}
          />

          <div className="mt-1.5 mb-0.5" role="img" aria-label={`${holds} of ${session.max_attendees} places held, goes ahead at ${session.min_attendees}`}>
            <CapacityPips
              min={session.min_attendees}
              max={session.max_attendees}
              held={holds}
              accent="#902F8A"
              showMinLine
              pipClassName="flex-1 self-center aspect-square max-w-[11px] rounded-full border-[1.5px]"
            />
          </div>
        </div>

        {/* 3. Buttons */}
        <button
          type="button"
          onClick={() => setShareOpen((o) => !o)}
          aria-expanded={shareOpen}
          className={filledBtn}
          style={{ background: INK, color: YELLOW }}
        >
          Share with a mate
        </button>

        {shareOpen && (
          <div className="border-2 rounded-[22px] p-4 flex flex-col gap-3" style={{ borderColor: INK }}>
            <button
              type="button"
              className={filledBtn}
              style={{ background: INK, color: YELLOW }}
              onClick={() => copyShareLink(shareUrl, "Link copied. Send it to a mate!")}
            >
              Copy invite link · {formatPrice(maxPrice)} max
            </button>
            <div className="flex justify-between gap-2">
              {[
                { label: "Text", href: smsHref },
                { label: "Email", href: mailHref },
                { label: "Facebook", href: fbHref },
              ].map((c) => (
                <a
                  key={c.label}
                  href={c.href}
                  target={c.href.startsWith("http") ? "_blank" : undefined}
                  rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="flex-1 text-center font-mono text-[10px] font-extrabold uppercase tracking-[0.06em] rounded-pill border-2 py-2"
                  style={{ borderColor: INK }}
                >
                  {c.label}
                </a>
              ))}
              {["Instagram", "TikTok"].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => copyShareLink(shareUrl, `Link copied. Paste it into your ${label} story!`)}
                  className="flex-1 text-center font-mono text-[10px] font-extrabold uppercase tracking-[0.06em] rounded-pill border-2 py-2"
                  style={{ borderColor: INK }}
                >
                  {label}
                </button>
              ))}
            </div>
            {shareMsg && <p className="m-0 text-center text-sm font-bold">{shareMsg}</p>}
          </div>
        )}

        {cancelArea}

        {/* 4. Links */}
        <PolicyLinks className="m-0 text-[13px] flex flex-wrap gap-x-[14px] gap-y-1.5 [&>span[aria-hidden]]:hidden font-bold text-ink/60" />
        <p className="m-0 text-[13px] font-bold text-ink/60 flex flex-wrap gap-x-[14px] gap-y-1.5">
          <a href={googleCalendarUrl(calendarEvent)} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            Add to Google Calendar <span aria-hidden>↗</span>
          </a>
          <button
            type="button"
            onClick={() => downloadIcs(sessionCalendarEvent(session, { teacherName: session.teacherName, gemName: session.gemName, uidSuffix: "attendee" }))}
            className="underline underline-offset-2 font-bold"
          >
            Add to Apple Calendar
          </button>
        </p>
      </div>
    </main>
  );
}
