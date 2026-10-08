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
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,.85fr)] gap-6 lg:gap-[44px]">
        {/* Left: copy */}
        <div className="flex flex-col gap-3.5 lg:gap-[18px]">
          <div className="font-mono text-[9px] lg:text-[11px] font-extrabold tracking-[0.14em] lg:tracking-[0.16em]">GOOD MONEY, GOING SOMEWHERE GOOD.</div>
          <h2 className="font-display text-[34px] lg:text-[50px] leading-[.94] lg:leading-[.92] m-0 max-w-[20ch]">
            $10 from every Stretchy session goes to Cancer Support NZ.
          </h2>
          <p className="m-0 text-sm lg:text-[15px] leading-[1.55] lg:max-w-[520px]">
            <a href={CHARITY_URL} target="_blank" rel="noopener noreferrer" className="font-bold underline">Cancer Support New Zealand</a> is a charity that helps people feel better while living with cancer. They offer free
            wellbeing classes, online and in communities around Aotearoa, for anyone affected by cancer.
          </p>
          <p className="m-0 text-sm lg:text-[15px] leading-[1.55] lg:max-w-[520px]">
            Whether they&rsquo;ve just been diagnosed, are going through treatment, are adjusting to life afterwards, or are
            caring for someone they love. Their sessions cover the things that often get overlooked: managing fatigue and side
            effects, coping with changes to skin and hair, easing stress, and rebuilding confidence. Many people also find
            something just as valuable: a room, real or online, full of people who understand.
          </p>
          <p className="m-0 text-sm lg:text-[15px] leading-[1.55] lg:max-w-[520px]">
            Nobody should have to face cancer alone, and $10 from each session helps them keep that support free for whoever
            needs it. Many members of the Stretchy community also donate their yoga, meditation and wellbeing professional
            expertise to the Cancer Support NZ programme. Thank you to them for all they do too ❤️
          </p>
          <a href={CHARITY_URL} target="_blank" rel="noopener noreferrer" className="self-start text-[15px] font-bold underline">
            Find out more →
          </a>
        </div>

        {/* Right: logo + tally, all black straight on the yellow */}
        <div className="self-start w-full border-2 border-ink rounded-[20px] p-5 lg:p-7 text-ink">
          <a href={CHARITY_URL} target="_blank" rel="noopener noreferrer" aria-label="Cancer Support New Zealand" className="block mb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/partners/cancer-support-nz-black.png" alt="Cancer Support New Zealand" width={1000} height={398} className="block h-auto w-[190px] lg:w-[230px]" />
          </a>
          <p className="font-mono text-[10px] font-extrabold tracking-[0.1em] mb-2 m-0">RAISED SO FAR</p>
          <p className="font-mono text-[44px] lg:text-[52px] font-black leading-none mb-3 m-0">{formatWholeDollars(total)}</p>
          <p className="text-sm font-semibold m-0 pt-3 border-t-2 border-ink">
            To be donated to Cancer Support NZ at the end of the Summer Season 2027.
          </p>
        </div>
      </div>
    </div>
  );
}
