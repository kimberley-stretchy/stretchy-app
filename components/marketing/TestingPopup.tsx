"use client";

import { useState, useEffect } from "react";
import SMark from "@/components/SMark";

const DISMISSED_KEY = "stretchy-testing-popup-dismissed";

export default function TestingPopup() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISSED_KEY)) return;
    } catch {
      // localStorage unavailable — show anyway
    }
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // ignore
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
      try {
        localStorage.setItem(DISMISSED_KEY, "1");
      } catch {
        // ignore
      }
    } catch {
      setStatus("error");
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end lg:items-center justify-center p-4 lg:p-6" style={{ background: "rgba(20,17,15,0.55)" }}>
      <div className="w-full max-w-[420px] bg-cream border-2 border-ink rounded-[22px] p-6 lg:p-7 relative">
        <button
          aria-label="Close"
          onClick={dismiss}
          className="absolute top-4 right-4 w-9 h-9 rounded-pill border-2 border-ink flex items-center justify-center text-lg leading-none text-ink"
        >
          ×
        </button>

        <div className="text-purple mb-4"><SMark size={32} /></div>

        {status === "done" ? (
          <>
            <h2 className="font-display text-[26px] leading-none mb-2">You&rsquo;re on the list.</h2>
            <p className="text-sm text-ink/70 leading-relaxed">We&rsquo;ll be in touch as things come together. Thanks for being early.</p>
          </>
        ) : (
          <>
            <h2 className="font-display text-[26px] leading-none mb-2">Something new is stretching into shape.</h2>
            <p className="text-sm text-ink/70 leading-relaxed mb-5">
              We&rsquo;re in testing for a new Stretchy model. More to come soon — enter your email below for (near) future updates.
            </p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="w-full h-12 flex items-center bg-white border-2 border-ink rounded-pill px-[20px] text-sm text-ink placeholder:text-ink/50 outline-none"
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="h-12 rounded-pill text-[15px] font-bold disabled:opacity-60"
                style={{ background: "#14110F", color: "#F7F0E8" }}
              >
                {status === "loading" ? "…" : "Keep me posted"}
              </button>
              {status === "error" && (
                <p className="text-xs font-semibold" style={{ color: "#C6362E" }}>Something went wrong — try again.</p>
              )}
            </form>
            <button onClick={dismiss} className="w-full text-center text-xs font-semibold text-ink/50 underline mt-4">
              Maybe later
            </button>
          </>
        )}
      </div>
    </div>
  );
}
