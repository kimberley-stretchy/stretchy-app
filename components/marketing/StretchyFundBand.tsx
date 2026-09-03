function formatWholeDollars(amount: number): string {
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: "NZD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const BALLOT = [
  { name: "Yoga in Prisons Trust", note: "VOTING OPENS MAR" },
  { name: "Stretchy YTT scholarship", note: "VOTING OPENS MAR" },
];

export default function StretchyFundBand({ total }: { total: number }) {
  const hasStarted = total > 0;

  return (
    <div className="bg-yellow border-t-2 border-ink text-ink px-[18px] py-[26px] lg:p-[60px_44px]">
      <div className="grid gap-6 lg:gap-[44px]" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,.85fr)" }}>
        {/* Left: copy */}
        <div className="flex flex-col gap-3.5 lg:gap-[18px]">
          <div className="font-mono text-[9px] lg:text-[11px] font-extrabold tracking-[0.14em] lg:tracking-[0.16em]">THE STRETCHY FUND</div>
          <h2 className="font-display text-[34px] lg:text-[50px] leading-[.94] lg:leading-[.92] m-0 max-w-[16ch]">
            Good money, going somewhere good.
          </h2>
          <p className="m-0 text-sm lg:text-[15px] leading-[1.55] lg:max-w-[520px]">
            <strong>$10 from every Stretchy goes straight into the Fund.</strong> Every financial year, the Stretchy community votes on where it goes &mdash; right now it&rsquo;s between{" "}
            <a href="https://www.yogainprisonstrust.org/" className="underline font-semibold">Yoga in Prisons Trust</a> and a Stretchy YTT scholarship.
          </p>
          <p className="m-0 text-[15px] leading-[1.45] lg:leading-[1.55] font-bold">
            You&rsquo;ll know where this good money goes.
          </p>
        </div>

        {/* Right: tally + ballot */}
        <div className="flex flex-col gap-3 lg:gap-4">
          <div className="bg-cream border-2 border-ink rounded-[20px] p-5 lg:p-6">
            <p className="font-mono text-[10px] font-extrabold tracking-[0.1em] text-ink/50 mb-2">IN THE FUND SO FAR</p>
            <p className="font-mono text-[44px] lg:text-[52px] font-black leading-none mb-2">
              {formatWholeDollars(total)}
            </p>
            {!hasStarted && (
              <p className="font-mono text-[10px] lg:text-xs font-extrabold tracking-[0.06em]" style={{ color: "#E96709" }}>
                AND COUNTING FROM SESSION ONE
              </p>
            )}
          </div>

          <div className="border-2 border-ink rounded-[20px] p-5 lg:p-6">
            <p className="font-mono text-[10px] font-extrabold tracking-[0.1em] text-ink/50 mb-3">ON THE BALLOT THIS YEAR</p>
            <div className="flex flex-col">
              {BALLOT.map((b, i) => (
                <div
                  key={b.name}
                  className="flex items-center justify-between py-2.5"
                  style={i > 0 ? { borderTop: "1.5px solid #E1D5C6" } : undefined}
                >
                  <span className="text-sm font-bold">{b.name}</span>
                  <span className="font-mono text-[10px] font-bold text-ink/45 tracking-[0.04em] whitespace-nowrap ml-3">{b.note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
