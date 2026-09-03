import SMark from "@/components/SMark";
import NewsletterSignup from "./NewsletterSignup";

export default function MarketingFooter() {
  return (
    <div className="bg-orange border-t-2 border-ink text-ink px-[18px] py-[30px] lg:p-[60px_44px] flex flex-col gap-[22px] lg:gap-10">
      <div className="flex flex-col gap-3.5 lg:gap-5 items-center text-center">
        <SMark size={48} />
        <h2 className="font-display text-[34px] lg:text-[50px] leading-[.94] lg:leading-[.92] m-0 lg:max-w-[820px]">
          Welcome to the highlight of your week.
        </h2>
        <a
          href="#whats-on"
          className="w-full lg:w-auto inline-flex items-center justify-center bg-transparent text-ink border-2 border-ink rounded-pill h-12 lg:h-14 px-[34px] text-[15px] lg:text-[17px] font-bold whitespace-nowrap"
        >
          Join us
        </a>
      </div>

      <div className="border-2 border-ink rounded-2xl lg:rounded-[20px] p-5 lg:p-[28px_30px] flex flex-col lg:grid lg:grid-cols-2 gap-3 lg:gap-7 lg:items-center">
        <div className="min-w-0">
          <div className="font-mono text-[9px] lg:text-[11px] font-extrabold tracking-[0.14em] lg:tracking-[0.15em]">STRETCHY UPDATES</div>
          <h3 className="font-display text-[28px] lg:text-[34px] leading-[.96] m-0 mt-2">Be in the know.</h3>
          <p className="m-0 mt-2 text-[13px] lg:text-sm leading-[1.55] lg:max-w-[420px]">
            Sign up with your email for exciting updates, events and community notices. We&rsquo;ll be light on the comms and only give you what you need.
          </p>
        </div>
        <div className="min-w-0">
          <NewsletterSignup />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr_1fr_1fr] gap-4 lg:gap-7 border-t-2 border-ink pt-5 lg:pt-9 -mx-[18px] px-[18px] lg:mx-[-44px] lg:px-[44px]">
        <div className="flex flex-col gap-3">
          <div className="font-display text-[22px] lg:text-[23px] leading-none">STRETCHY</div>
          <p className="m-0 text-xs lg:text-[13px] leading-[1.55] max-w-[280px]">
            A social movement in Tāmaki Makaurau. Stretching bodies, minds &amp; social circles. Now with people-powered pricing to make it fairer for all.
          </p>
          <div className="flex flex-wrap items-center gap-2.5 mt-1">
            <a href="mailto:kimberley@stretchyyoga.co.nz" className="text-xs lg:text-[13px] font-bold text-ink underline">kimberley@stretchyyoga.co.nz</a>
            <span className="w-[1.5px] h-3 bg-ink/40" />
            <a href="https://www.instagram.com/stretchy.yoga/" className="text-xs lg:text-[13px] font-bold text-ink underline">Instagram</a>
            <span className="w-[1.5px] h-3 bg-ink/40" />
            <a href="https://www.tiktok.com/@stretchy.yoga" className="text-xs lg:text-[13px] font-bold text-ink underline">TikTok</a>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:contents gap-4 text-xs lg:text-[13px]">
          <div className="flex flex-col gap-[7px] lg:gap-[9px]">
            <span className="font-mono text-[9px] lg:text-[10px] font-extrabold tracking-[0.12em] lg:tracking-[0.13em]">STRETCHY</span>
            <a href="#whats-on">What&rsquo;s on</a>
            <a href="#how-it-works">How it works</a>
            <a href="#suggest">Suggest a Stretchy</a>
            <span>Stretchy Store</span>
          </div>
          <div className="flex flex-col gap-[7px] lg:gap-[9px]">
            <span className="font-mono text-[9px] lg:text-[10px] font-extrabold tracking-[0.12em] lg:tracking-[0.13em]">OPPORTUNITIES</span>
            <a href="/host/apply">Teach a Stretchy</a>
            <a href="/venue/offer">Offer a space</a>
            <a href="/gem/apply">Become a Good Energy Manager</a>
            <a href="/partner">Partner with us</a>
          </div>
        </div>

        <div className="flex flex-col gap-[7px] lg:gap-[9px] text-xs lg:text-[13px] col-span-2 lg:col-span-1">
          <span className="font-mono text-[9px] lg:text-[10px] font-extrabold tracking-[0.12em] lg:tracking-[0.13em]">THE FINE PRINT</span>
          <a href="/terms">Terms</a>
          <a href="/privacy">Privacy policy</a>
          <a href="/faq">FAQ</a>
          <a href="/sitemap.xml">Sitemap</a>
          <a href="#how-it-works" className="hidden lg:inline">How pricing works</a>
        </div>
      </div>
    </div>
  );
}
