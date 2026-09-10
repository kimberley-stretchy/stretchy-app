"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SMark from "@/components/SMark";

function AccessForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "That code doesn't look right.");
        setLoading(false);
        return;
      }
      // Hard navigation so middleware re-checks with the freshly-set cookie.
      window.location.href = next;
    } catch {
      setError("Something went wrong — try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="w-full max-w-[380px] bg-white border-2 border-ink rounded-card p-8 text-center">
        <div className="flex justify-center mb-4 text-ink">
          <SMark size={40} />
        </div>
        <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-muted mb-1">Stretchy</p>
        <h1 className="font-display font-bold text-ink mb-2" style={{ fontSize: 28, letterSpacing: "-0.02em" }}>
          A private preview.
        </h1>
        <p className="text-sm text-muted mb-6">Enter your access code to continue.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Access code"
            autoFocus
            className="h-12 border-2 border-ink rounded-pill px-5 text-center text-sm outline-none bg-cream text-ink"
          />
          {error && (
            <p className="text-xs font-semibold" style={{ color: "#C6362E" }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !code.trim()}
            className="h-12 rounded-pill font-bold text-sm disabled:opacity-60 transition-all"
            style={{ background: "#14110F", color: "#F7F0E8" }}
          >
            {loading ? "Checking…" : "Enter"}
          </button>
        </form>

        <p className="text-xs text-muted mt-6">
          Stuck? Email{" "}
          <a href="mailto:kimberley@stretchyyoga.co.nz" className="underline text-ink font-semibold">
            kimberley@stretchyyoga.co.nz
          </a>
        </p>
      </div>
    </main>
  );
}

export default function AccessPage() {
  return (
    <Suspense>
      <AccessForm />
    </Suspense>
  );
}
