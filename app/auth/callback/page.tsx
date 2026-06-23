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
    const supabase = createClient();
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/home";

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          console.error("Auth error:", error.message);
          setStatus("Sign-in failed — redirecting…");
          setTimeout(() => router.push("/login?error=auth_failed"), 1000);
        } else {
          setStatus("Signed in! Taking you there…");
          router.push(next);
        }
      });
    } else {
      // No code — check if already signed in via session cookie
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          router.push(next);
        } else {
          router.push("/login?error=auth_failed");
        }
      });
    }
  }, [router, searchParams]);

  return (
    <main style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#F5EDE3",
      fontFamily: "'Space Grotesk', system-ui, sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          border: "3px solid #1A1A1A", borderTopColor: "transparent",
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
