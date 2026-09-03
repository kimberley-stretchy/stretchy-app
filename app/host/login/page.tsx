"use client";

import { useState } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";
import { createClient } from "@/lib/supabase/client";

export default function HostLoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const next = "/host/home";

  async function signInWithGoogle() {
    setLoading("google");
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) { setError(error.message); setLoading(null); }
  }

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading("email");
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setLoading(null);
    if (error) setError(error.message); else setSent(true);
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#14110F", color: "#F7F0E8" }}>
      <div className="max-w-lg mx-auto px-6 pt-5 pb-16 flex flex-col gap-4">
        <SMark size={32} />

        {sent ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
            <p className="text-3xl mb-4">📬</p>
            <p className="font-display text-[28px] leading-none mb-3">Check your inbox.</p>
            <p className="text-sm leading-relaxed">We sent a link to <strong>{email}</strong>. Tap it — you&rsquo;re in.</p>
          </div>
        ) : (
          <>
            <div className="font-mono text-[10px] font-extrabold tracking-[0.13em] mt-6" style={{ color: "rgba(247,240,232,.5)" }}>STRETCHY HQ</div>
            <h1 className="font-display text-[34px] leading-[.98]">Teacher &amp; GEM log in.</h1>
            <p className="text-sm leading-[1.5]" style={{ color: "rgba(247,240,232,.75)" }}>
              Run your room, check people in, and pick up sessions that need covering.
            </p>

            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={loading !== null}
              className="h-[50px] rounded-pill text-[15px] font-bold disabled:opacity-60"
              style={{ background: "#F7F0E8", color: "#14110F" }}
            >
              {loading === "google" ? "Redirecting…" : "Continue with Google"}
            </button>

            {error && <p className="text-xs font-semibold" style={{ color: "#FCBB16" }}>{error}</p>}

            <div className="flex items-center gap-3">
              <div className="flex-1 h-[1.5px]" style={{ background: "rgba(247,240,232,.28)" }} />
              <span className="font-mono text-[10px] font-extrabold tracking-[0.12em]">OR</span>
              <div className="flex-1 h-[1.5px]" style={{ background: "rgba(247,240,232,.28)" }} />
            </div>

            <form onSubmit={signInWithEmail} className="flex flex-col gap-4">
              <div>
                <div className="font-mono text-[10px] font-extrabold tracking-[0.12em]">EMAIL</div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full h-[50px] mt-[7px] border-2 rounded-pill px-[18px] text-sm outline-none bg-transparent"
                  style={{ borderColor: "#F7F0E8" }}
                />
              </div>
              <button
                type="submit"
                disabled={loading !== null}
                className="h-[50px] rounded-pill text-[15px] font-bold disabled:opacity-60"
                style={{ background: "transparent", color: "#F7F0E8", border: "2px solid #F7F0E8" }}
              >
                {loading === "email" ? "Sending…" : "Send me a link"}
              </button>
            </form>

            <div className="mt-4 pt-3.5 text-xs" style={{ borderTop: "1.5px solid rgba(247,240,232,.28)" }}>
              Moving, not teaching or hosting? <Link href="/login" className="underline">Log in here</Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
