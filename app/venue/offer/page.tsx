"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import FormShell from "@/components/forms/FormShell";
import { Label, PillInput, ChipGroup, FormSubmitButton } from "@/components/forms/FormPrimitives";

const SPACE_TYPES = ["Movement space", "Social Stretch spot", "Both", "Other"];

function VenueOfferForm() {
  const searchParams = useSearchParams();
  // Linked to from HQ (PeopleSection's "+ Add a venue") passes back the
  // exact admin page to return to, so closing doesn't dump HQ users onto
  // the public homepage.
  const closeHref = searchParams.get("from") || "/";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [spaceType, setSpaceType] = useState("");
  const [spaceTypeOther, setSpaceTypeOther] = useState("");
  const [address, setAddress] = useState("");
  const [capacity, setCapacity] = useState("");
  const [rate, setRate] = useState("");
  const [mapLink, setMapLink] = useState("");
  const [webLink, setWebLink] = useState("");
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
          type: "venue",
          name,
          email,
          fields: {
            spaceType: spaceType === "Other" ? spaceTypeOther : spaceType,
            address,
            capacity,
            rate,
            mapLink,
            webLink,
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
      <FormShell bg="#FCBB16" closeHref={closeHref}>
        <div className="py-10 text-center">
          <p className="text-3xl mb-3">🏠</p>
          <h1 className="font-display text-[28px] leading-none mb-2">Space offered.</h1>
          <p className="text-sm leading-[1.5]">Thanks {name.split(" ")[0] || "there"} — we&rsquo;ll be in touch about your venue.</p>
        </div>
      </FormShell>
    );
  }

  return (
    <FormShell bg="#FCBB16" closeHref={closeHref}>
      <div>
        <div className="font-mono text-[10px] font-extrabold tracking-[0.13em]">OFFER A VENUE</div>
        <h1 className="font-display text-[32px] leading-none mt-2">Venue</h1>
        <p className="mt-2 text-sm leading-[1.5]">A hall, a studio, a rooftop — or a café or bar for the Social Stretch afterwards.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <Label>WHAT KIND OF SPACE</Label>
          <ChipGroup options={SPACE_TYPES} value={spaceType} onChange={setSpaceType} otherValue={spaceTypeOther} onOtherChange={setSpaceTypeOther} />
        </div>
        <div>
          <Label>YOUR NAME</Label>
          <PillInput required value={name} onChange={(e) => setName(e.target.value)} placeholder="First and last" />
        </div>
        <div>
          <Label>EMAIL</Label>
          <PillInput required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
        </div>
        <div>
          <Label>VENUE NAME &amp; ADDRESS</Label>
          <PillInput value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Where is it?" />
        </div>
        <div>
          <Label>CAPACITY</Label>
          <PillInput value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="How many mats / seats?" />
        </div>
        <div>
          <Label>YOUR RATE</Label>
          <PillInput value={rate} onChange={(e) => setRate(e.target.value)} placeholder="NZD per session, or free" />
        </div>
        <div>
          <Label>LINKS</Label>
          <div className="flex flex-col gap-2">
            <PillInput value={mapLink} onChange={(e) => setMapLink(e.target.value)} placeholder="Google Maps link" />
            <PillInput value={webLink} onChange={(e) => setWebLink(e.target.value)} placeholder="yoursite.co.nz" />
          </div>
        </div>
        <FormSubmitButton loading={loading}>Offer the space</FormSubmitButton>
        <p className="text-[11px] leading-[1.5]">We bring a room full of locals. You set the rate and the times that suit.</p>
      </form>
    </FormShell>
  );
}

export default function VenueOfferPage() {
  return (
    <Suspense>
      <VenueOfferForm />
    </Suspense>
  );
}
