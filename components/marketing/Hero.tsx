import Image from "next/image";

export default function Hero() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] bg-purple text-cream items-center">
      <div className="order-2 lg:order-1 px-[18px] py-[26px] pb-[22px] lg:p-[60px_44px] flex flex-col gap-4 lg:gap-[26px] justify-center">
        <div className="font-mono text-[9px] lg:text-[11px] font-extrabold tracking-[0.14em] lg:tracking-[0.16em]">
          STRETCHY &middot; A SOCIAL MOVEMENT &middot; TĀMAKI MAKAURAU
        </div>
        <h1 className="font-display text-[40px] lg:text-[61px] leading-[.92] lg:leading-[.9] m-0">
          Stretching bodies, minds and social circles.
        </h1>
        <p className="m-0 text-sm lg:text-base leading-[1.5] max-w-[470px]">
          Welcome to the Stretchy social movement. Where the more we move together, the better it gets for all. Actually. 👀
        </p>

        <div className="flex flex-col gap-2 lg:hidden">
          <a href="#whats-on" className="inline-flex items-center justify-center h-12 bg-yellow text-ink border-2 border-cream rounded-pill text-[15px] font-bold">
            See what&rsquo;s on
          </a>
          <div className="flex gap-2">
            <a href="#about" className="flex-1 inline-flex items-center justify-center h-12 bg-transparent text-cream border-2 border-cream rounded-pill text-[13px] font-bold">
              What&rsquo;s Stretchy?
            </a>
            <a href="#how-it-works" className="flex-1 inline-flex items-center justify-center h-12 bg-transparent text-cream border-2 border-cream rounded-pill text-[13px] font-bold">
              Social pricing?
            </a>
          </div>
        </div>

        <div className="hidden lg:flex gap-3 flex-wrap">
          <a href="#whats-on" className="inline-flex items-center justify-center bg-yellow text-ink border-2 border-cream rounded-pill h-11 px-[22px] text-sm font-bold whitespace-nowrap">
            See what&rsquo;s on
          </a>
          <a href="#about" className="inline-flex items-center justify-center bg-transparent text-cream border-2 border-cream rounded-pill h-11 px-[22px] text-sm font-bold whitespace-nowrap">
            What&rsquo;s Stretchy?
          </a>
          <a href="#how-it-works" className="inline-flex items-center justify-center bg-transparent text-cream border-2 border-cream rounded-pill h-11 px-[22px] text-sm font-bold whitespace-nowrap">
            What&rsquo;s social pricing?
          </a>
        </div>
      </div>

      <div className="order-1 lg:order-2 px-[18px] pt-[26px] lg:p-[44px_44px_44px_0]">
        <Image
          src="/images/marketing/hero-mat-mugs.jpg"
          alt="Two mugs on a mat in the grass"
          width={640}
          height={520}
          priority
          className="block w-full h-[230px] lg:h-[520px] object-cover rounded-2xl lg:rounded-[20px] border-2 border-ink"
        />
      </div>
    </div>
  );
}
