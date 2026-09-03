"use client";

import { useState } from "react";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

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
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="inline-flex self-start items-center gap-[9px] bg-ink text-yellow rounded-pill px-[18px] py-2.5">
        <span className="w-2 h-2 rounded-pill bg-current" />
        <span className="text-[13px] font-bold">Thanks, you&rsquo;re in the mail club!</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      <div className="flex gap-2 lg:gap-[9px] flex-wrap">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="flex-1 min-w-[180px] h-12 lg:h-14 flex items-center bg-cream border-2 border-ink rounded-pill px-[22px] text-sm text-ink placeholder:text-ink/50 outline-none"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="h-12 lg:h-14 px-[30px] bg-ink text-cream border-2 border-ink rounded-pill text-[15px] font-bold whitespace-nowrap disabled:opacity-60"
        >
          {status === "loading" ? "…" : "Keep me posted"}
        </button>
      </div>
      {status === "error" && (
        <p className="text-xs font-semibold text-red">Something went wrong — try again, or email kimberley@stretchyyoga.co.nz.</p>
      )}
    </form>
  );
}
