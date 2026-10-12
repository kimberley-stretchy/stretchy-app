"use client";

import { useState } from "react";

// Shown on a board card once someone has said "me too": an optional email so
// HQ can tell them if that suggestion becomes a session.
export default function MeTooContact({ suggestionId, olive }: { suggestionId: string; olive: boolean }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const line = olive ? "#F7F0E8" : "#14110F";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || status === "saving") return;
    setStatus("saving");
    setMessage(null);
    try {
      const res = await fetch("/api/suggestions/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: suggestionId, email: email.trim() }),
      });
      if (res.ok) {
        setStatus("done");
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage(data.error ?? "Something went wrong — try again.");
        setStatus("error");
      }
    } catch {
      setMessage("Something went wrong — try again.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return <p className="text-xs font-bold m-0">🙌 Got it — we&rsquo;ll email you if this one happens.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <p className="text-xs font-bold m-0">Want to hear if it happens?</p>
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          autoComplete="email"
          aria-label="Your email"
          className="flex-1 min-w-0 h-11 border-2 rounded-pill px-[15px] text-xs bg-cream text-ink placeholder:text-ink/50 outline-none"
          style={{ borderColor: "#14110F" }}
        />
        <button
          type="submit"
          disabled={status === "saving"}
          className="h-11 px-4 rounded-pill text-[13px] font-bold whitespace-nowrap disabled:opacity-60"
          style={{ background: line, color: olive ? "#14110F" : "#F7F0E8", border: `2px solid ${line}` }}
        >
          {status === "saving" ? "…" : "Tell me"}
        </button>
      </div>
      {message && <p className="text-[11px] font-semibold m-0">{message}</p>}
      <p className="text-[11px] leading-[1.4] m-0 opacity-80">Only about this one. Never shown on the board.</p>
    </form>
  );
}
