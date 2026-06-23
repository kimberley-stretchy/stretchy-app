"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const T = {
  black: "#1A1A1A",
  cream: "#F5EDE3",
  yellow: "#FFD166",
  red: "#E63946",
};

function CardForm({
  sessionId,
  attendeeId,
  paymentIntentId,
  priceNZD,
  accessToken,
  onClose,
}: {
  sessionId: string;
  attendeeId: string;
  paymentIntentId: string;
  priceNZD: number;
  accessToken: string;
  onClose: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? "Card error — please try again.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/holds", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ sessionId, paymentIntentId, attendeeId }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not save your hold. Please try again.");
      setLoading(false);
      return;
    }

    router.push(`/hold/${sessionId}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{
        background: "rgba(255,209,102,0.12)", borderRadius: 12, padding: "12px 16px",
        marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 13, color: "rgba(26,26,26,0.6)" }}>Max you&apos;ll pay</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, color: "#FFD166" }}>
          ${priceNZD} <span style={{ fontSize: 11, color: "rgba(26,26,26,0.4)" }}>+ GST</span>
        </span>
      </div>

      <PaymentElement options={{ layout: "tabs" }} />

      {error && (
        <p style={{ marginTop: 12, fontSize: 13, color: T.red, fontWeight: 600 }}>{error}</p>
      )}

      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
        <button type="submit" disabled={loading || !stripe} style={{
          width: "100%", padding: "18px", borderRadius: 999,
          background: loading ? "rgba(26,26,26,0.4)" : T.black,
          color: T.cream, border: "none", cursor: loading ? "not-allowed" : "pointer",
          fontFamily: "'Space Grotesk', system-ui, sans-serif", fontSize: 16, fontWeight: 700,
        }}>
          {loading ? "Saving your spot…" : "Hold my place — no charge yet"}
        </button>
        <button type="button" onClick={onClose} disabled={loading} style={{
          width: "100%", padding: "14px", borderRadius: 999,
          background: "transparent", color: "rgba(26,26,26,0.5)",
          border: "1.5px solid rgba(26,26,26,0.12)", cursor: "pointer",
          fontFamily: "'Space Grotesk', system-ui, sans-serif", fontSize: 14, fontWeight: 600,
        }}>
          Cancel
        </button>
      </div>

      <p style={{
        marginTop: 12, textAlign: "center",
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 700,
        color: "rgba(26,26,26,0.35)", letterSpacing: "0.1em",
      }}>
        AUTHORISED NOW · ONLY CHARGED IF SESSION GOES AHEAD AT 2H OUT
      </p>
    </form>
  );
}

export default function HoldModal({
  sessionId,
  sessionTitle,
  accessToken,
  onClose,
}: {
  sessionId: string;
  sessionTitle: string;
  accessToken: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"loading" | "card" | "error">("loading");
  const [clientSecret, setClientSecret] = useState("");
  const [paymentIntentId, setPaymentIntentId] = useState("");
  const [attendeeId, setAttendeeId] = useState("");
  const [priceNZD, setPriceNZD] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/holds", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ sessionId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setErrorMsg(data.error);
          setStep("error");
          return;
        }
        setClientSecret(data.clientSecret);
        setPaymentIntentId(data.paymentIntentId);
        setAttendeeId(data.attendeeId);
        setPriceNZD(data.priceNZD);
        setStep("card");
      })
      .catch(() => {
        setErrorMsg("Could not connect. Please try again.");
        setStep("error");
      });
  }, [sessionId, accessToken]);

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(26,26,26,0.5)",
        zIndex: 40, backdropFilter: "blur(4px)",
      }} />
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        background: T.cream, borderRadius: "24px 24px 0 0",
        padding: "24px 20px 40px", maxWidth: 480, margin: "0 auto",
      }}>
        <div style={{
          width: 40, height: 4, borderRadius: 2,
          background: "rgba(26,26,26,0.15)", margin: "0 auto 20px",
        }} />
        <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: T.black, marginBottom: 4 }}>
          Hold your spot
        </h2>
        <p style={{ fontSize: 13, color: "rgba(26,26,26,0.55)", marginBottom: 20 }}>{sessionTitle}</p>

        {step === "loading" && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              border: "2.5px solid #1A1A1A", borderTopColor: "transparent",
              animation: "spin 0.8s linear infinite", margin: "0 auto",
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {step === "error" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <p style={{ color: T.red, fontSize: 14, marginBottom: 16 }}>{errorMsg}</p>
            <button onClick={onClose} style={{
              padding: "12px 24px", borderRadius: 999, background: T.black,
              color: T.cream, border: "none", cursor: "pointer",
              fontFamily: "'Space Grotesk', system-ui, sans-serif", fontSize: 14, fontWeight: 600,
            }}>Close</button>
          </div>
        )}

        {step === "card" && clientSecret && (
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "stripe",
                variables: {
                  colorPrimary: T.black,
                  colorBackground: "#FFFFFF",
                  colorText: T.black,
                  fontFamily: "'Space Grotesk', system-ui, sans-serif",
                  borderRadius: "12px",
                },
              },
            }}
          >
            <CardForm
              sessionId={sessionId}
              attendeeId={attendeeId}
              paymentIntentId={paymentIntentId}
              priceNZD={priceNZD}
              accessToken={accessToken}
              onClose={onClose}
            />
          </Elements>
        )}
      </div>
    </>
  );
}
