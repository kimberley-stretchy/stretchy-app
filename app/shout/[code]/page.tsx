import type { Metadata } from "next";
import Link from "next/link";
import SMark from "@/components/SMark";
import { serviceClient } from "@/lib/routeAuth";
import { shoutByCode } from "@/lib/shout";
import { buildSessionEmailExtras } from "@/lib/sessionEmailContext";
import { formatDay, formatTime, phase } from "@/lib/sessionTimes";
import { styleAndLevel } from "@/lib/sessionDisplay";
import { socialDrink } from "@/lib/shareMessage";
import ShoutClaim from "./ShoutClaim";

// stretchyyoga.co.nz/shout/{code} — someone has shouted you a place.
// SOCIAL_BOOKING_BRIEF.md section 4, "Claim page". The price is never shown here.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "You've been shouted a place at Stretchy",
  description: "An hour of yoga with a great teacher, then a Social Stretch after. It's all paid for.",
  robots: { index: false, follow: false },
};

const button = "block w-full text-center rounded-pill py-[13px] px-[18px] font-bold text-[15px]";

export default async function ShoutClaimPage({ params }: { params: { code: string } }) {
  const admin = serviceClient();
  const found = await shoutByCode(admin, params.code).catch(() => null);

  const shell = (children: React.ReactNode) => (
    <main className="min-h-screen bg-cream pb-20">
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <Link href="/" className="text-ink"><SMark size={28} /></Link>
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-muted">A shout</span>
        <div className="w-7" />
      </nav>
      <div className="px-4 max-w-lg mx-auto space-y-5 text-ink">{children}</div>
    </main>
  );
  const ended = (title: string, text: string) => shell(<>
    <h1 className="font-display font-bold" style={{ fontSize: "clamp(36px,10vw,48px)", letterSpacing: "-0.03em", lineHeight: 0.95 }}>{title}</h1>
    <p className="text-sm">{text}</p>
    <Link href="/sessions" className={button} style={{ background: "#14110F", color: "#F7F0E8" }}>What’s on</Link>
  </>);

  if (!found) return ended("This link doesn’t work.", "Check it with the person who sent it. Or have a look at what’s on.");
  const { shout, session, giverName } = found;
  if (shout.state === "claimed" || shout.state === "settled") return ended("This place has been claimed.", `Already yours? Log in to see it. If not, have a look at what else is on.`);
  const closed = shout.state !== "paid" || session.state === "cancelled" || session.state === "locked" || phase(session.starts_at, session.state) === "after2";
  if (closed) return ended("This shout isn’t available any more.", "You can still come along to Stretchy. Have a look at what’s on.");

  const extras = await buildSessionEmailExtras(admin, session, session.id);
  const { style } = styleAndLevel(session.description, session.movement_type);
  const day = formatDay(session.starts_at);
  const time = formatTime(session.starts_at);
  const social = (session.social_stretch_venue ?? "").split("·")[0].trim();
  const bring = (session.bring_title ?? "").trim() || (session.what_to_bring ?? []).filter(Boolean)[0] || "";

  const lines = [
    { icon: "🧘", bold: "Yoga, then a Social Stretch.", text: `An hour with a great teacher, then ${socialDrink(session.starts_at)} and chats.` },
    { icon: "💛", bold: "Every body welcome.", text: "Never done yoga? Perfect. Go at your own pace." },
    { icon: "📍", bold: `${day}, ${time}.`, text: `${session.location_name ?? ""}${session.location_name ? ". " : ""}Arrive 10 mins early.` },
    bring && { icon: "🎒", bold: `${bring.replace(/\.$/, "")}.`, text: "And some water." },
    { icon: "👋", bold: "Say kia ora.", text: extras.teacherName ? `Meet ${extras.teacherName}${extras.gemName ? ` and your GEM, ${extras.gemName},` : " and your GEM,"} who looks after everyone.` : "Meet your teacher and your GEM, who looks after everyone." },
    social && { icon: "☕", bold: `Social Stretch at ${social}.`, text: "Pay your own way. Stay as long as you like." },
    { icon: "✨", bold: "Why?", text: "Stretching bodies, minds and social circles." },
  ].filter(Boolean) as { icon: string; bold: string; text: string }[];

  return shell(
    <ShoutClaim
      code={shout.code}
      giver={giverName}
      name={shout.recipient_name}
      email={shout.recipient_email ?? ""}
      note={shout.note}
      heading={`${style || "Yoga"} · ${day} · ${time}`}
      venue={session.location_name ?? ""}
      lines={lines}
    />
  );
}
