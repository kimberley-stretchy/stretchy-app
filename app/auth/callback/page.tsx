"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Suspense } from "react";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Signing you in…");

  useEffect(() => {
    const next = searchParams.get("next") ?? "/sessions";
    const supabase = createClient();

    // Listen for the auth state to change — Supabase detects the
    // code in the URL automatically via detectSessionInUrl
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session) {
          setStatus("Signed in! Taking you there…");
          // A hard navigation, not router.push — middleware reads cookies
          // fresh on every request, and a client-side push can fire before
          // the just-set auth cookies finish propagating, bouncing admin/
          // host routes back to /login in a race that a full reload avoids.
          window.location.href = next;
        }
      }
    );

    // Also check if we already have a session (covers edge cases)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setStatus("Signed in! Taking you there…");
        window.location.href = next;
      }
    });

    // Timeout fallback — if nothing happened after 8 seconds, something went wrong
    const timeout = setTimeout(() => {
      setStatus("Something went wrong. Try again.");
      setTimeout(() => router.push("/login?error=auth_failed"), 1500);
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [router, searchParams]);

  return (
    <main style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#F7F0E8",
      fontFamily: "'Space Grotesk', system-ui, sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          border: "3px solid #14110F", borderTopColor: "transparent",
          animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
        }} />
        <p style={{ fontSize: 15, color: "rgba(26,26,26,0.6)" }}>{status}</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  );
}
