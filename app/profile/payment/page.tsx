"use client";

import { useState } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";

type CardBrand = "visa" | "mastercard" | "amex";

const BRAND_LABEL: Record<CardBrand, string> = {
  visa: "VISA",
  mastercard: "MC",
  amex: "AMEX",
};

const BRAND_COLOR: Record<CardBrand, string> = {
  visa: "#1A1A2E",
  mastercard: "#E63946",
  amex: "#2C8FE0",
};

const SAVED_CARDS = [
  { id: "c1", brand: "visa" as CardBrand,       last4: "4242", expiry: "08/27", name: "Marlee Fisher",   isDefault: true  },
  { id: "c2", brand: "mastercard" as CardBrand, last4: "8888", expiry: "03/26", name: "Marlee Fisher",   isDefault: false },
];

const RECENT = [
  { id: "t1", label: "Sunday Slow Flow · Grey Lynn", date: "25 May 2026", amount: "-$18.00" },
  { id: "t2", label: "Rise & Run · Ponsonby",        date: "18 May 2026", amount: "-$16.00" },
  { id: "t3", label: "Morning Breathwork",            date: "11 May 2026", amount: "-$14.00" },
];

export default function PaymentPage() {
  const [adding, setAdding] = useState(false);
  const [defaultCard, setDefaultCard] = useState("c1");

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry]         = useState("");
  const [cvc, setCvc]               = useState("");
  const [name, setName]             = useState("");

  function formatCard(val: string) {
    return val.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  }
  function formatExpiry(val: string) {
    const digits = val.replace(/\D/g, "").slice(0, 4);
    if (digits.length >= 3) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  }

  return (
    <main className="min-h-screen bg-cream pb-28">
      {/* NAV */}
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Link href="/home" className="text-ink"><SMark size={28} /></Link>
          <Link href="/profile" className="text-muted hover:text-ink text-lg">←</Link>
        </div>
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-muted">
          Payment
        </span>
        <div className="w-10" />
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-6">

        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.20em] text-muted mb-2">
            Secure · Powered by Stripe
          </p>
          <h1
            className="font-display font-bold text-ink"
            style={{ fontSize: "clamp(40px,11vw,54px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}
          >
            Your<br />cards.
          </h1>
        </div>

        {/* Saved cards */}
        <div>
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-2">Saved cards</h2>
          <div className="space-y-2">
            {SAVED_CARDS.map((card) => (
              <div
                key={card.id}
                className="bg-white rounded-card shadow-card p-4 flex items-center gap-3"
                style={defaultCard === card.id ? { border: "1.5px solid #2C8FE0" } : undefined}
              >
                {/* Brand chip */}
                <span
                  className="font-mono text-[10px] font-black text-white px-2 py-1 rounded flex-shrink-0"
                  style={{ backgroundColor: BRAND_COLOR[card.brand] }}
                >
                  {BRAND_LABEL[card.brand]}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ink text-sm">•••• {card.last4}</p>
                  <p className="font-mono text-xs text-muted">{card.name} · exp {card.expiry}</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {defaultCard === card.id ? (
                    <span
                      className="font-mono text-[10px] font-bold px-2 py-1 rounded-pill"
                      style={{ backgroundColor: "#EFF6FF", color: "#2C8FE0" }}
                    >
                      DEFAULT
                    </span>
                  ) : (
                    <button
                      onClick={() => setDefaultCard(card.id)}
                      className="font-mono text-[10px] font-bold text-muted hover:text-ink transition-colors"
                    >
                      Set default
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Add card */}
        {!adding ? (
          <button
            onClick={() => setAdding(true)}
            className="w-full flex items-center justify-between px-5 font-semibold text-ink rounded-pill border-2 transition-all hover:bg-sand-dark active:scale-[0.98]"
            style={{ borderColor: "#E0D9D0", height: "54px", fontSize: "15px", backgroundColor: "white" }}
          >
            <span>+ Add a card</span>
            <span className="text-muted">›</span>
          </button>
        ) : (
          <div className="bg-white rounded-card shadow-card p-4 space-y-3">
            <h2 className="font-bold text-ink text-sm">New card</h2>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-widest text-muted pl-1">Card number</label>
              <input
                type="text"
                inputMode="numeric"
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCard(e.target.value))}
                placeholder="0000 0000 0000 0000"
                className="w-full px-4 py-3.5 rounded-pill border-2 border-border bg-white text-ink placeholder-muted focus:outline-none focus:border-hot-blue transition-colors text-base"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs font-bold uppercase tracking-widest text-muted pl-1">Expiry</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={expiry}
                  onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                  placeholder="MM/YY"
                  className="w-full px-4 py-3.5 rounded-pill border-2 border-border bg-white text-ink placeholder-muted focus:outline-none focus:border-hot-blue transition-colors text-base"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs font-bold uppercase tracking-widest text-muted pl-1">CVC</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="•••"
                  className="w-full px-4 py-3.5 rounded-pill border-2 border-border bg-white text-ink placeholder-muted focus:outline-none focus:border-hot-blue transition-colors text-base"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-widest text-muted pl-1">Name on card</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="w-full px-4 py-3.5 rounded-pill border-2 border-border bg-white text-ink placeholder-muted focus:outline-none focus:border-hot-blue transition-colors text-base"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setAdding(false)}
                className="flex-1 font-mono text-xs font-bold text-ink rounded-pill border border-border hover:bg-sand-dark transition-all"
                style={{ height: "48px" }}
              >
                Cancel
              </button>
              <button
                onClick={() => setAdding(false)}
                className="flex-1 font-mono text-xs font-bold text-white rounded-pill transition-all hover:brightness-110 active:scale-[0.98]"
                style={{ backgroundColor: "#1A1A1A", height: "48px" }}
              >
                Save card
              </button>
            </div>

            <p className="text-center text-xs text-muted">
              🔒 Secured by Stripe. Stretchy never stores your card details.
            </p>
          </div>
        )}

        {/* Recent transactions */}
        <div>
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-2">Recent</h2>
          <div className="bg-white rounded-card shadow-card divide-y divide-border">
            {RECENT.map((t) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3.5">
                <div>
                  <p className="font-semibold text-ink text-sm">{t.label}</p>
                  <p className="font-mono text-xs text-muted">{t.date}</p>
                </div>
                <p className="font-mono text-sm font-bold text-ink">{t.amount}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
