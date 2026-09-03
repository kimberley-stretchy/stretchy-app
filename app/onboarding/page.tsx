"use client";

import { useState } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";
import { createClient } from "@/lib/supabase/client";

export default function OnboardingSignUpPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const next = "/onboarding/setup";

  async function signUpWithGoogle() {
    setLoading("google");
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) { setError(error.message); setLoading(null); }
  }

  async function signUpWithEmail(e: React.FormEvent) {
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
    <main className="min-h-screen flex flex-col" style={{ backgroundColor: "#716F39", color: "#14110F" }}>
      <div className="flex-shrink-0 px-6 pt-5 flex items-center justify-between">
        <Link href="/" aria-label="Back to Stretchy"><SMark size={32} /></Link>
        <Link href="/" aria-label="Close" className="w-11 h-11 flex items-center justify-center rounded-pill border-2 border-ink text-lg leading-none">×</Link>
      </div>

      <div className="flex-1 flex flex-col gap-4 px-6 pt-10 pb-6 max-w-lg mx-auto w-full">
        {sent ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <p className="text-3xl mb-4">📬</p>
            <p className="font-display text-[28px] leading-none mb-3">Check your inbox.</p>
            <p className="text-sm leading-relaxed">
              We sent a link to <strong>{email}</strong>. Tap it — you&rsquo;re in.
            </p>
          </div>
        ) : (
          <>
            <h1 className="font-display text-[34px] leading-none">Movement is better together.</h1>
            <p className="text-sm leading-[1.5]">Join the Stretchy community 👇</p>

            <button
              type="button"
              onClick={signUpWithGoogle}
              disabled={loading !== null}
              className="h-[50px] rounded-pill text-[15px] font-bold disabled:opacity-60"
              style={{ backgroundColor: "#14110F", color: "#F7F0E8", border: "2px solid #14110F" }}
            >
              {loading === "google" ? "Redirecting…" : "Continue with Google"}
            </button>

            {error && <p className="text-xs font-semibold" style={{ color: "#C6362E" }}>{error}</p>}

            <div className="flex items-center gap-3">
              <div className="flex-1 h-[1.5px]" style={{ backgroundColor: "rgba(20,17,15,.3)" }} />
              <span className="font-mono text-[10px] font-extrabold tracking-[0.12em]">OR</span>
              <div className="flex-1 h-[1.5px]" style={{ backgroundColor: "rgba(20,17,15,.3)" }} />
            </div>

            <form onSubmit={signUpWithEmail} className="flex flex-col gap-4">
              <div>
                <div className="font-mono text-[10px] font-extrabold tracking-[0.12em]">EMAIL</div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full h-[50px] mt-[7px] border-2 rounded-pill px-[18px] text-sm outline-none bg-transparent"
                  style={{ borderColor: "#14110F", color: "#14110F" }}
                />
              </div>
              <button
                type="submit"
                disabled={loading !== null}
                className="h-[50px] rounded-pill text-[15px] font-bold disabled:opacity-60"
                style={{ backgroundColor: "transparent", color: "#14110F", border: "2px solid #14110F" }}
              >
                {loading === "email" ? "Sending…" : "Sign up with email"}
              </button>
            </form>

            <div className="mt-auto flex flex-col gap-[9px] pt-3.5" style={{ borderTop: "1.5px solid rgba(20,17,15,.3)" }}>
              <div className="text-[13px] font-bold">
                Been here before?{" "}
                <Link href="/login" className="underline">Log in</Link>
              </div>
              <div className="text-[11px] leading-[1.45]">
                By joining you agree to our <Link href="/terms" className="underline">terms &amp; privacy</Link>. Two taps and you&rsquo;re in.
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
