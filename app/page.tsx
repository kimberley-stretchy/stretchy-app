import Link from "next/link";
import SMark from "@/components/SMark";
import HowToStretchy from "@/components/HowToStretchy";

export default function WelcomePage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-between px-6 py-10"
      style={{ backgroundColor: "#7A8330" }}
    >
      {/* ── S-MARK ── */}
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm pt-8">
        <div className="text-cream mb-10">
          <SMark size={180} />
        </div>

        {/* ── HEADLINE ── */}
        <h1
          className="text-cream font-display font-bold w-full text-center"
          style={{
            fontSize: "60px",
            letterSpacing: "-0.03em",
            lineHeight: "0.92",
          }}
        >
          A social
          <br />
          movement.
        </h1>

        {/* ── SUBTEXT ── */}
        <p
          className="text-cream mt-5 w-full text-center leading-snug"
          style={{ fontSize: "16px", opacity: 0.85 }}
        >
          The larger the group gets, the better value for all. Join us.
        </p>

        {/* ── CTA BUTTONS ── */}
        <div className="w-full mt-10 flex flex-col gap-3">
          <Link
            href="/onboarding"
            className="w-full flex items-center justify-between px-7 font-semibold text-ink rounded-pill transition-all hover:brightness-95 active:scale-[0.98]"
            style={{
              backgroundColor: "#F5EDE3",
              height: "70px",
              fontSize: "17px",
            }}
          >
            <span>I'm new — sign up</span>
            <span>→</span>
          </Link>

          <Link
            href="/login?role=returning"
            className="w-full flex items-center justify-between px-7 font-semibold text-cream rounded-pill transition-all hover:brightness-125 active:scale-[0.98]"
            style={{
              backgroundColor: "#1A1A1A",
              height: "62px",
              fontSize: "16px",
            }}
          >
            <span>I have an account — log in</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* ── HOW TO STRETCHY ── */}
      <div className="w-full max-w-sm mt-12">
        <HowToStretchy />
      </div>

      {/* ── MONO FOOTER ── */}
      <div className="flex flex-col items-center gap-3 mt-8">
        <div className="flex items-center gap-4">
          <a
            href="https://www.instagram.com/stretchy.yoga/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-cream uppercase tracking-widest transition-opacity hover:opacity-100"
            style={{ fontSize: "11px", opacity: 0.7 }}
          >
            Instagram
          </a>
          <span className="text-cream" style={{ opacity: 0.3 }}>·</span>
          <a
            href="https://www.tiktok.com/@stretchy.yoga"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-cream uppercase tracking-widest transition-opacity hover:opacity-100"
            style={{ fontSize: "11px", opacity: 0.7 }}
          >
            TikTok
          </a>
          <span className="text-cream" style={{ opacity: 0.3 }}>·</span>
          <a
            href="https://substack.com/@stretchyyoga"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-cream uppercase tracking-widest transition-opacity hover:opacity-100"
            style={{ fontSize: "11px", opacity: 0.7 }}
          >
            Substack
          </a>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/terms"
            className="font-mono text-cream uppercase tracking-widest transition-opacity hover:opacity-100"
            style={{ fontSize: "11px", opacity: 0.5 }}
          >
            Terms
          </Link>
          <span className="text-cream" style={{ opacity: 0.3 }}>·</span>
          <Link
            href="/privacy"
            className="font-mono text-cream uppercase tracking-widest transition-opacity hover:opacity-100"
            style={{ fontSize: "11px", opacity: 0.5 }}
          >
            Privacy
          </Link>
          <span className="text-cream" style={{ opacity: 0.3 }}>·</span>
          <Link
            href="/contact"
            className="font-mono text-cream uppercase tracking-widest transition-opacity hover:opacity-100"
            style={{ fontSize: "11px", opacity: 0.5 }}
          >
            Contact
          </Link>
        </div>
        <p
          className="font-mono text-cream text-center tracking-[0.10em] uppercase"
          style={{ fontSize: "10px", opacity: 0.4 }}
        >
          Auckland · Built in Aotearoa 🌿
        </p>
      </div>
    </main>
  );
}
