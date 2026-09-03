"use client";

import { useState } from "react";
import FormShell from "@/components/forms/FormShell";
import { Label, PillInput, MultiChipGroup, ThreeWayChoice, FormSubmitButton } from "@/components/forms/FormPrimitives";

const NEIGHBOURHOODS = ["Herne Bay", "Grey Lynn", "Pt Chev", "Takapuna", "Anywhere", "Other"];
const AVAILABILITY = ["Weekend AM", "Weekend PM", "Weekday PM", "Lunchtimes", "Pop-ups / events", "Flexible", "Other"];

export default function GemApplyPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [where, setWhere] = useState<string[]>([]);
  const [whereOther, setWhereOther] = useState("");
  const [when, setWhen] = useState<string[]>([]);
  const [whenOther, setWhenOther] = useState("");
  const [why, setWhy] = useState("");
  const [firstAid, setFirstAid] = useState("");
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
          type: "gem",
          name,
          email,
          fields: {
            where: where.includes("Other") ? [...where.filter((w) => w !== "Other"), whereOther] : where,
            when: when.includes("Other") ? [...when.filter((w) => w !== "Other"), whenOther] : when,
            why,
            firstAid,
          },
        }),
      });
      setSubmitted(true);
    } catch {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <FormShell bg="#716F39" dark closeHref="/">
        <div className="py-10 text-center">
          <p className="text-3xl mb-3">✨</p>
          <h1 className="font-display text-[28px] leading-none mb-2">Good energy received.</h1>
          <p className="text-sm leading-[1.5]">Thanks {name.split(" ")[0] || "there"} — we&rsquo;ll be in touch about becoming a GEM.</p>
        </div>
      </FormShell>
    );
  }

  return (
    <FormShell bg="#716F39" dark closeHref="/">
      <div>
        <div className="font-mono text-[10px] font-extrabold tracking-[0.13em]">BECOME A GEM</div>
        <h1 className="font-display text-[28px] leading-none mt-2">Good Energy Manager</h1>
        <p className="mt-2 text-sm leading-[1.5]">Aka. community host. Greet, check people in, make sure nobody stands on their own.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Label>YOUR NAME</Label>
          <PillInput dark required value={name} onChange={(e) => setName(e.target.value)} placeholder="First and last" />
        </div>
        <div>
          <Label>EMAIL</Label>
          <PillInput dark required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
        </div>
        <div>
          <Label>WHERE YOU CAN HOST</Label>
          <MultiChipGroup dark options={NEIGHBOURHOODS} values={where} onChange={setWhere} otherValue={whereOther} onOtherChange={setWhereOther} />
        </div>
        <div>
          <Label>WHEN YOU&rsquo;RE FREE</Label>
          <MultiChipGroup dark options={AVAILABILITY} values={when} onChange={setWhen} otherValue={whenOther} onOtherChange={setWhenOther} />
        </div>
        <div>
          <Label>FIRST AID TRAINED?</Label>
          <ThreeWayChoice dark value={firstAid} onChange={setFirstAid} />
        </div>
        <div>
          <Label>WHY YOU</Label>
          <PillInput dark value={why} onChange={(e) => setWhy(e.target.value)} placeholder="A few lines — no qualifications needed" />
        </div>
        <FormSubmitButton dark loading={loading}>Apply to be a GEM</FormSubmitButton>
        <p className="text-[10px] leading-[1.5]">No qualifications needed, just good energy. Paid every session you work.</p>
      </form>
    </FormShell>
  );
}
