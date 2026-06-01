"use client";

import Link from "next/link";
import SMark from "@/components/SMark";

const LINKS = [
  {
    label: "Instagram",
    handle: "@stretchy.yoga",
    href: "https://www.instagram.com/stretchy.yoga/",
    icon: "📸",
    color: "#E63946",
  },
  {
    label: "TikTok",
    handle: "@stretchy.yoga",
    href: "https://www.tiktok.com/@stretchy.yoga",
    icon: "🎵",
    color: "#1A1A1A",
  },
  {
    label: "Substack",
    handle: "@stretchyyoga",
    href: "https://substack.com/@stretchyyoga",
    icon: "✍️",
    color: "#FF6B35",
  },
  {
    label: "Email",
    handle: "kimberley@stretchyyoga.co.nz",
    href: "mailto:kimberley@stretchyyoga.co.nz",
    icon: "✉️",
    color: "#2C8FE0",
  },
];

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-cream pb-20">
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <Link href="/home" className="text-ink"><SMark size={28} /></Link>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">Contact</p>
        <Link href="/home" className="text-muted hover:text-ink text-lg transition-colors">×</Link>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-6">
        <div>
          <h1 className="font-display font-bold text-ink mb-2" style={{ fontSize: "36px", letterSpacing: "-0.03em" }}>
            Say hello.
          </h1>
          <p className="text-muted text-sm leading-relaxed">
            We're a small team. We reply to everything.
          </p>
        </div>

        <div className="space-y-3">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target={l.href.startsWith("mailto") ? undefined : "_blank"}
              rel="noopener noreferrer"
              className="flex items-center gap-4 bg-white rounded-card shadow-card p-4 hover:shadow-card-hover transition-shadow duration-200"
            >
              <div
                className="w-11 h-11 rounded-card flex items-center justify-center text-xl flex-shrink-0"
                style={{ backgroundColor: `${l.color}18` }}
              >
                {l.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-ink text-sm">{l.label}</p>
                <p className="font-mono text-xs text-muted truncate">{l.handle}</p>
              </div>
              <span className="text-muted text-lg flex-shrink-0">›</span>
            </a>
          ))}
        </div>

        <div className="bg-white rounded-card shadow-card p-5 text-center">
          <p className="text-sm text-muted leading-relaxed">
            Want to host a session?{" "}
            <Link href="/host/apply" className="font-bold text-ink hover:underline">
              Apply here →
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
