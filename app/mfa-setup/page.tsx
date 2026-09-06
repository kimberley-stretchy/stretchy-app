"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SMark from "@/components/SMark";
import { createClient } from "@/lib/supabase/client";

type Mode = "loading" | "enroll" | "verify" | "error";

function MfaSetupInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/host/home";

  const [mode, setMode] = useState<Mode>("loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace(`/login?next=${encodeURIComponent(`/mfa-setup?next=${next}`)}`);
        return;
      }

      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === "aal2") {
        router.replace(next);
        return;
      }

      const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) {
        setError(listError.message);
        setMode("error");
        return;
      }

      const verifiedTotp = factors?.totp[0];

      if (verifiedTotp) {
        // Factor exists — this session just needs a fresh challenge verified.
        const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: verifiedTotp.id });
        if (challengeError) {
          setError(challengeError.message);
          setMode("error");
          return;
        }
        setFactorId(verifiedTotp.id);
        setChallengeId(challenge.id);
        setMode("verify");
        return;
      }

      // Clear out any abandoned unverified factor (its QR/secret can't be
      // retrieved again) before enrolling fresh. Unverified factors don't
      // appear in `factors.totp` (typed verified-only) — only in `factors.all`.
      const unverified = factors?.all.find((f) => f.factor_type === "totp" && f.status === "unverified");
      if (unverified) {
        await supabase.auth.mfa.unenroll({ factorId: unverified.id });
      }

      const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (enrollError) {
        setError(enrollError.message);
        setMode("error");
        return;
      }
      setFactorId(enrolled.id);
      setQrCode(enrolled.totp.qr_code);
      setSecret(enrolled.totp.secret);
      setMode("enroll");
    })();
  }, [router, next]);

  async function handleVerify() {
    if (!factorId || code.length < 6) return;
    setSubmitting(true);
    setError(null);
    const supabase = createClient();

    try {
      let currentChallengeId = challengeId;
      if (!currentChallengeId) {
        const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
        if (challengeError) throw challengeError;
        currentChallengeId = challenge.id;
      }

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: currentChallengeId,
        code: code.trim(),
      });
      if (verifyError) throw verifyError;

      router.push(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Incorrect code — try again.");
      setChallengeId(null); // force a fresh challenge on retry
      setCode("");
    } finally {
      setSubmitting(false);
    }
  }

  if (mode === "loading") {
    return <main className="min-h-screen bg-cream" />;
  }

  if (mode === "error") {
    return (
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
        <SMark size={48} className="text-ink mb-4" />
        <p className="text-sm text-muted mb-2">Something went wrong setting up two-factor authentication.</p>
        <p className="text-xs text-muted">{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream pb-20">
      <nav className="flex items-center justify-center px-4 py-4 max-w-lg mx-auto">
        <SMark size={28} className="text-ink" />
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-5">
        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.20em] text-muted mb-2">
            Required for hosts &amp; HQ
          </p>
          <h1 className="font-display font-bold text-ink" style={{ fontSize: "36px", letterSpacing: "-0.03em", lineHeight: "1.05" }}>
            {mode === "enroll" ? "Set up two-factor login" : "Verify it's you"}
          </h1>
          <p className="text-sm text-muted mt-2">
            {mode === "enroll"
              ? "Teachers, GEMs, and HQ see attendee care notes, so every login needs a second step. Scan this with an authenticator app (like Google Authenticator or Authy)."
              : "Enter the current code from your authenticator app to finish signing in."}
          </p>
        </div>

        {mode === "enroll" && qrCode && (
          <div className="bg-white rounded-card border-2 border-ink p-5 flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrCode} alt="Scan with your authenticator app" width={200} height={200} />
            {secret && (
              <p className="text-xs text-muted text-center">
                Can&apos;t scan? Enter this key manually:<br />
                <span className="font-mono font-bold text-ink break-all">{secret}</span>
              </p>
            )}
          </div>
        )}

        <div className="bg-white rounded-card border-2 border-ink p-5">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-muted mb-3">6-digit code</p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoFocus
            placeholder="000000"
            className="w-full text-2xl font-mono font-bold text-ink text-center tracking-[0.3em] outline-none py-2"
            style={{ borderBottom: "2px solid #14110F" }}
          />
          {error && <p className="text-xs mt-2" style={{ color: "#902F8A" }}>{error}</p>}
        </div>

        <button
          onClick={handleVerify}
          disabled={submitting || code.length < 6}
          className="w-full font-semibold rounded-pill py-4 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
          style={{ backgroundColor: "#14110F", color: "#F7F0E8", fontSize: "16px" }}
        >
          {submitting ? "Verifying…" : "Verify and continue →"}
        </button>
      </div>
    </main>
  );
}

export default function MfaSetupPage() {
  return (
    <Suspense>
      <MfaSetupInner />
    </Suspense>
  );
}
