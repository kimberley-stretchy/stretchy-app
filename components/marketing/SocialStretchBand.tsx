import Image from "next/image";

const DESKTOP_PHOTOS = [
  { src: "/images/marketing/proof-honey-sundays-table.jpg", alt: "The long table at Honey Sundays" },
  { src: "/images/marketing/proof-warehouse-practice.jpg", alt: "A full room mid-practice" },
  { src: "/images/marketing/proof-bar-group.jpg", alt: "The group at the bar afterwards" },
  { src: "/images/marketing/proof-coffee-table.jpg", alt: "Coffee and laughing after a session" },
  { src: "/images/marketing/proof-hall-practice.jpg", alt: "Practice in a community hall" },
];

const MOBILE_PHOTOS = [
  { src: "/images/marketing/proof-honey-sundays-table.jpg", alt: "The long table at Honey Sundays" },
  { src: "/images/marketing/proof-bar-group.jpg", alt: "The group at the bar afterwards" },
  { src: "/images/marketing/proof-warehouse-practice.jpg", alt: "A full room mid-practice" },
  { src: "/images/marketing/proof-coffee-table.jpg", alt: "Coffee and laughing after a session" },
];

export default function SocialStretchBand() {
  return (
    <div className="bg-yellow border-t-2 border-ink text-ink px-[18px] py-[26px] lg:p-[60px_44px] flex flex-col gap-3.5 lg:gap-[18px]">
      <div className="font-mono text-[9px] lg:text-[11px] font-extrabold tracking-[0.14em] lg:tracking-[0.16em]">THE SOCIAL STRETCH</div>
      <h2 className="font-display text-[34px] lg:text-[50px] leading-[.94] lg:leading-[.92] m-0">What&rsquo;s a &lsquo;Social Stretch&rsquo;?</h2>
      <p className="m-0 text-sm lg:text-[15px] leading-[1.55] lg:max-w-[820px]">
        It&rsquo;s where we make mates &amp; new connections off the mat.
        <span className="hidden lg:inline"> This is the half of Stretchy that isn&rsquo;t on the mat, and it matters just as much.</span> Every session ends somewhere good — a café, a bar, a patch of grass — and everyone&rsquo;s welcome to stay.
      </p>
      <p className="m-0 text-sm lg:text-[15px] leading-[1.55] lg:max-w-[820px]">
        Our Good Energy Managers (aka. community hosts) help set the comfort levels. Then it&rsquo;s up to you to take the next brave step.
      </p>
      <p className="hidden lg:block m-0 text-[15px] leading-[1.55] max-w-[820px]">
        Coming solo or BYO-ing your pals? Either way works for us.
      </p>

      <BuddyExplainer />

      <div className="grid grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[9px] lg:gap-3.5">
        {MOBILE_PHOTOS.map((p) => (
          <Image
            key={p.src}
            src={p.src}
            alt={p.alt}
            width={300}
            height={400}
            className="lg:hidden block w-full aspect-[3/4] object-cover rounded-[14px] border-2 border-ink"
          />
        ))}
        {DESKTOP_PHOTOS.map((p) => (
          <Image
            key={p.src}
            src={p.src}
            alt={p.alt}
            width={300}
            height={400}
            className="hidden lg:block w-full aspect-[3/4] object-cover rounded-2xl border-2 border-ink"
          />
        ))}
      </div>
    </div>
  );
}

// Buddy Me Up, explained (SOCIAL_BOOKING_BRIEF.md section 6): three steps.
const BUDDY_STEPS = [
  { icon: "🙋", title: "Switch it on", text: "Hold your place, then switch on Buddy Me Up on your booking page. Add a little hello if you like." },
  { icon: "✉️", title: "We introduce you", text: "36 hrs out, we email you your buddy: their first name and hello. Uneven numbers? A few of you go together." },
  { icon: "☕", title: "Find each other", text: "Look out for each other on the day, then grab a coffee or a drink together at the Social Stretch." },
];

function BuddyExplainer() {
  return (
    <div className="bg-white border-2 border-ink rounded-[22px] p-4 lg:p-6 flex flex-col gap-3 lg:gap-4 lg:max-w-[1000px]">
      <div>
        <div className="font-mono text-[9px] lg:text-[11px] font-extrabold tracking-[0.14em] lg:tracking-[0.16em]">NEW · BUDDY ME UP 👋</div>
        <h3 className="font-display text-[26px] lg:text-[36px] leading-[.95] m-0 mt-1.5">Coming solo? We&rsquo;ll buddy you up.</h3>
        <p className="m-0 mt-2 text-sm lg:text-[15px] leading-[1.55]">
          Coming solo, or just keen to meet someone new? With <strong>Buddy Me Up</strong>, we&rsquo;ll introduce you to someone else at your session, so you&rsquo;ve got a friendly face to look out for.
        </p>
      </div>
      <ol className="m-0 p-0 list-none grid grid-cols-1 lg:grid-cols-3 gap-2.5 lg:gap-3.5">
        {BUDDY_STEPS.map((s, i) => (
          <li key={s.title} className="flex lg:flex-col gap-3 lg:gap-2 items-start rounded-2xl bg-cream border-2 border-ink p-3 lg:p-4">
            <span className="text-2xl flex-shrink-0" aria-hidden>{s.icon}</span>
            <div>
              <p className="m-0 font-bold text-sm lg:text-[15px]">{i + 1}. {s.title}</p>
              <p className="m-0 text-[13px] lg:text-sm leading-[1.5] text-ink/70">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="m-0 text-[13px] lg:text-sm leading-[1.5]">
        We only share first names and a little hello, nothing else. <strong>Come solo, leave with a crew.</strong>
      </p>
    </div>
  );
}
