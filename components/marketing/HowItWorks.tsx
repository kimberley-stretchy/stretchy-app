const CARDS = [
  {
    n: "01",
    title: "Hold your place",
    bodyMobile: "Nothing is charged. You see the most you could ever pay, up front. Confirmed 36 hours before.",
    bodyDesktop:
      "Nothing is charged. You see the most you could ever pay, up front. Here we make sure we get enough Stretchy-goers for the session to go ahead — confirmed 36 hours before.",
    cta: "See what’s on",
  },
  {
    n: "02",
    title: "The room fills, gets better for all",
    bodyMobile: "Once the minimum viable mats are reached, the session is locked in. Your final price is locked 2 hours out.",
    bodyDesktop:
      "Once the minimum viable mats are reached, the session is locked in. The more people from here, the better the price for all. Your final price is locked 2 hours out.",
  },
  {
    n: "03",
    title: "We move together",
    bodyMobile: "Your teacher guides the practice, and our Good Energy Managers are there for the community vibes.",
    bodyDesktop:
      "Your teacher guides the practice, and our Good Energy Managers (aka. community hosts) are there for the community vibes and to make you feel oh so welcome.",
  },
  {
    n: "04",
    title: "The Social Stretch",
    bodyMobile: 'The fun bit after the bit. Café, bar, grass. Always say “kia ora” to someone new.',
    bodyDesktop: 'The fun bit after the bit. Café, bar, grass. Here we make mates off the mat & always say “kia ora” to someone new.',
  },
];

export default function HowItWorks() {
  return (
    <div
      id="how-it-works"
      className="bg-sky text-ink border-t-2 border-ink px-[18px] py-[26px] lg:p-[60px_44px] flex flex-col gap-[14px] lg:gap-9"
    >
      <div className="flex flex-col gap-[14px] max-w-[800px]">
        <div className="font-mono text-[9px] lg:text-[11px] font-extrabold tracking-[0.14em] lg:tracking-[0.15em]">
          HOW IT WORKS &middot; SOCIAL PRICING
        </div>
        <h2 className="font-display text-[34px] lg:text-[50px] leading-[.94] lg:leading-[.94] m-0 max-w-[16ch]">
          The more we move together, the better it gets for all.
        </h2>
        <p className="hidden lg:block m-0 text-[15px] leading-[1.55]">
          Every Stretchy needs a certain number of people to run. Once we&rsquo;ve got them, we&rsquo;re on — and everyone who joins after makes it better for the whole room. (Yes, that&rsquo;s right, it&rsquo;s people-powered pricing.)
        </p>
        <p className="lg:hidden m-0 text-sm leading-[1.55]">
          Every Stretchy needs a certain number of people to run. Once we&rsquo;ve got them, we&rsquo;re on — and everyone who joins after makes it better for the whole room.
        </p>
      </div>

      <div className="flex flex-col gap-[9px] lg:grid lg:grid-cols-[repeat(auto-fit,minmax(230px,1fr))] lg:gap-[18px]">
        {CARDS.map((c) => (
          <div
            key={c.n}
            className="bg-sky border-2 border-ink rounded-2xl lg:rounded-[20px] p-4 lg:p-6 flex flex-col gap-3"
          >
            <div className="font-mono text-[11px] lg:text-[13px] font-extrabold tracking-[0.12em]">{c.n}</div>
            <div className="font-display text-[22px] lg:text-[23px] leading-none mt-1.5 lg:mt-0">{c.title}</div>
            <p className="m-0 mt-1.5 lg:mt-0 text-[13px] leading-[1.5]">
              <span className="lg:hidden">{c.bodyMobile}</span>
              <span className="hidden lg:inline">{c.bodyDesktop}</span>
            </p>
            {c.cta && (
              <a
                href="#whats-on"
                className="w-full lg:w-auto mt-3 lg:mt-0 lg:self-start lg:mt-auto inline-flex items-center justify-center bg-ink text-cream border-2 border-ink rounded-pill h-11 px-[22px] text-[13px] lg:text-sm font-bold"
              >
                {c.cta}
              </a>
            )}
          </div>
        ))}
      </div>

      <p className="m-0 text-[13px] lg:text-sm leading-[1.6] lg:max-w-[820px]">
        <span className="tracking-[0.06em]">🌏 🧘 🙏</span> The Stretchy pricing model rewards community, while ensuring teachers, community venues and our Good Energy Managers are remunerated fairly for their expertise &amp; energy. We also contribute NZ$10 per session to a registered charity or social enterprise in line with movement &amp; mindfulness.
        <span className="hidden lg:inline"> Plus funds towards the ongoing operational, marketing and brand costs of Stretchy.</span>
      </p>

      <p className="m-0 text-[13px] lg:text-sm leading-[1.6] lg:max-w-[820px]">
        Free to cancel before your Stretchy locks in at 36 hours out. After that, the price stands &mdash; that&rsquo;s what keeps it fair for everyone showing up. If we ever have to cancel on our end, you&rsquo;re refunded in full, always.
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
