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
