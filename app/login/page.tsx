"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import SMark from "@/components/SMark";
import { createClient } from "@/lib/supabase/client";

type WaitlistRole = "mover" | "host" | "both";

function LoginContent() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/sessions";

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const errorParam = searchParams.get("error");
  const [authError, setAuthError] = useState<string | null>(errorParam ? decodeURIComponent(errorParam) : null);
  const [loading, setLoading] = useState<"google" | "email" | null>(null);
  const [keepLoggedIn, setKeepLoggedIn] = useState(true);

  const supabase = createClient();

  async function signInWithGoogle() {
    setLoading("google");
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) { setAuthError(error.message); setLoading(null); }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading("email");
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setLoading(null);
    if (error) { setAuthError(error.message); } else { setSent(true); }
  }

  // ── International waitlist (kept from the previous build — not part of this design pass) ──
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [wlName, setWlName] = useState("");
  const [wlEmail, setWlEmail] = useState("");
  const [wlCity, setWlCity] = useState("");
  const [wlCountry, setWlCountry] = useState("");
  const [wlRole, setWlRole] = useState<WaitlistRole>("mover");
  const [wlSent, setWlSent] = useState(false);
  const [wlSending, setWlSending] = useState(false);

  async function submitWaitlist() {
    if (!(wlName.trim() && wlEmail.trim() && wlCity.trim())) return;
    setWlSending(true);
    try {
      await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: wlName, email: wlEmail, city: wlCity, country: wlCountry, role: wlRole }),
      });
      setWlSent(true);
    } finally {
      setWlSending(false);
    }
  }

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#FCBB16", color: "#14110F" }}>
      <div className="max-w-lg mx-auto px-6 pt-5 pb-16 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Back to Stretchy"><SMark size={32} /></Link>
          <Link href="/" aria-label="Close" className="w-11 h-11 flex items-center justify-center rounded-pill border-2 border-ink text-lg leading-none">×</Link>
        </div>

        {sent ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
            <p className="text-3xl mb-4">📬</p>
            <p className="font-display text-[28px] leading-none mb-3">Check your inbox.</p>
            <p className="text-sm leading-relaxed">
              We sent a link to <strong>{email}</strong>. Tap it — you&rsquo;re in.
            </p>
            <button onClick={() => setSent(false)} className="mt-6 text-sm underline">Use a different email</button>
          </div>
        ) : (
          <>
            <h1 className="font-display text-[34px] leading-[.98] mt-6">Welcome back.</h1>
            <p className="text-sm leading-[1.5]">Log in once and stay in — we&rsquo;ll keep you signed in on this phone.</p>

            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={loading !== null}
              className="h-[50px] rounded-pill text-[15px] font-bold disabled:opacity-60"
              style={{ background: "#14110F", color: "#F7F0E8" }}
            >
              {loading === "google" ? "Redirecting…" : "Continue with Google"}
            </button>

            {authError && <p className="text-xs font-semibold" style={{ color: "#C6362E" }}>{authError}</p>}

            <div className="flex items-center gap-3">
              <div className="flex-1 h-[1.5px]" style={{ background: "rgba(20,17,15,.28)" }} />
              <span className="font-mono text-[10px] font-extrabold tracking-[0.12em]">OR</span>
              <div className="flex-1 h-[1.5px]" style={{ background: "rgba(20,17,15,.28)" }} />
            </div>

            <form onSubmit={handleMagicLink} className="flex flex-col gap-4">
              <div>
                <div className="font-mono text-[10px] font-extrabold tracking-[0.12em]">EMAIL</div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full h-[50px] mt-[7px] border-2 border-ink rounded-pill px-[18px] text-sm outline-none bg-transparent"
                />
                <p className="text-xs leading-[1.45] mt-2.5">We&rsquo;ll send a link — no password to remember.</p>
              </div>

              <label className="flex items-center gap-[11px] border-2 border-ink rounded-pill py-3 px-[18px] cursor-pointer">
                <span className="w-[42px] h-6 rounded-pill relative flex-shrink-0" style={{ background: "#14110F" }}>
                  <span className="absolute top-0.5 w-5 h-5 rounded-pill transition-all" style={{ left: keepLoggedIn ? "20px" : "2px", background: "#FCBB16" }} />
                </span>
                <input type="checkbox" checked={keepLoggedIn} onChange={(e) => setKeepLoggedIn(e.target.checked)} className="sr-only" />
                <span className="text-xs leading-[1.4]">Keep me logged in on this phone</span>
              </label>

              <button
                type="submit"
                disabled={loading !== null}
                className="h-[50px] rounded-pill text-[15px] font-bold disabled:opacity-60"
                style={{ background: "#14110F", color: "#F7F0E8" }}
              >
                {loading === "email" ? "Sending…" : "Send me a link"}
              </button>
            </form>

            <div className="mt-4 pt-3.5 flex flex-col gap-[9px]" style={{ borderTop: "1.5px solid rgba(20,17,15,.28)" }}>
              <div className="text-[13px] font-bold">
                New here? <Link href="/onboarding" className="underline">Make an account</Link>
              </div>
              <div className="text-xs">
                Teacher, GEM or HQ? <Link href="/host/login" className="underline">Log in here</Link>
              </div>
            </div>
          </>
        )}

        {/* International waitlist */}
        {!sent && (
          <div className="mt-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px" style={{ background: "rgba(20,17,15,.28)" }} />
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em]">Not in NZ?</span>
              <div className="flex-1 h-px" style={{ background: "rgba(20,17,15,.28)" }} />
            </div>

            {!showWaitlist && !wlSent && (
              <button
                onClick={() => setShowWaitlist(true)}
                className="w-full flex items-center justify-between px-6 font-semibold rounded-pill"
                style={{ backgroundColor: "#F7F0E8", color: "#14110F", height: 56, fontSize: 15, border: "2px solid #14110F" }}
              >
                <span>Get early access from anywhere 🌏</span>
                <span>→</span>
              </button>
            )}

            {showWaitlist && !wlSent && (
              <div className="rounded-card p-5 space-y-3" style={{ backgroundColor: "#F7F0E8", border: "2px solid #14110F" }}>
                <input value={wlName} onChange={(e) => setWlName(e.target.value)} placeholder="Your name" className="w-full px-4 py-3.5 rounded-pill border-2 border-ink bg-white text-ink outline-none text-sm" />
                <input value={wlEmail} onChange={(e) => setWlEmail(e.target.value)} placeholder="your@email.com" className="w-full px-4 py-3.5 rounded-pill border-2 border-ink bg-white text-ink outline-none text-sm" />
                <div className="flex flex-col sm:flex-row gap-2">
                  <input value={wlCity} onChange={(e) => setWlCity(e.target.value)} placeholder="City" className="w-full sm:flex-1 sm:min-w-0 px-4 py-3.5 rounded-pill border-2 border-ink bg-white text-ink outline-none text-sm" />
                  <input value={wlCountry} onChange={(e) => setWlCountry(e.target.value)} placeholder="Country" className="w-full sm:flex-1 sm:min-w-0 px-4 py-3.5 rounded-pill border-2 border-ink bg-white text-ink outline-none text-sm" />
                </div>
                <div className="flex gap-2">
                  {(["mover", "host", "both"] as WaitlistRole[]).map((r) => (
                    <button key={r} onClick={() => setWlRole(r)} className="flex-1 font-mono text-xs font-bold py-2.5 rounded-pill" style={wlRole === r ? { background: "#14110F", color: "#F7F0E8" } : { background: "#fff", color: "#14110F", border: "1.5px solid #E1D5C6" }}>
                      {r[0].toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
                <button onClick={submitWaitlist} disabled={wlSending} className="w-full font-semibold rounded-pill disabled:opacity-60" style={{ background: "#14110F", color: "#F7F0E8", height: 52, fontSize: 15 }}>
                  {wlSending ? "Sending…" : "Put me on the map →"}
                </button>
                <button onClick={() => setShowWaitlist(false)} className="w-full text-xs text-center">Cancel</button>
              </div>
            )}

            {wlSent && (
              <div className="rounded-card p-6 text-center" style={{ backgroundColor: "#F7F0E8", border: "2px solid #14110F" }}>
                <p className="text-3xl mb-3">🌏</p>
                <p className="font-display text-[22px] mb-2">You&rsquo;re on the map.</p>
                <p className="text-sm leading-relaxed">{wlCity} is noted. When Stretchy heads your way, you&rsquo;ll be first to know.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: "#FCBB16" }} />}>
      <LoginContent />
    </Suspense>
  );
}
