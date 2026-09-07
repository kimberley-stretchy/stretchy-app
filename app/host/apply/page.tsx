"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import FormShell from "@/components/forms/FormShell";
import { Label, PillInput, MultiChipGroup, ThreeWayChoice, FormSubmitButton } from "@/components/forms/FormPrimitives";

const STYLES = ["Vinyasa", "Yin", "Yin yang", "Yinyasa", "Yoga nidra", "Meditation", "Restorative", "Slow flow", "Pilates", "Breathwork", "Other"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIMES = ["Early morning", "Mid morning", "Lunch", "Afternoon", "Evening"];

function TeacherApplyForm() {
  const searchParams = useSearchParams();
  // Linked to from HQ (PeopleSection's "+ Add a teacher") passes back the
  // exact admin page to return to, so closing doesn't dump HQ users onto
  // the public homepage.
  const closeHref = searchParams.get("from") || "/";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [styles, setStyles] = useState<string[]>([]);
  const [styleOther, setStyleOther] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [firstAid, setFirstAid] = useState("");
  const [location, setLocation] = useState("");
  const [days, setDays] = useState<string[]>([]);
  const [times, setTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function toggleDay(d: string) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "teacher",
          name,
          email,
          fields: {
            styles: styles.includes("Other") ? [...styles.filter((s) => s !== "Other"), styleOther] : styles,
            qualifications,
            firstAid,
            location,
            days,
            times,
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
      <FormShell bg="#0000FF" dark closeHref={closeHref}>
        <div className="py-10 text-center">
          <p className="text-3xl mb-3">🙌</p>
          <h1 className="font-display text-[28px] leading-none mb-2">You&rsquo;re in the mix.</h1>
          <p className="text-sm leading-[1.5]">Thanks {name.split(" ")[0] || "there"} — we&rsquo;ll be in touch about teaching a Stretchy.</p>
        </div>
      </FormShell>
    );
  }

  return (
    <FormShell bg="#0000FF" dark closeHref={closeHref}>
      <div>
        <div className="font-mono text-[10px] font-extrabold tracking-[0.13em]">TEACH A STRETCHY</div>
        <h1 className="font-display text-[32px] leading-none mt-2">Teacher</h1>
        <p className="mt-2 text-sm leading-[1.5]">Bring your own style. Paid the same whether the room is full or just full enough.</p>
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
          <Label>WHAT YOU TEACH</Label>
          <MultiChipGroup dark options={STYLES} values={styles} onChange={setStyles} otherValue={styleOther} onOtherChange={setStyleOther} />
        </div>
        <div>
          <Label>QUALIFICATIONS</Label>
          <PillInput dark value={qualifications} onChange={(e) => setQualifications(e.target.value)} placeholder="RYT 200, 8 yrs teaching…" />
        </div>
        <div>
          <Label>FIRST AID TRAINED?</Label>
          <ThreeWayChoice dark value={firstAid} onChange={setFirstAid} />
        </div>
        <div>
          <Label>LOCATION</Label>
          <PillInput dark value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Suburbs you can teach in" />
        </div>
        <div>
          <Label>DAYS OF THE WEEK</Label>
          <MultiChipGroup dark options={DAYS} values={days} onChange={setDays} />
        </div>
        <div>
          <Label>TIMES</Label>
          <MultiChipGroup dark options={TIMES} values={times} onChange={setTimes} />
        </div>
        <FormSubmitButton dark loading={loading}>Apply to teach</FormSubmitButton>
      </form>
    </FormShell>
  );
}

export default function TeacherApplyPage() {
  return (
    <Suspense>
      <TeacherApplyForm />
    </Suspense>
  );
}
