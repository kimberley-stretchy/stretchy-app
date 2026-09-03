"use client";

import { useState } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";

type NotifRow = {
  id: string;
  label: string;
  desc: string;
  defaultOn: boolean;
};

const NOTIF_SECTIONS: { heading: string; rows: NotifRow[] }[] = [
  {
    heading: "Sessions",
    rows: [
      { id: "confirm",   label: "Session confirmed",        desc: "When your hold locks in and the session is going ahead.", defaultOn: true },
      { id: "cancelled", label: "Session cancelled",        desc: "If a session you're booked into doesn't go ahead.",       defaultOn: true },
      { id: "reminder",  label: "Day-of reminder",          desc: "Morning nudge before your session.",                      defaultOn: true },
      { id: "social",    label: "Social Stretch invite",    desc: "When your host opens the post-session hang.",             defaultOn: true },
    ],
  },
  {
    heading: "Community",
    rows: [
      { id: "suggest",   label: "New session suggestions",  desc: "When the community floats a Stretchy near you.",         defaultOn: false },
      { id: "votes",     label: "Your suggestion gets votes", desc: "When people back your Stretchy idea.",                 defaultOn: true },
      { id: "newhost",   label: "New host in your area",    desc: "When a new host joins your neighbourhood.",              defaultOn: false },
    ],
  },
  {
    heading: "Account",
    rows: [
      { id: "payment",   label: "Payment receipts",         desc: "Confirmation when a payment clears.",                    defaultOn: true },
      { id: "refund",    label: "Refunds & credits",        desc: "Any money back to your account.",                        defaultOn: true },
      { id: "news",      label: "Stretchy updates",         desc: "New features, big changes, occasional love notes.",      defaultOn: false },
    ],
  },
];

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative flex-shrink-0 transition-all duration-200 active:scale-95"
      style={{
        width: "48px",
        height: "28px",
        borderRadius: "14px",
        backgroundColor: on ? "#0000FF" : "#E0D9D0",
      }}
      aria-label="toggle"
    >
      <span
        className="absolute top-1 transition-all duration-200 w-5 h-5 rounded-full bg-white border-2 border-ink"
        style={{ left: on ? "24px" : "4px" }}
      />
    </button>
  );
}

export default function NotificationsPage() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(
      NOTIF_SECTIONS.flatMap((s) => s.rows).map((r) => [r.id, r.defaultOn])
    )
  );

  const toggle = (id: string) =>
    setPrefs((p) => ({ ...p, [id]: !p[id] }));

  const [saved, setSaved] = useState(false);
  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
          Notifications
        </span>
        <div className="w-10" />
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-6">

        <div>
          <p className="font-mono text-xs font-bold uppercase tracking-[0.20em] text-muted mb-2">
            Control what lands in your life
          </p>
          <h1
            className="font-display font-bold text-ink"
            style={{ fontSize: "clamp(40px,11vw,54px)", letterSpacing: "-0.04em", lineHeight: "0.92" }}
          >
            Your<br />alerts.
          </h1>
        </div>

        {NOTIF_SECTIONS.map((section) => (
          <div key={section.heading}>
            <h2
              className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-2"
              style={{ paddingLeft: "2px" }}
            >
              {section.heading}
            </h2>
            <div className="bg-white rounded-card border-2 border-ink divide-y divide-border">
              {section.rows.map((row) => (
                <div key={row.id} className="flex items-center gap-4 px-4 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink text-sm leading-tight">{row.label}</p>
                    <p className="text-xs text-muted mt-0.5 leading-snug">{row.desc}</p>
                  </div>
                  <Toggle on={prefs[row.id]} onToggle={() => toggle(row.id)} />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Push permission note */}
        <div
          className="rounded-card px-4 py-3 flex items-start gap-3"
          style={{ backgroundColor: "#EFF6FF", border: "2px solid #14110F" }}
        >
          <span className="text-lg flex-shrink-0">🔔</span>
          <p className="text-xs text-ink leading-snug">
            <span className="font-bold">Push notifications are on.</span> To change this, go to your phone&apos;s Settings → Notifications → Stretchy.
          </p>
        </div>
      </div>

      {/* Sticky save */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-4 bg-cream/90 backdrop-blur-sm max-w-lg mx-auto">
        <button
          onClick={handleSave}
          className="w-full font-semibold rounded-pill transition-all hover:brightness-110 active:scale-[0.98]"
          style={{
            backgroundColor: saved ? "#716F39" : "#14110F",
            color: "#F7F0E8",
            height: "56px",
            fontSize: "16px",
          }}
        >
          {saved ? "✓ Saved" : "Save preferences"}
        </button>
      </div>
    </main>
  );
}
