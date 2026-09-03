const CARDS = [
  {
    kicker: "TEACH",
    color: "#0000FF",
    title: "Teach a Stretchy",
    body: "Remunerated fairly, every session, whether the room is full or just full enough. Bring your own style.",
    href: "/host/apply",
  },
  {
    kicker: "HOST",
    color: "#E96709",
    title: "Host the space",
    body: "A hall, a studio, a rooftop — or a café or bar for the Social Stretch. A room full of locals, straight to you.",
    href: "/venue/offer",
  },
  {
    kicker: "GEM",
    color: "#716F39",
    title: "Become a Good Energy Manager",
    body: "Aka. community host. Greet, check people in, and make sure nobody stands on their own at the Social Stretch.",
    href: "/gem/apply",
  },
];

export default function OpportunitiesBand() {
  return (
    <div id="opportunities" className="bg-cream border-t-2 border-ink text-ink px-[18px] py-[26px] lg:p-[60px_44px] flex flex-col gap-3.5 lg:gap-[30px]">
      <div className="flex flex-col gap-3 lg:gap-3 lg:max-w-[760px]">
        <div className="font-mono text-[9px] lg:text-[11px] font-extrabold tracking-[0.14em] lg:tracking-[0.15em]">STRETCHY OPPORTUNITIES</div>
        <h2 className="font-display text-[34px] lg:text-[50px] leading-[.94] lg:leading-[.92] m-0">Like what we&rsquo;re doing?</h2>
        <p className="m-0 text-sm lg:text-[15px] leading-[1.55] text-ink/75">
          We&rsquo;re open minded and open to bringing Stretchy to life in more ways. Teachers, venues, cafés and bars, and the Good Energy Managers who hold the community together.
          <span className="hidden lg:inline"> If you want in, or you want Stretchy (or the tech behind Stretchy), start here.</span>
        </p>
      </div>

      {/* Mobile: tappable list rows */}
      <div className="flex lg:hidden flex-col gap-[9px]">
        {CARDS.map((c) => (
          <a
            key={c.title}
            href={c.href}
            className="border-2 border-ink rounded-2xl p-4 flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="font-mono text-[9px] font-extrabold tracking-[0.12em]" style={{ color: c.color }}>{c.kicker}</div>
              <div className="font-display text-[20px] leading-none mt-1.5">{c.title}</div>
            </div>
            <span className="text-lg flex-shrink-0">›</span>
          </a>
        ))}
        <div className="bg-purple text-cream border-2 border-ink rounded-2xl p-[18px]">
          <div className="font-display text-[22px] leading-none">Brand &amp; community partnerships</div>
          <p className="m-0 mt-2 text-[13px] leading-[1.5]">Good people, good brands, good ideas — from community partnerships and events to aligned brands and venues.</p>
          <a
            href="/partner"
            className="w-full mt-3 inline-flex items-center justify-center h-11 bg-transparent text-cream border-2 border-cream rounded-pill text-[13px] font-bold"
          >
            Let&rsquo;s make something good &rarr;
          </a>
        </div>
        <div className="bg-purple text-cream border-2 border-ink rounded-2xl p-[18px]">
          <div className="font-display text-[22px] leading-none">Business &amp; investment opportunities</div>
          <p className="m-0 mt-2 text-[13px] leading-[1.5]">A new economic model for movement communities. Partner, back, license or collaborate.</p>
          <a
            href="/partner"
            className="w-full mt-3 inline-flex items-center justify-center h-11 bg-transparent text-cream border-2 border-cream rounded-pill text-[13px] font-bold"
          >
            Start a conversation &rarr;
          </a>
        </div>
      </div>

      {/* Desktop: full cards */}
      <div className="hidden lg:grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4">
        {CARDS.map((c) => (
          <div key={c.title} className="bg-cream border-2 border-ink rounded-[20px] p-6 flex flex-col gap-3">
            <div className="font-mono text-[10px] font-extrabold tracking-[0.13em]" style={{ color: c.color }}>{c.kicker}</div>
            <div className="font-display text-[23px] leading-none">{c.title}</div>
            <p className="m-0 text-[13px] leading-[1.5] text-ink/70">{c.body}</p>
            <a
              href={c.href}
              className="mt-auto inline-flex items-center justify-center h-11 bg-ink text-cream border-2 border-ink rounded-pill text-sm font-bold"
            >
              Register interest
            </a>
          </div>
        ))}
        <a
          href="#suggest"
          className="bg-cream text-ink border-2 border-ink rounded-[20px] p-6 flex flex-col gap-3 no-underline"
        >
          <div className="font-mono text-[10px] font-extrabold tracking-[0.13em] text-purple">SUGGEST</div>
          <div className="font-display text-[23px] leading-none">Suggest a Stretchy</div>
          <p className="m-0 text-[13px] leading-[1.5] text-ink/70">Tell us where you want one — a place, a day, a kind of movement. Outside of Auckland too.</p>
          <span className="mt-auto h-11 bg-ink text-cream border-2 border-ink rounded-pill text-sm font-bold flex items-center justify-center">Jump to the board &uarr;</span>
        </a>
      </div>

      <div className="hidden lg:grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4 items-stretch">
        <div className="bg-purple border-t-2 border-ink text-cream rounded-[20px] p-7 flex flex-col gap-3.5">
          <div className="font-display text-[29px] leading-none">Brand &amp; community partnerships</div>
          <p className="m-0 text-[13px] leading-[1.55]">Good people, good brands, good ideas. We&rsquo;re always open to collaborations that help us bring more movement, connection and good energy into the world — from community partnerships and events to aligned brands, venues, organisations and creative ideas.</p>
          <a
            href="/partner"
            className="mt-auto self-start inline-flex items-center justify-center h-11 px-[26px] bg-transparent text-cream border-2 border-cream rounded-pill text-[15px] font-bold"
          >
            Let&rsquo;s make something good &rarr;
          </a>
        </div>
        <div className="bg-purple border-t-2 border-ink text-cream rounded-[20px] p-7 flex flex-col gap-3.5">
          <div className="font-display text-[29px] leading-none">Business &amp; investment opportunities</div>
          <p className="m-0 text-[13px] leading-[1.55]">We&rsquo;re creating a new economic model for movement communities, with the tech, systems and brand to match. Get in touch about partnering, backing, building, licensing or collaborating — whether that&rsquo;s growing Stretchy or exploring what we&rsquo;ve built for your own movement community.</p>
          <a
            href="/partner"
            className="mt-auto self-start inline-flex items-center justify-center h-11 px-[26px] bg-transparent text-cream border-2 border-cream rounded-pill text-[15px] font-bold"
          >
            Start a conversation &rarr;
          </a>
        </div>
      </div>

      <div className="hidden lg:flex items-center justify-between gap-5 border-2 border-dashed border-ink/35 rounded-[20px] p-[24px_28px]">
        <div className="min-w-[300px] max-w-[640px]">
          <div className="font-mono text-[10px] font-extrabold tracking-[0.13em]">FEEDBACK ON STRETCHY</div>
          <p className="mt-2 mb-0 text-[13px] leading-[1.5] text-ink/75">
            Been to a Stretchy, or just got thoughts? Tell us what worked, what didn&rsquo;t, and what you&rsquo;d change. It&rsquo;s how this gets better. Or email{" "}
            <a href="mailto:kimberley@stretchyyoga.co.nz" className="text-ink font-bold underline">kimberley@stretchyyoga.co.nz</a>.
          </p>
        </div>
        <a
          href="mailto:kimberley@stretchyyoga.co.nz?subject=Feedback on Stretchy"
          className="inline-flex items-center justify-center h-11 px-[26px] bg-transparent text-ink border-2 border-ink rounded-pill text-[15px] font-bold whitespace-nowrap"
        >
          Tell us more
        </a>
      </div>

      <p className="m-0 text-xs text-ink/50 leading-[1.5]">
        Built by Stretchy. Please don&rsquo;t copy it. Like our thinking?{" "}
        <a href="/vision" className="text-ink/70 font-semibold underline">Let&rsquo;s talk →</a>
      </p>
    </div>
  );
}
