"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import SMark from "@/components/SMark";
import { createClient } from "@/lib/supabase/client";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const NEIGHBOURHOODS = ["Herne Bay", "Grey Lynn", "Pt Chev", "Westhaven", "Takapuna", "Mt Eden"];
const WHEN_SUITS = ["Weekend mornings", "Weekday evenings", "Lunchtimes"];
const CARE_DURATIONS = [
  { value: "until_changed", label: "Until I change it" },
  { value: "session_only", label: "Just this session" },
  { value: "end_date", label: "Set an end date" },
];

function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-pill px-[14px] py-[9px] text-xs font-semibold"
      style={
        selected
          ? { background: "#902F8A", color: "#F7F0E8" }
          : { background: "transparent", color: "rgba(20,17,15,.55)", border: "2px solid rgba(20,17,15,.15)" }
      }
    >
      {children}
    </button>
  );
}

function ToggleRow({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex justify-between items-center gap-2.5 py-3" style={{ borderBottom: "1.5px solid #E1D5C6" }}>
      <span className="text-[13px] font-semibold">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!on)}
        className="w-[42px] h-6 rounded-pill relative flex-shrink-0"
        style={{ background: on ? "#902F8A" : "rgba(20,17,15,.16)" }}
        role="switch"
        aria-checked={on}
      >
        <span className="absolute top-0.5 w-5 h-5 rounded-pill bg-cream transition-all" style={{ left: on ? "20px" : "2px" }} />
      </button>
    </div>
  );
}

function SetupForm({
  neighbourhoods, whenSuits, careNote, careDuration,
  showFirstName, notifyGoingAhead, notifyPriceLocked, notifyNewNearby,
  accessToken,
}: {
  neighbourhoods: string[]; whenSuits: string[]; careNote: string; careDuration: string;
  showFirstName: boolean; notifyGoingAhead: boolean; notifyPriceLocked: boolean; notifyNewNearby: boolean;
  accessToken: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSaving(true);
    setError(null);

    const { error: stripeError, setupIntent } = await stripe.confirmSetup({
      elements,
      redirect: "if_required",
      confirmParams: { return_url: `${window.location.origin}/sessions` },
    });

    if (stripeError) {
      setError(stripeError.message ?? "Card error — please try again.");
      setSaving(false);
      return;
    }

    const res = await fetch("/api/attendees/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        neighbourhoods,
        whenSuits,
        movingWithCareNote: careNote,
        movingWithCareDuration: careDuration,
        showFirstNameToRoom: showFirstName,
        notifyGoingAhead,
        notifyPriceLocked,
        notifyNewNearby,
        stripePaymentMethodId: typeof setupIntent?.payment_method === "string" ? setupIntent.payment_method : null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not save your details.");
      setSaving(false);
      return;
    }

    router.push("/sessions");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div style={{ background: "#FCBB16", border: "2px solid #14110F", borderRadius: 20, padding: "20px" }}>
        <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2.5" style={{ color: "rgba(20,17,15,.6)" }}>HOW YOU&rsquo;LL PAY</div>
        <p className="text-xs leading-[1.6] mb-2.5" style={{ color: "#14110F" }}>
          We&rsquo;ll save your card now. You won&rsquo;t be charged yet.
        </p>
        <p className="text-xs leading-[1.6] mb-2.5" style={{ color: "#14110F" }}>
          <strong>36 hours before your session</strong> — if enough people have joined, your spot is confirmed. The price at that point is the most you&rsquo;ll ever pay — it can still drop as more people book in.
        </p>
        <p className="text-xs leading-[1.6] mb-2.5" style={{ color: "#14110F" }}>
          <strong>2 hours before your session</strong> — we charge your card the final price. Often lower than you started at, never higher.
        </p>
        <p className="text-xs leading-[1.6] mb-2.5" style={{ color: "#14110F" }}>
          Free to cancel any time before the 36-hour mark. After that, your spot&rsquo;s confirmed and the price applies — that&rsquo;s what keeps this fair for everyone else coming. If we ever have to cancel your session after this point, you&rsquo;ll always get a full refund.
        </p>
        <p className="text-xs leading-[1.6]" style={{ color: "#14110F" }}>
          Something serious come up? Get in touch.
        </p>
      </div>

      <PaymentElement options={{ layout: "tabs" }} />

      {error && <p className="text-xs font-semibold" style={{ color: "#C6362E" }}>{error}</p>}

      <button
        type="submit"
        disabled={saving || !stripe}
        className="h-[50px] rounded-pill text-[15px] font-bold disabled:opacity-60"
        style={{ background: "#14110F", color: "#F7F0E8" }}
      >
        {saving ? "Saving…" : "See what's on"}
      </button>
    </form>
  );
}

export default function OnboardingSetupPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState("");

  const [neighbourhoods, setNeighbourhoods] = useState<string[]>([]);
  const [whenSuits, setWhenSuits] = useState<string[]>([]);
  const [careNote, setCareNote] = useState("");
  const [careDuration, setCareDuration] = useState("until_changed");
  const [showFirstName, setShowFirstName] = useState(true);
  const [notifyGoingAhead, setNotifyGoingAhead] = useState(true);
  const [notifyPriceLocked, setNotifyPriceLocked] = useState(true);
  const [notifyNewNearby, setNotifyNewNearby] = useState(false);

  const toggleIn = (arr: string[], v: string, set: (a: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) {
        router.push("/onboarding");
        return;
      }
      setAccessToken(session.access_token);
      fetch("/api/stripe/setup-intent", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
        .then((r) => r.json())
        .then((data) => setClientSecret(data.clientSecret ?? ""))
        .catch(() => {});
    });
    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#F7F0E8", color: "#14110F" }}>
      <div className="max-w-lg mx-auto px-6 pt-5 pb-16 flex flex-col gap-5">
        <div className="text-purple"><SMark size={32} /></div>

        <div className="font-mono text-[10px] font-extrabold tracking-[0.13em]" style={{ color: "rgba(20,17,15,.45)" }}>LET&rsquo;S GET YOU SET-UP</div>
        <h1 className="font-display text-[30px] leading-none -mt-3">Where do you move?</h1>

        <div>
          <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2" style={{ color: "rgba(20,17,15,.45)" }}>NEIGHBOURHOODS</div>
          <div className="flex flex-wrap gap-1.5">
            {NEIGHBOURHOODS.map((h) => (
              <Chip key={h} selected={neighbourhoods.includes(h)} onClick={() => toggleIn(neighbourhoods, h, setNeighbourhoods)}>{h}</Chip>
            ))}
          </div>
        </div>

        <div>
          <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2" style={{ color: "rgba(20,17,15,.45)" }}>WHEN SUITS</div>
          <div className="flex flex-wrap gap-1.5">
            {WHEN_SUITS.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => toggleIn(whenSuits, w, setWhenSuits)}
                className="rounded-pill px-[14px] py-[9px] text-xs font-semibold"
                style={
                  whenSuits.includes(w)
                    ? { background: "#14110F", color: "#F7F0E8" }
                    : { background: "transparent", color: "rgba(20,17,15,.55)", border: "2px solid rgba(20,17,15,.15)" }
                }
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-[18px]" style={{ borderTop: "2px solid #E1D5C6" }}>
          <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2" style={{ color: "#902F8A" }}>MOVING WITH CARE</div>
          <p className="text-xs leading-[1.5] mb-2.5" style={{ color: "rgba(20,17,15,.65)" }}>
            Anything your teacher should know — an injury, a pregnancy, recent surgery, anything you&rsquo;re working around. Only your teacher and the GEM on the day can see it, and you can change it any time.
          </p>
          <input
            value={careNote}
            onChange={(e) => setCareNote(e.target.value)}
            placeholder="e.g. left shoulder, going easy on binds"
            className="w-full h-[50px] border-2 border-ink rounded-pill px-[18px] text-xs bg-cream outline-none"
          />
          <div className="font-mono text-[9px] font-extrabold tracking-[0.11em] mt-3 mb-[7px]" style={{ color: "rgba(20,17,15,.45)" }}>HOW LONG SHOULD WE KEEP IT?</div>
          <div className="flex flex-wrap gap-1.5">
            {CARE_DURATIONS.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setCareDuration(d.value)}
                className="rounded-pill px-[13px] py-2 text-[11px] font-semibold"
                style={
                  careDuration === d.value
                    ? { background: "#902F8A", color: "#F7F0E8" }
                    : { background: "transparent", color: "rgba(20,17,15,.55)", border: "2px solid rgba(20,17,15,.15)" }
                }
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-[18px]" style={{ borderTop: "2px solid #E1D5C6" }}>
          <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2" style={{ color: "#902F8A" }}>TELL ME WHEN</div>
          <div className="flex flex-col">
            <ToggleRow label="A Stretchy goes ahead" on={notifyGoingAhead} onChange={setNotifyGoingAhead} />
            <ToggleRow label="My price is locked" on={notifyPriceLocked} onChange={setNotifyPriceLocked} />
            <div className="flex justify-between items-center gap-2.5 py-3" style={{ borderBottom: "1.5px solid #E1D5C6" }}>
              <span className="text-[13px] font-semibold">When a Stretchy doesn&rsquo;t meet the minimum</span>
              <span
                aria-label="Always on"
                title="Always on — this one you can't turn off"
                className="w-[42px] h-6 rounded-pill relative flex-shrink-0"
                style={{ background: "#902F8A" }}
              >
                <span className="absolute top-0.5 w-5 h-5 rounded-pill bg-cream" style={{ left: "20px" }} />
              </span>
            </div>
            <div className="py-3 flex justify-between items-center gap-2.5">
              <span className="text-[13px] font-semibold">New Stretchy near me</span>
              <button
                type="button"
                onClick={() => setNotifyNewNearby(!notifyNewNearby)}
                className="w-[42px] h-6 rounded-pill relative flex-shrink-0"
                style={{ background: notifyNewNearby ? "#902F8A" : "rgba(20,17,15,.16)" }}
              >
                <span className="absolute top-0.5 w-5 h-5 rounded-pill bg-cream transition-all" style={{ left: notifyNewNearby ? "20px" : "2px" }} />
              </button>
            </div>
          </div>
        </div>

        <div className="pt-[18px]" style={{ borderTop: "2px solid #E1D5C6" }}>
          <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2" style={{ color: "#902F8A" }}>YOUR DATA</div>
          <p className="text-xs leading-[1.5] mb-2.5" style={{ color: "rgba(20,17,15,.65)" }}>
            Your name shows to your GEM, your teacher and Stretchy HQ so they can welcome you properly and move you safely. Nothing else is shared with the room, and nothing is ever sold on.
          </p>
          <div className="flex justify-between items-center gap-2.5 border-2 border-ink rounded-pill py-3 px-[18px]">
            <span className="text-xs leading-[1.4]">Show my first name to the room</span>
            <button
              type="button"
              onClick={() => setShowFirstName(!showFirstName)}
              className="w-[42px] h-6 rounded-pill relative flex-shrink-0"
              style={{ background: showFirstName ? "#902F8A" : "rgba(20,17,15,.16)" }}
            >
              <span className="absolute top-0.5 w-5 h-5 rounded-pill bg-cream transition-all" style={{ left: showFirstName ? "20px" : "2px" }} />
            </button>
          </div>
        </div>

        {clientSecret && accessToken ? (
          <Elements
            stripe={stripePromise}
            options={{ clientSecret, appearance: { theme: "stripe", variables: { colorPrimary: "#14110F", fontFamily: "'Space Grotesk', system-ui, sans-serif", borderRadius: "12px" } } }}
          >
            <SetupForm
              neighbourhoods={neighbourhoods}
              whenSuits={whenSuits}
              careNote={careNote}
              careDuration={careDuration}
              showFirstName={showFirstName}
              notifyGoingAhead={notifyGoingAhead}
              notifyPriceLocked={notifyPriceLocked}
              notifyNewNearby={notifyNewNearby}
              accessToken={accessToken}
            />
          </Elements>
        ) : (
          <div className="text-center py-8 text-sm" style={{ color: "rgba(20,17,15,.5)" }}>Loading payment setup…</div>
        )}
      </div>
    </main>
  );
}
