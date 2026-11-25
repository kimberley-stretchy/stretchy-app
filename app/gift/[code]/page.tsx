import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import SMark from "@/components/SMark";
import { giftStatus } from "@/lib/giftLinks";
import { formatDay } from "@/lib/sessionTimes";
import GiftClaim from "./GiftClaim";

// stretchyyoga.co.nz/gift/{code} — a friend claims their free place.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "A Stretchy on us",
  description: "Claim your free place at Stretchy: an hour of yoga, then a Social Stretch after.",
  robots: { index: false, follow: false },
};

const button = "block w-full text-center rounded-pill py-[13px] px-[18px] font-bold text-[15px]";

export default async function GiftPage({ params }: { params: { code: string } }) {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const status = await giftStatus(admin, params.code).catch(() => ({ kind: "missing" as const }));

  return (
    <main className="min-h-screen bg-cream pb-20">
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <Link href="/" className="text-ink"><SMark size={28} /></Link>
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-muted">On us</span>
        <div className="w-7" />
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-5">
        {status.kind === "open" ? (
          <GiftClaim
            code={status.gift.code}
            from={status.gift.from_name}
            until={formatDay(status.gift.expires_at)}
            left={status.left}
            sessions={status.sessions}
          />
        ) : (
          <>
            <h1 className="font-display font-bold text-ink" style={{ fontSize: "clamp(36px,10vw,48px)", letterSpacing: "-0.03em", lineHeight: 0.95 }}>
              {status.kind === "used"
                ? `All of ${status.gift.from_name}’s places have been claimed.`
                : status.kind === "ended"
                  ? "This gift has ended."
                  : "This link doesn’t work."}
            </h1>
            <p className="text-sm text-ink">
              {status.kind === "missing" ? "Check it with the person who sent it. Or have a look at what’s on." : "You can still come along. Have a look at what’s on."}
            </p>
            <Link href="/sessions" className={button} style={{ background: "#14110F", color: "#F7F0E8" }}>What’s on</Link>
          </>
        )}
      </div>
    </main>
  );
}
