import MatchHeadlineWidth from "@/components/marketing/MatchHeadlineWidth";

function formatWholeDollars(amount: number): string {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const CHARITY_URL = "https://cancersupport.org.nz/";

export default function StretchyFundBand({ total }: { total: number }) {
  return (
    <div className="bg-yellow border-t-2 border-ink text-ink px-[18px] py-[26px] lg:p-[60px_44px]">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-[56px]">
        {/* Left: headline, then the logo + tally box under it */}
        <div className="flex flex-col gap-3.5 lg:gap-[18px]">
          <div className="font-mono text-[9px] lg:text-[11px] font-extrabold tracking-[0.14em] lg:tracking-[0.16em]">GOOD MONEY, GOING SOMEWHERE GOOD.</div>
          <MatchHeadlineWidth
            headline={
              <h2 className="font-display text-[34px] lg:text-[50px] leading-[.94] lg:leading-[.92] m-0">
                $10 from every Stretchy session goes to Cancer Support NZ.
              </h2>
            }
          >
          {/* Logo + tally, all black straight on the yellow — as wide as the headline */}
          <div className="w-full border-2 border-ink rounded-[20px] p-5 lg:p-7 text-ink mt-2 lg:mt-4">
            <div className="flex items-center gap-4 lg:gap-6 mb-4">
              <a href={CHARITY_URL} target="_blank" rel="noopener noreferrer" aria-label="Cancer Support New Zealand" className="block flex-1 min-w-0 max-w-[230px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/partners/cancer-support-nz-black.png" alt="Cancer Support New Zealand" width={1000} height={398} className="block h-auto w-full" />
              </a>
              <div className="shrink-0 pl-4 lg:pl-6 border-l-2 border-ink">
                <p className="font-mono text-[10px] font-extrabold tracking-[0.1em] mb-2 m-0">RAISED SO FAR</p>
                <p className="font-mono text-[40px] lg:text-[52px] font-black leading-none m-0">{formatWholeDollars(total)}</p>
              </div>
            </div>
            <p className="text-sm font-semibold m-0 pt-3 border-t-2 border-ink">
              To be donated to Cancer Support NZ at the end of the Summer Season 2027.
            </p>
          </div>
          </MatchHeadlineWidth>
        </div>

        {/* Right: the copy */}
        <div className="flex flex-col gap-3.5 lg:gap-[18px] lg:pt-[34px]">
          <p className="m-0 text-sm lg:text-[15px] leading-[1.55]">
            <a href={CHARITY_URL} target="_blank" rel="noopener noreferrer" className="font-bold underline">Cancer Support New Zealand</a> is a charity that helps people feel better while living with cancer. They offer free
            wellbeing classes, online and in communities around Aotearoa, for anyone affected by cancer.
          </p>
          <p className="m-0 text-sm lg:text-[15px] leading-[1.55]">
            Whether they&rsquo;ve just been diagnosed, are going through treatment, are adjusting to life afterwards, or are
            caring for someone they love. Their sessions cover the things that often get overlooked: managing fatigue and side
            effects, coping with changes to skin and hair, easing stress, and rebuilding confidence. Many people also find
            something just as valuable: a room, real or online, full of people who understand.
          </p>
          <p className="m-0 text-sm lg:text-[15px] leading-[1.55]">
            Nobody should have to face cancer alone, and $10 from each session helps them keep that support free for whoever
            needs it. Many members of the Stretchy community also donate their yoga, meditation and wellbeing professional
            expertise to the Cancer Support NZ programme. Thank you to them for all they do too ❤️
          </p>
          <a href={CHARITY_URL} target="_blank" rel="noopener noreferrer" className="self-start text-[15px] font-bold underline">
            Find out more →
          </a>
        </div>
      </div>
    </div>
  );
}
