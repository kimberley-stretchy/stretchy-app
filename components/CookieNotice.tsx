"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const OK_KEY = "stretchy-cookie-notice-ok";

// A notice, not a consent form: Stretchy only sets essential cookies (login +
// Stripe payments), so there's nothing optional to accept or decline. If
// analytics/marketing cookies are ever added, this needs real opt-in choices.
export default function CookieNotice() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(OK_KEY)) return;
    } catch {
      // localStorage unavailable — show anyway
    }
    setVisible(true);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(OK_KEY, "1");
    } catch {
      // ignore
    }
  }

  if (!visible || pathname.startsWith("/admin")) return null;

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 pointer-events-none"
    >
      <div className="pointer-events-auto max-w-[560px] mx-auto bg-cream border-2 border-ink rounded-[18px] p-4 flex flex-col sm:flex-row sm:items-center gap-3 shadow-[4px_4px_0_#14110F]">
        <p className="text-[13px] leading-snug text-ink flex-1">
          <strong>🍪 Just the essentials.</strong> We only use the cookies that keep you logged in and your payments safe.
          No ads, no tracking, no following you around the internet.{" "}
          <Link href="/privacy#cookies" className="underline font-semibold whitespace-nowrap">How we use cookies</Link>
        </p>
        <button
          onClick={dismiss}
          className="h-10 px-5 rounded-pill text-sm font-bold flex-shrink-0"
          style={{ background: "#14110F", color: "#F7F0E8" }}
        >
          Sweet as
        </button>
      </div>
    </div>
  );
}
