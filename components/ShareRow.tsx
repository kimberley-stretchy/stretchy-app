"use client";

import { useEffect, useState } from "react";

// One row of round share buttons with small labels:
// WhatsApp · Text (phones only) · Email · Copy link.
// Shares always go from the person's own phone or email, never from Stretchy.
// SOCIAL_BOOKING_BRIEF.md 0c / 0d / section 2.

const INK = "#14110F";

function Icon({ d }: { d: string[] }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d.map((p) => <path key={p} d={p} />)}
    </svg>
  );
}

const ICONS = {
  whatsapp: ["M3.5 20.5l1.3-4A8.5 8.5 0 1 1 8 19.4z", "M9 8.5c0 3.6 2.9 6.5 6.5 6.5l1-1.6-2.1-1-1 .9a5 5 0 0 1-2.7-2.7l.9-1-1-2.1z"],
  text: ["M4 5h16v11H9.5L5 20v-4H4z"],
  email: ["M3 6h18v12H3z", "M3 7l9 6 9-6"],
  link: ["M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1", "M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"],
  copied: ["M5 12.5l4.5 4.5L19 7.5"],
};

/** True on phones (Text only shows there). Decided after load, so the server and browser agree. */
export function useIsPhone() {
  const [phone, setPhone] = useState(false);
  useEffect(() => setPhone(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)), []);
  return phone;
}

/** iOS opens texts with "&body=", Android with "?body=". */
export function smsLink(message: string) {
  const ios = typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);
  return `sms:${ios ? "&" : "?"}body=${encodeURIComponent(message)}`;
}

export function whatsappLink(message: string) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export default function ShareRow({
  message,
  url,
  emailSubject,
}: {
  /** The whole message, link included. */
  message: string;
  /** Just the link, for Copy link. */
  url: string;
  emailSubject: string;
}) {
  const phone = useIsPhone();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* Clipboard blocked: the link is shown on the page to long-press. */
    }
  }

  const items: { key: string; label: string; icon: string[]; href?: string; onClick?: () => void }[] = [
    { key: "whatsapp", label: "WhatsApp", icon: ICONS.whatsapp, href: whatsappLink(message) },
    ...(phone ? [{ key: "text", label: "Text", icon: ICONS.text, href: smsLink(message) }] : []),
    { key: "email", label: "Email", icon: ICONS.email, href: `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(message)}` },
    { key: "copy", label: copied ? "Copied" : "Copy link", icon: copied ? ICONS.copied : ICONS.link, onClick: copy },
  ];

  const circle = "w-12 h-12 rounded-full border-2 flex items-center justify-center transition-transform active:scale-95";
  const label = "font-mono text-[10px] font-extrabold uppercase tracking-[0.06em] whitespace-nowrap";

  return (
    <div className="flex justify-center gap-5" style={{ color: INK }}>
      {items.map((it) => {
        const inner = (
          <>
            <span className={circle} style={{ borderColor: INK, background: it.key === "copy" && copied ? INK : "transparent", color: it.key === "copy" && copied ? "#F7F0E8" : INK }}>
              <Icon d={it.icon} />
            </span>
            <span className={label} aria-live={it.key === "copy" ? "polite" : undefined}>{it.label}</span>
          </>
        );
        const cls = "flex flex-col items-center gap-1.5 w-14";
        return it.href ? (
          <a key={it.key} href={it.href} className={cls} target={it.href.startsWith("http") ? "_blank" : undefined} rel={it.href.startsWith("http") ? "noopener noreferrer" : undefined}>
            {inner}
          </a>
        ) : (
          <button key={it.key} type="button" onClick={it.onClick} className={cls}>
            {inner}
          </button>
        );
      })}
    </div>
  );
}
