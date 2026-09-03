import type { Metadata } from "next";
import Link from "next/link";
import SMark from "@/components/SMark";

export const metadata: Metadata = {
  title: "Store — Stretchy",
  description: "The Stretchy Store is coming back soon.",
};

export default function StorePage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 text-center" style={{ background: "#902F8A", color: "#F7F0E8" }}>
      <div className="mb-6"><SMark size={40} /></div>
      <div className="font-mono text-[10px] font-extrabold tracking-[0.14em] opacity-70 mb-3">STRETCHY STORE</div>
      <h1 className="font-display text-[36px] lg:text-[52px] leading-[.94] max-w-[14ch] mb-4">
        Coming back real soon.
      </h1>
      <p className="text-sm lg:text-base leading-relaxed max-w-md opacity-90 mb-8">
        Email{" "}
        <a href="mailto:kimberley@stretchyyoga.co.nz" className="underline font-semibold">
          kimberley@stretchyyoga.co.nz
        </a>{" "}
        or hit up our DMs for a cheeky tee in the meantime. We can do things the old fashioned way.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center h-12 px-7 rounded-pill text-sm font-bold border-2"
        style={{ borderColor: "#F7F0E8" }}
      >
        Back to Stretchy
      </Link>
    </main>
  );
}
