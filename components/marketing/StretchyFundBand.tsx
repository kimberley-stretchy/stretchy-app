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
  const hasStarted = total > 0;

  return (
    <div className="bg-yellow border-t-2 border-ink text-ink px-[18px] py-[26px] lg:p-[60px_44px]">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,.85fr)] gap-6 lg:gap-[44px]">
        {/* Left: copy */}
        <div className="flex flex-col gap-3.5 lg:gap-[18px]">
          <div className="font-mono text-[9px] lg:text-[11px] font-extrabold tracking-[0.14em] lg:tracking-[0.16em]">THE STRETCHY DONATION</div>
          <h2 className="font-display text-[34px] lg:text-[50px] leading-[.94] lg:leading-[.92] m-0 max-w-[16ch]">
            Good money, going somewhere good.
          </h2>
          <p className="m-0 text-[15px] lg:text-[17px] leading-[1.45] font-bold lg:max-w-[520px]">
            $10 from every Stretchy session goes to Cancer Support NZ.
          </p>
          <p className="m-0 text-sm lg:text-[15px] leading-[1.55] lg:max-w-[520px]">
            Cancer Support New Zealand is a charity that helps people feel better while living with cancer. They offer free
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

        {/* Right: tally + where it goes */}
        <div className="flex flex-col gap-3 lg:gap-4">
          <div className="bg-cream border-2 border-ink rounded-[20px] p-5 lg:p-6">
            <p className="font-mono text-[10px] font-extrabold tracking-[0.1em] text-ink/50 mb-2">RAISED SO FAR</p>
            <p className="font-mono text-[44px] lg:text-[52px] font-black leading-none mb-2">
              {formatWholeDollars(total)}
            </p>
            {!hasStarted && (
              <p className="font-mono text-[10px] lg:text-xs font-extrabold tracking-[0.06em] mb-2" style={{ color: "#E96709" }}>
                AND COUNTING FROM SESSION ONE
              </p>
            )}
            <p className="text-sm font-semibold m-0">To be donated at the end of the Stretchy Summer Season.</p>
          </div>

          <a
            href={CHARITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-cream border-2 border-ink rounded-[20px] p-5 lg:p-6 no-underline text-ink"
          >
            <p className="font-mono text-[10px] font-extrabold tracking-[0.1em] text-ink/50 mb-3">GOING TO</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/partners/cancer-support-nz.svg" alt="Cancer Support New Zealand" width={180} height={72} className="block h-auto w-[160px] lg:w-[180px] mb-3" />
            <p className="text-sm m-0 text-ink/75">Free wellbeing classes for anyone affected by cancer, online and in communities around Aotearoa.</p>
            <p className="font-mono text-[10px] font-extrabold tracking-[0.06em] mt-3 m-0">FIND OUT MORE →</p>
          </a>
        </div>
      </div>
    </div>
  );
}
