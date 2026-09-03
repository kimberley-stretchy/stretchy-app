"use client";

import { useState } from "react";
import FormShell from "@/components/forms/FormShell";
import { Label, PillInput, PillTextarea, ChipGroup, FormSubmitButton } from "@/components/forms/FormPrimitives";

const THINKING = ["Invest", "License Stretchy", "License the tech", "Brand partnership", "Bring Stretchy here", "Something else"];

export default function PartnerPage() {
  const [thinking, setThinking] = useState("");
  const [thinkingOther, setThinkingOther] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [more, setMore] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "partner",
          name,
          email,
          fields: { thinking: thinking === "Something else" ? thinkingOther : thinking, organisation, more },
        }),
      });
      setSubmitted(true);
    } catch {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <FormShell bg="#902F8A" dark closeHref="/">
        <div className="py-10 text-center">
          <p className="text-3xl mb-3">🤝</p>
          <h1 className="font-display text-[28px] leading-none mb-2">Conversation started.</h1>
          <p className="text-sm leading-[1.5]">Thanks {name.split(" ")[0] || "there"} — straight to Kimberley, she&rsquo;ll be in touch.</p>
        </div>
      </FormShell>
    );
  }

  return (
    <FormShell bg="#902F8A" dark closeHref="/">
      <div>
        <div className="font-mono text-[10px] font-extrabold tracking-[0.13em]">PARTNER OR INVEST</div>
        <h1 className="font-display text-[32px] leading-none mt-2">Partner / invest</h1>
        <p className="mt-2 text-sm leading-[1.5]">Backing, licensing, brand partnerships, or Stretchy in your own city.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Label>WHAT YOU&rsquo;RE THINKING</Label>
          <ChipGroup dark options={THINKING} value={thinking} onChange={setThinking} otherValue={thinkingOther} onOtherChange={setThinkingOther} />
        </div>
        <div>
          <Label>YOUR NAME</Label>
          <PillInput dark required value={name} onChange={(e) => setName(e.target.value)} placeholder="First and last" />
        </div>
        <div>
          <Label>EMAIL</Label>
          <PillInput dark required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
        </div>
        <div>
          <Label>ORGANISATION</Label>
          <PillInput dark value={organisation} onChange={(e) => setOrganisation(e.target.value)} placeholder="Who you're with" />
        </div>
        <div>
          <Label>TELL US MORE</Label>
          <PillTextarea dark value={more} onChange={(e) => setMore(e.target.value)} placeholder="A few lines is plenty — what you're thinking and where you're based." />
        </div>
        <FormSubmitButton dark loading={loading}>Start a conversation</FormSubmitButton>
        <p className="text-[11px] leading-[1.5]">Straight to Kimberley — kimberley@stretchyyoga.co.nz</p>
      </form>
    </FormShell>
  );
}
