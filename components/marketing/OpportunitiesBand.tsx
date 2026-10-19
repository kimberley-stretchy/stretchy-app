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

// Second row — three matching dashed boxes (no fill), below the four cards.
const MORE = [
  {
    title: "Brand & community partnerships",
    short: "Good people, good brands, good ideas — from community partnerships and events to aligned brands and venues.",
    body: "Good people, good brands, good ideas. We’re always open to collaborations that help us bring more movement, connection and good energy into the world — from community partnerships and events to aligned brands, venues, organisations and creative ideas.",
    cta: "Let’s make something good →",
    href: "/partner",
  },
  {
    title: "Business & investment opportunities",
    short: "A new economic model for movement communities. Partner, back, license or collaborate.",
    body: "We’re creating a new economic model for movement communities, with the tech, systems and brand to match. Get in touch about partnering, backing, building, licensing or collaborating — whether that’s growing Stretchy or exploring what we’ve built for your own movement community.",
    // Licensing, investment and partnerships for the tech now live on stretchy.social.
    link: { text: "exploring what we’ve built for your own movement community", href: "https://stretchy.social" },
    cta: "Licence the tech ↗",
    href: "https://stretchy.social",
  },
  {
    title: "Feedback on Stretchy",
    short: "Been to a Stretchy, or just got thoughts? Tell us what worked, what didn’t, and what you’d change.",
    body: "Been to a Stretchy, or just got thoughts? Tell us what worked, what didn’t, and what you’d change. It’s how this gets better.",
    cta: "Tell us more",
    href: "mailto:kimberley@stretchyyoga.co.nz?subject=Feedback on Stretchy",
  },
];

type BodyLink = { text: string; href: string };

// Turns one phrase inside a card's text into a link (e.g. to stretchy.social).
function withLink(body: string, link?: BodyLink) {
  if (!link || !body.includes(link.text)) return body;
  const [before, after] = body.split(link.text);
  return (
    <>
      {before}
      <a href={link.href} className="underline font-semibold text-ink">{link.text}</a>
      {after}
    </>
  );
}

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
        {MORE.map((m) => (
          <div key={m.title} className="border-2 border-dashed border-ink/35 rounded-2xl p-[18px]">
            <div className="font-display text-[22px] leading-none">{m.title}</div>
            <p className="m-0 mt-2 text-[13px] leading-[1.5] text-ink/75">{m.short}</p>
            <a
              href={m.href}
              className="w-full mt-3 inline-flex items-center justify-center h-11 bg-transparent text-ink border-2 border-ink rounded-pill text-[13px] font-bold"
            >
              {m.cta}
            </a>
          </div>
        ))}
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

      <div className="hidden lg:grid grid-cols-3 gap-4 items-stretch">
        {MORE.map((m) => (
          <div key={m.title} className="border-2 border-dashed border-ink/35 rounded-[20px] p-6 flex flex-col gap-3">
            <div className="font-display text-[23px] leading-none">{m.title}</div>
            <p className="m-0 text-[13px] leading-[1.5] text-ink/70">{withLink(m.body, (m as { link?: BodyLink }).link)}</p>
            <a
              href={m.href}
              className="mt-auto self-start inline-flex items-center justify-center h-11 px-[26px] bg-transparent text-ink border-2 border-ink rounded-pill text-sm font-bold"
            >
              {m.cta}
            </a>
          </div>
        ))}
      </div>

      <p className="m-0 text-xs text-ink/50 leading-[1.5]">
        Built by Stretchy. Please don&rsquo;t copy it. Like our thinking?{" "}
        <a href="/vision" className="text-ink/70 font-semibold underline">Let&rsquo;s talk →</a>
      </p>
    </div>
  );
}
