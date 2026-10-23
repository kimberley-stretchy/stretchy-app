"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { requestPushPermission } from "@/lib/push";
import { NewTabLink, CANCELLATION_POLICY_HREF } from "@/components/PolicyLinks";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const contactInput: React.CSSProperties = {
  width: "100%", height: 46, borderRadius: 12, padding: "0 14px",
  border: "1.5px solid rgba(26,26,26,0.2)", background: "#FFFFFF", color: "#14110F",
  fontFamily: "'Space Grotesk', system-ui, sans-serif", fontSize: 15, outline: "none", boxSizing: "border-box",
};

const T = {
  black: "#14110F",
  cream: "#F7F0E8",
  yellow: "#FCBB16",
  red: "#C6362E",
};

function CardForm({
  sessionId,
  attendeeId,
  authUserId,
  paymentIntentId,
  mode,
  priceNZD,
  quantity,
  accessToken,
  late,
  askName,
  askPhone,
  onClose,
}: {
  sessionId: string;
  attendeeId: string;
  authUserId: string;
  /** The PaymentIntent (joining after 36 hrs out) or SetupIntent (before) id. */
  paymentIntentId: string;
  /** "setup" = just save the card (before 36 hrs out) · "payment" = hold the amount now. */
  mode: "setup" | "payment";
  priceNZD: number;
  quantity: number;
  accessToken: string;
  late: boolean;
  /** We don't have a real first name for this person yet — ask (required). */
  askName: boolean;
  /** We don't have a mobile for them — offer the field (optional). */
  askPhone: boolean;
  onClose: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    if (askName && !firstName.trim()) {
      setError("Pop in your first name so your teacher knows who’s coming.");
      return;
    }
    setLoading(true);
    setError(null);

    // Save their name / mobile first, so a typo is caught before the card step.
    if ((askName && firstName.trim()) || (askPhone && phone.trim())) {
      const contactRes = await fetch("/api/attendees/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
        body: JSON.stringify({ ...(askName ? { name: firstName } : {}), ...(askPhone && phone.trim() ? { phone } : {}) }),
      });
      if (!contactRes.ok) {
        const data = await contactRes.json().catch(() => ({}));
        setError(data.error ?? "Couldn’t save your details. Please try again.");
        setLoading(false);
        return;
      }
    }

    // Before 36 hrs out the card is only saved (nothing held on the bank);
    // after, the amount is held straight away.
    const confirmParams = { return_url: `${window.location.origin}/hold/${sessionId}` };
    const { error: stripeError } = mode === "setup"
      ? await stripe.confirmSetup({ elements, redirect: "if_required", confirmParams })
      : await stripe.confirmPayment({ elements, redirect: "if_required", confirmParams });
    const intentField = mode === "setup" ? "setupIntentId" : "paymentIntentId";

    if (stripeError) {
      console.error("Stripe confirmPayment error:", stripeError);
      const detail = [stripeError.type, stripeError.code].filter(Boolean).join("/");
      setError(`${stripeError.message ?? "Card error — please try again."}${detail ? ` (${detail})` : ""}`);
      setLoading(false);
      // Tell the person (by email) and HQ. Fire-and-forget: the server checks
      // the payment itself, and never sends more than one pair per half hour.
      fetch("/api/holds/failed", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${accessToken}` },
        body: JSON.stringify({ [intentField]: paymentIntentId }),
      }).catch(() => {});
      return;
    }

    const res = await fetch("/api/holds", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ sessionId, [intentField]: paymentIntentId, attendeeId, authUserId, quantity }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not save your hold. Please try again.");
      setLoading(false);
      return;
    }

    // Ask for push notifications after successful hold (non-blocking)
    requestPushPermission(accessToken).catch(console.error);

    router.push(`/hold/${sessionId}`);
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{
        background: "rgba(255,209,102,0.12)", borderRadius: 12, padding: "12px 16px",
        marginBottom: 20,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "rgba(26,26,26,0.6)" }}>
            {quantity > 1 ? `Max for your ${quantity} places` : "Max per person"}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 700, color: "#FCBB16" }}>
            ${(priceNZD * quantity).toFixed(2)} <span style={{ fontSize: 11, color: "rgba(26,26,26,0.4)" }}>incl. GST</span>
          </span>
        </div>
        {quantity > 1 && (
          <p style={{ fontSize: 11, color: "rgba(26,26,26,0.45)", marginTop: 4 }}>
            ${priceNZD.toFixed(2)} max per person. Drops as more people join.
          </p>
        )}
      </div>

      {(askName || askPhone) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {askName && (
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              autoComplete="given-name"
              aria-label="First name"
              style={contactInput}
            />
          )}
          {askPhone && (
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Mobile (optional)"
              type="tel"
              autoComplete="tel"
              aria-label="Mobile number, optional"
              style={contactInput}
            />
          )}
          <p style={{ fontSize: 12, color: "rgba(26,26,26,0.5)", lineHeight: 1.45, margin: 0 }}>
            {askName && askPhone
              ? "Your name is for your teacher and GEM. Your mobile is only used if we need to reach you on the day."
              : askName
              ? "For your teacher and GEM, so they know who’s coming."
              : "Only used if we need to reach you on the day."}
          </p>
        </div>
      )}

      {/* Stripe's own small print ("…charge your card for future payments in
          accordance with their terms") reads as open-ended. Ours says exactly
          what this card can be charged for. */}
      <PaymentElement options={{ layout: "tabs", terms: { card: "never" } }} />
      <p style={{ marginTop: 12, fontSize: 13, color: "rgba(26,26,26,0.6)", lineHeight: 1.5 }}>
        By saving your card, you agree Stretchy can charge it for this booking: the final price,
        2 hours before the session, and never more than ${(priceNZD * quantity).toFixed(2)}
        {quantity > 1 ? ` for your ${quantity} places` : ""}.
        {late ? "" : " Not enough people? You pay nothing."}{" "}
        <NewTabLink href={CANCELLATION_POLICY_HREF}>Cancellation policy</NewTabLink>
      </p>

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
          {loading ? "Holding your place…" : "Hold my place"}
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
        {late ? "ALREADY GOING AHEAD · NO FREE CANCELLING FROM HERE" : "FREE TO CANCEL UP TO 36 HOURS OUT"}
      </p>
      <p style={{ marginTop: 6, textAlign: "center", fontSize: 12, color: "rgba(26,26,26,0.5)", lineHeight: 1.45 }}>
        {mode === "setup"
          ? <>We save your card. Nothing is held or charged today.</>
          : <>We save your card. That&rsquo;s a hold, not a payment.</>}
      </p>
    </form>
  );
}

export default function HoldModal({
  sessionId,
  sessionTitle,
  accessToken,
  late = false,
  onClose,
}: {
  sessionId: string;
  sessionTitle: string;
  accessToken: string;
  /** Inside 36 hrs out: joining is still open but there's no free cancelling. */
  late?: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [step, setStep] = useState<"loading" | "card" | "error">("loading");
  const [clientSecret, setClientSecret] = useState("");
  const [paymentIntentId, setPaymentIntentId] = useState("");
  const [mode, setMode] = useState<"setup" | "payment">("payment");
  const [attendeeId, setAttendeeId] = useState("");
  const [authUserId, setAuthUserId] = useState("");
  const [priceNZD, setPriceNZD] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [askName, setAskName] = useState(false);
  const [askPhone, setAskPhone] = useState(false);

  useEffect(() => {
    fetch("/api/holds", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ sessionId, quantity }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          if (data.error === "Not logged in") {
            router.push(`/login?next=/sessions/${sessionId}`);
            return;
          }
          setErrorMsg(data.error);
          setStep("error");
          return;
        }
        setClientSecret(data.clientSecret);
        setPaymentIntentId(data.setupIntentId ?? data.paymentIntentId);
        setMode(data.mode === "setup" ? "setup" : "payment");
        setAttendeeId(data.attendeeId);
        setAuthUserId(data.authUserId);
        setPriceNZD(data.priceNZD);
        setAskName(!!data.profile?.needsName);
        setAskPhone(data.profile ? !data.profile.hasPhone : false);
        setStep("card");
      })
      .catch(() => {
        setErrorMsg("Could not connect. Please try again.");
        setStep("error");
      });
  }, [sessionId, accessToken, quantity]);

  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(26,26,26,0.5)",
        zIndex: 40, backdropFilter: "blur(4px)", cursor: "pointer",
      }} />
      <div className="hold-modal-sheet" style={{
        position: "fixed", zIndex: 50,
        background: T.cream, overflowY: "auto",
      }}>
        <div style={{
          width: 40, height: 4, borderRadius: 2,
          background: "rgba(26,26,26,0.15)", margin: "0 auto 20px",
        }} />
        <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: T.black, marginBottom: 4 }}>
          Hold your place
        </h2>
        <p style={{ fontSize: 13, color: "rgba(26,26,26,0.55)", marginBottom: 16 }}>{sessionTitle}</p>

        {/* Quantity selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.black }}>Places</span>
          <div style={{ display: "flex", alignItems: "center", gap: 0, background: "rgba(26,26,26,0.06)", borderRadius: 999, padding: "4px" }}>
            {[1, 2, 3, 4, 5, 6].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => { if (n !== quantity) { setQuantity(n); setStep("loading"); } }}
                style={{
                  width: 36, height: 36, borderRadius: 999, border: "none", cursor: "pointer",
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700,
                  background: quantity === n ? T.black : "transparent",
                  color: quantity === n ? T.cream : "rgba(26,26,26,0.5)",
                  transition: "all .15s",
                }}
              >
                {n}
              </button>
            ))}
          </div>
          {quantity > 1 && <span style={{ fontSize: 12, color: "rgba(26,26,26,0.5)" }}>for you and your crew</span>}
        </div>

        {step === "loading" && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              border: "2.5px solid #14110F", borderTopColor: "transparent",
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
            key={clientSecret}
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
              authUserId={authUserId}
              paymentIntentId={paymentIntentId}
              mode={mode}
              priceNZD={priceNZD}
              quantity={quantity}
              accessToken={accessToken}
              late={late}
              askName={askName}
              askPhone={askPhone}
              onClose={onClose}
            />
          </Elements>
        )}
      </div>
    </>
  );
}
