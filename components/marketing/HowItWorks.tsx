"use client";

import { useState } from "react";
import { calculatePrice, formatPrice } from "@/lib/pricing";
import { NewTabLink, CANCELLATION_POLICY_HREF } from "@/components/PolicyLinks";

// The five beats, in the same words used on session pages, emails and the
// Terms (STRETCHY_WORDS.md). COPY_REFRESH_HANDOVER.md section 2.
export type LastSession = { title: string; startsAt: string; people: number; finalPrice: number; maxPrice: number };

const CARDS: { n: string; timing: string; title: string; body: string; cta?: string; simulator?: boolean; lastTime?: boolean }[] = [
  {
    n: "01",
    timing: "NOW",
    title: "Hold your place",
    body: "We save your card and show you the most you’ll pay.",
    cta: "See what’s on",
  },
  {
    n: "02",
    timing: "36 HRS OUT",
    title: "Going ahead, or not",
    body: "If we get enough people, we’re on. Not enough? It’s called off and you pay nothing. Free cancelling ends here.",
  },
  {
    n: "03",
    timing: "36 → 2 HRS OUT",
    title: "Still room to join",
    body: "More people can join, and the price keeps dropping for everyone.",
    simulator: true,
  },
  {
    n: "04",
    timing: "2 HRS OUT",
    title: "Final price charged",
    body: "Joining closes and we charge your card the final price. The more who joined, the less it is. Never more than the max price shown.",
    lastTime: true,
  },
  {
    n: "05",
    timing: "ON THE DAY",
    title: "Move, then the Social Stretch",
    body: "Your teacher guides the practice, our Good Energy Managers bring the vibes. Then coffee after, pay your own way.",
  },
];

function StepLabel({ n, timing }: { n: string; timing: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-mono text-[11px] lg:text-[12px] font-extrabold tracking-[0.12em]">{n}</span>
      <span className="w-[1.5px] h-[10px] lg:h-3 bg-[rgba(20,17,15,.4)] flex-shrink-0" />
      <span className="font-mono text-[11px] lg:text-[12px] font-extrabold tracking-[0.1em] whitespace-nowrap">{timing}</span>
    </div>
  );
}

// The interactive pricing simulator inside step 03 — a marketing illustration,
// not a booking control. Reads its numbers from a real session's cost_base +
// revenue_target + min/max (passed in as props) rather than hardcoding the
// Herne Bay figures, so this stays accurate as sessions change.
function PriceSimulator({ costBase, revenueTarget, minMats, maxMats }: { costBase: number; revenueTarget: number; minMats: number; maxMats: number }) {
  const [mats, setMats] = useState(minMats);
  const people = Math.max(mats, minMats);
  const price = calculatePrice(costBase, revenueTarget, people);

  return (
    <div className="mt-auto pt-[14px] border-t-2 border-ink">
      <div className="font-mono text-[22px] lg:text-[20px] font-extrabold tracking-[0.02em] leading-tight">
        {formatPrice(price)} each <span className="opacity-60 whitespace-nowrap">/ {people} people</span>
      </div>
      <label htmlFor="how-it-works-sim" className="block text-[12px] font-bold mt-3">Slide to fill the room</label>
      <input
        id="how-it-works-sim"
        type="range"
        min={minMats}
        max={maxMats}
        step={1}
        value={mats}
        onChange={(e) => setMats(Number(e.target.value))}
        className="w-full mt-1 h-11 lg:h-12 accent-ink"
      />
      <div className="flex justify-between gap-2 font-mono text-[10px] font-extrabold tracking-[0.06em] mt-1 uppercase">
        <span>{minMats} · goes ahead</span>
        <span>{maxMats} · full</span>
      </div>
      <p className="text-[11px] italic mt-3 mb-0">Example: Herne Bay mornings.</p>
    </div>
  );
}

// Step 04's social proof: what the last session ended up at. Updates itself
// after every session (app/page.tsx → getLastSession).
function LastTime({ s }: { s: LastSession }) {
  const day = new Date(s.startsAt).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", weekday: "short", day: "numeric", month: "short" });
  const where = s.title.split("|")[0].trim();
  return (
    <div className="mt-auto pt-[14px] border-t-2 border-ink">
      <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] uppercase">Last time · {where} · {day}</div>
      <div className="font-mono text-[22px] lg:text-[20px] font-extrabold tracking-[0.02em] leading-tight mt-1.5">
        {formatPrice(s.finalPrice)} each
      </div>
      <p className="m-0 mt-1 text-[12.5px] leading-[1.45]">
        <strong>{s.people} people joined</strong>, so everyone paid {formatPrice(s.finalPrice)} instead of the {formatPrice(s.maxPrice)} max.
      </p>
    </div>
  );
}

export default function HowItWorks({
  costBase = 199.49,
  revenueTarget = 120,
  minMats = 14,
  maxMats = 30,
  lastSession = null,
}: {
  costBase?: number;
  revenueTarget?: number;
  minMats?: number;
  maxMats?: number;
  lastSession?: LastSession | null;
}) {
  return (
    <div
      id="how-it-works"
      className="bg-sky text-ink border-t-2 border-ink px-[18px] py-[26px] lg:p-[60px_44px] flex flex-col gap-[14px] lg:gap-9 scroll-mt-4"
    >
      <div className="flex flex-col gap-[14px] max-w-[800px]">
        <div className="font-mono text-[9px] lg:text-[11px] font-extrabold tracking-[0.15em]">
          HOW IT WORKS &middot; SOCIAL PRICING
        </div>
        <h2 className="font-display text-[34px] lg:text-[50px] leading-[.94] lg:leading-[.94] m-0 max-w-[16ch]">
          The more we move together, the better it gets for all.
        </h2>
        <p className="m-0 text-sm lg:text-[15px] leading-[1.55] font-bold">
          Every Stretchy needs a certain number of people to go ahead. Once we&rsquo;ve got them, it&rsquo;s on, and everyone who joins after makes it cheaper for the whole room. (Yes, people-powered pricing.)
        </p>
      </div>

      <div className="flex flex-col gap-[9px] lg:grid lg:grid-cols-[repeat(5,minmax(0,1fr))] lg:gap-[14px] lg:items-stretch">
        {CARDS.map((c) => (
          <div
            key={c.n}
            className="bg-sky border-2 border-ink rounded-2xl lg:rounded-[20px] p-4 lg:p-5 flex flex-col gap-3"
          >
            <StepLabel n={c.n} timing={c.timing} />
            <div className="font-display text-[22px] lg:text-[21px] leading-none mt-1.5 lg:mt-0">{c.title}</div>
            <p className="m-0 mt-1.5 lg:mt-0 text-[13px] leading-[1.5]">{c.body}</p>
            {c.cta && (
              <a
                href="#whats-on"
                className="w-full lg:w-auto mt-3 lg:mt-auto lg:self-start inline-flex items-center justify-center bg-ink text-cream border-2 border-ink rounded-pill h-11 px-[22px] text-[13px] lg:text-sm font-bold whitespace-nowrap"
              >
                {c.cta}
              </a>
            )}
            {c.lastTime && lastSession && <LastTime s={lastSession} />}
            {c.simulator && (
              <PriceSimulator costBase={costBase} revenueTarget={revenueTarget} minMats={minMats} maxMats={maxMats} />
            )}
          </div>
        ))}
      </div>

      <p className="m-0 text-[13px] lg:text-sm leading-[1.6] lg:max-w-[820px]">
        <span className="tracking-[0.06em]">🌏 🧘 🙏</span> The Stretchy pricing model rewards community, while making sure teachers, community venues and our Good Energy Managers are paid fairly for their expertise &amp; energy, plus the running costs of Stretchy.
      </p>

      <p className="m-0 text-[13px] lg:text-sm leading-[1.6] lg:max-w-[820px]">
        <strong>Cancelling:</strong> free until 36 hours out. After that you&rsquo;re in, and you&rsquo;ll pay the final price. If we ever cancel, you don&rsquo;t pay.{" "}
        <NewTabLink href={CANCELLATION_POLICY_HREF} className="font-bold underline underline-offset-2 whitespace-nowrap">Cancellation policy</NewTabLink>
      </p>

      <a
        href="#whats-on"
        className="lg:hidden inline-flex items-center justify-center h-12 bg-ink text-cream border-2 border-ink rounded-pill text-[15px] font-bold"
      >
        See what&rsquo;s on
      </a>
    </div>
  );
}
