import Image from "next/image";

export default function WhatStretchyIs() {
  return (
    <div
      id="about"
      className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,.95fr)] bg-hot-blue text-cream border-t-2 border-ink px-[18px] py-[26px] lg:p-[60px_44px] gap-4 lg:gap-12 lg:items-stretch"
    >
      <div className="flex flex-col gap-[14px] lg:gap-[18px] min-w-0">
        <div className="font-mono text-[9px] lg:text-[11px] font-extrabold tracking-[0.14em] lg:tracking-[0.15em]">
          STRETCHY &middot; A SOCIAL MOVEMENT
        </div>
        <h2 className="font-display text-[34px] lg:text-[50px] leading-[.94] lg:leading-[.92] m-0">
          Connect with self. Connect with others.
        </h2>
        <p className="m-0 text-sm lg:text-[15px] leading-[1.55] max-w-[520px]">
          Stretchy is an IRL movement community for people who want to move without the membership. And make new mates while doing so.
        </p>
        <p className="m-0 text-sm lg:text-[15px] leading-[1.55] max-w-[520px]">
          We started in Auckland in 2024 — community-led yoga classes built on the idea that movement is better together.
          <span className="hidden lg:inline"> Stretching bodies, minds and social circles beyond the walls of a yoga studio.</span>
        </p>
        <p className="m-0 text-[15px] leading-[1.45] lg:leading-[1.55] font-bold max-w-[520px]">
          Stretchy is now back — new and improved.
          <span className="hidden lg:inline"> Made for fairer movement together.</span> The more people who join a Stretchy session, the less everyone pays.
        </p>
        <Image
          src="/images/marketing/bayfield-hall-practice.jpg"
          alt="Practice at Bayfield hall"
          width={410}
          height={521}
          className="block w-full h-[230px] object-cover rounded-2xl border-2 border-ink lg:hidden"
        />
      </div>
      <Image
        src="/images/marketing/bayfield-hall-practice.jpg"
        alt="Practice at Bayfield hall"
        width={410}
        height={521}
        className="hidden lg:block w-full h-[521px] object-cover rounded-[20px] border-2 border-ink justify-self-end"
      />
    </div>
  );
}
