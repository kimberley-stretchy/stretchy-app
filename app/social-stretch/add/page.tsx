"use client";

import { useState } from "react";
import FormShell from "@/components/forms/FormShell";
import { Label, PillInput, ChipGroup, FormSubmitButton } from "@/components/forms/FormPrimitives";

const KINDS = ["Café", "Bar", "Matcha / juice", "Park / beach", "Breakfast", "Other"];

export default function AddSocialStretchPage() {
  const [spotName, setSpotName] = useState("");
  const [kind, setKind] = useState("");
  const [kindOther, setKindOther] = useState("");
  const [capacity, setCapacity] = useState("");
  const [mapLink, setMapLink] = useState("");
  const [social, setSocial] = useState("");
  const [web, setWeb] = useState("");
  const [worksHere, setWorksHere] = useState(false);
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
          type: "social_stretch",
          fields: {
            spotName,
            kind: kind === "Other" ? kindOther : kind,
            capacity,
            mapLink,
            social,
            web,
            worksHere,
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
      <FormShell bg="#FCBB16" closeHref="/">
        <div className="py-10 text-center">
          <p className="text-3xl mb-3">☕</p>
          <h1 className="font-display text-[28px] leading-none mb-2">Spot put forward.</h1>
          <p className="text-sm leading-[1.5]">Thanks — we&rsquo;ll take a look at {spotName || "your spot"}.</p>
        </div>
      </FormShell>
    );
  }

  return (
    <FormShell bg="#FCBB16" closeHref="/">
      <div>
        <div className="font-mono text-[10px] font-extrabold tracking-[0.13em]">ADD A SOCIAL STRETCH</div>
        <h1 className="font-display text-[28px] leading-none mt-2">Got a good spot for after?</h1>
        <p className="mt-2 text-sm leading-[1.5]">A café, a bar, a patch of grass. Tell us where the room should end up — or put your own venue forward.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Label>THE SPOT</Label>
          <PillInput required value={spotName} onChange={(e) => setSpotName(e.target.value)} placeholder="Name of the café, bar or park" />
        </div>
        <div>
          <Label>WHAT KIND</Label>
          <ChipGroup options={KINDS} value={kind} onChange={setKind} otherValue={kindOther} onOtherChange={setKindOther} />
        </div>
        <div>
          <Label>CAPACITY</Label>
          <PillInput value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="20 people" />
        </div>
        <div>
          <Label>FIND IT</Label>
          <div className="flex flex-col gap-2">
            <PillInput value={mapLink} onChange={(e) => setMapLink(e.target.value)} placeholder="Paste a Google Maps link" />
            <PillInput value={social} onChange={(e) => setSocial(e.target.value)} placeholder="@theirhandle" />
            <PillInput value={web} onChange={(e) => setWeb(e.target.value)} placeholder="theirsite.co.nz" />
          </div>
        </div>
        <label className="flex items-center gap-[11px] border-2 border-ink rounded-pill py-2.5 px-[18px] bg-cream cursor-pointer">
          <span
            className="w-[42px] h-6 rounded-pill relative flex-shrink-0"
            style={{ backgroundColor: "#14110F" }}
          >
            <span
              className="absolute top-0.5 w-5 h-5 rounded-pill bg-yellow transition-all"
              style={{ left: worksHere ? "20px" : "2px" }}
            />
          </span>
          <input type="checkbox" checked={worksHere} onChange={(e) => setWorksHere(e.target.checked)} className="sr-only" />
          <span className="text-xs leading-[1.4]">I work here / I can talk to them</span>
        </label>
        <FormSubmitButton loading={loading}>Put it forward</FormSubmitButton>
      </form>
    </FormShell>
  );
}
