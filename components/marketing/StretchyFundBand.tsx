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
          <p className="m-0 text-sm lg:text-[15px] leading-[1.55] lg:max-w-[520px]">
            <strong>$10 from every Stretchy session goes to{" "}
            <a href={CHARITY_URL} target="_blank" rel="noopener noreferrer" className="underline">Cancer Support NZ</a></strong>{" "}
            and their movement, meditation, connection and yoga nidra programmes for patients &amp; their wider support networks.{" "}
            <a href={CHARITY_URL} target="_blank" rel="noopener noreferrer" className="underline font-semibold">You can find out more here.</a>
          </p>
          <p className="m-0 text-[15px] leading-[1.45] lg:leading-[1.55] font-bold">
            You&rsquo;ll know where this good money goes.
          </p>
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
            className="block border-2 border-ink rounded-[20px] p-5 lg:p-6 no-underline text-ink"
          >
            <p className="font-mono text-[10px] font-extrabold tracking-[0.1em] text-ink/50 mb-2">GOING TO</p>
            <p className="text-base font-bold m-0">Cancer Support NZ</p>
            <p className="text-sm m-0 mt-1 text-ink/75">Movement, meditation, connection &amp; yoga nidra programmes for patients and their wider support networks.</p>
            <p className="font-mono text-[10px] font-extrabold tracking-[0.06em] mt-3 m-0">FIND OUT MORE →</p>
          </a>
        </div>
      </div>
    </div>
  );
}
