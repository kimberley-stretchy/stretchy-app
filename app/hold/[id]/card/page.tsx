"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import SMark from "@/components/SMark";
import { createClient } from "@/lib/supabase/client";
import { NewTabLink, CANCELLATION_POLICY_HREF } from "@/components/PolicyLinks";

// "Update my card" — reached from the "We couldn't confirm your card" email.
// Shows a card form for exactly the most this person can pay for their places.
// Nothing is charged here; the final price is still charged 2 hours out.

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
const INK = "#14110F";

type Start =
  | { status: "needs_card"; clientSecret: string; paymentIntentId: string; quantity: number; maxTotal: number; sessionTitle: string; deadline: string }
  | { status: "all_good" | "no_hold" | "closed" };

function CardForm({ sessionId, start, accessToken, onDone }: { sessionId: string; start: Extract<Start, { status: "needs_card" }>; accessToken: string; onDone: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: { return_url: `${window.location.origin}/hold/${sessionId}` },
    });
    if (stripeError) {
      setError(stripeError.message ?? "That card didn’t go through. Please try again, or use a different card.");
      setBusy(false);
      return;
    }
    const res = await fetch("/api/holds/card", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ sessionId, paymentIntentId: start.paymentIntentId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Couldn’t save your card. Please try again.");
      setBusy(false);
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <PaymentElement options={{ layout: "tabs", terms: { card: "never" } }} />
      <p className="m-0 text-[13px] leading-normal" style={{ color: "rgba(20,17,15,.6)" }}>
        By saving your card, you agree Stretchy can charge it for this booking: the final price,
        2 hours before the session, and never more than ${start.maxTotal.toFixed(2)}
        {start.quantity > 1 ? ` for your ${start.quantity} places` : ""}.{" "}
        <NewTabLink href={CANCELLATION_POLICY_HREF}>Cancellation policy</NewTabLink>
      </p>
      {error && <p className="m-0 text-sm font-semibold" style={{ color: "#C6362E" }}>{error}</p>}
      <button type="submit" disabled={busy || !stripe} className="rounded-pill py-4 font-bold text-base disabled:opacity-60" style={{ background: INK, color: "#F7F0E8" }}>
        {busy ? "Confirming…" : "Confirm my card"}
      </button>
      <p className="m-0 text-center text-xs" style={{ color: "rgba(20,17,15,.5)" }}>
        We save your card. That&rsquo;s a hold, not a payment.
      </p>
    </form>
  );
}

export default function UpdateCardPage({ params }: { params: { id: string } }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [start, setStart] = useState<Start | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        window.location.href = `/login?next=${encodeURIComponent(`/hold/${params.id}/card`)}`;
        return;
      }
      setAccessToken(session.access_token);
      const res = await fetch("/api/holds/card", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ sessionId: params.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error ?? "Something went wrong. Please try again.");
      else setStart(data);
    });
  }, [params.id]);

  const shell = (children: React.ReactNode) => (
    <main className="min-h-screen bg-cream">
      <nav className="px-5 py-4 max-w-lg mx-auto"><Link href="/" className="text-ink"><SMark size={32} /></Link></nav>
      <section className="px-5 pb-12 max-w-lg mx-auto">{children}</section>
    </main>
  );
  const title = (t: string) => (
    <h1 className="font-display font-bold text-ink mb-3" style={{ fontSize: "36px", letterSpacing: "-0.03em", lineHeight: 1.05 }}>{t}</h1>
  );
  const back = (href: string, text: string) => (
    <Link href={href} className="inline-block font-semibold text-cream rounded-pill px-8 py-4 mt-4" style={{ backgroundColor: INK, fontSize: "15px" }}>{text}</Link>
  );

  if (done) return shell(<>
    {title("Card confirmed. 🎉")}
    <p className="text-sm text-muted leading-relaxed">Thanks, that&rsquo;s sorted and your place is confirmed. We&rsquo;ve emailed you all the details for the day.</p>
    {back(`/hold/${params.id}`, "Manage my booking")}
  </>);

  if (error) return shell(<>{title("Something went wrong.")}<p className="text-sm text-muted">{error}</p>{back(`/hold/${params.id}`, "Back to my booking")}</>);
  if (!start) return shell(<p className="font-mono text-xs text-muted">Loading…</p>);

  if (start.status === "all_good") return shell(<>
    {title("Your card’s all sorted.")}
    <p className="text-sm text-muted leading-relaxed">There&rsquo;s nothing you need to do. Your place is confirmed.</p>
    {back(`/hold/${params.id}`, "Manage my booking")}
  </>);
  if (start.status === "no_hold" || start.status === "closed") return shell(<>
    {title("This place isn’t held any more.")}
    <p className="text-sm text-muted leading-relaxed">If there&rsquo;s still room, you can join again up to 2 hours before it starts.</p>
    {back(`/sessions/${params.id}`, "See the session")}
  </>);

  const card = start as Extract<Start, { status: "needs_card" }>;
  return shell(<>
    {title("Update my card.")}
    <p className="text-sm text-ink leading-relaxed mb-5">
      <strong>{card.sessionTitle}</strong> is going ahead, but we couldn&rsquo;t confirm your card. Pop in a card by <strong>{card.deadline}</strong> to keep {card.quantity === 1 ? "your place" : `your ${card.quantity} places`}. Nothing is charged now.
    </p>
    <div className="bg-white rounded-card border-2 border-ink p-4">
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret: card.clientSecret,
          appearance: { theme: "stripe", variables: { colorPrimary: INK, colorBackground: "#FFFFFF", colorText: INK, fontFamily: "'Space Grotesk', system-ui, sans-serif", borderRadius: "12px" } },
        }}
      >
        <CardForm sessionId={params.id} start={card} accessToken={accessToken!} onDone={() => setDone(true)} />
      </Elements>
    </div>
  </>);
}
