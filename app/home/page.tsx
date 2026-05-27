"use client";

import { useState } from "react";
import Link from "next/link";
import SMark from "@/components/SMark";
import HowToStretchy from "@/components/HowToStretchy";

// ─── MENU DRAWER ──────────────────────────────────────────────────────────────
function MenuDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 w-80 bg-cream shadow-2xl flex flex-col transition-transform duration-300 ease-out"
        style={{ transform: open ? "translateX(0)" : "translateX(100%)" }}
      >
        {/* User header */}
        <div className="px-5 pt-8 pb-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-olive flex items-center justify-center text-cream font-bold text-lg flex-shrink-0">
              M
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-ink leading-tight">Marlee Fisher</p>
              <p className="text-xs text-muted">Grey Lynn · attendee</p>
            </div>
            <span
              className="font-mono text-xs font-bold px-2 py-1 rounded-pill flex-shrink-0"
              style={{ backgroundColor: "#FFD166", color: "#1A1A1A" }}
            >
              27 SESN
            </span>
          </div>
        </div>

        {/* Nav sections */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">

          {/* YOU */}
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted px-2 mb-2">You</p>
            <MenuRow href="/profile" label="Profile & account" />
            <MenuRow
              href="/host/dashboard"
              label="Switch to Host view"
              accent="#A535C7"
              accentText="#fff"
            />
          </div>

          {/* DO STUFF */}
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted px-2 mb-2">Do stuff</p>
            <MenuRow href="/sessions" label="Pick your stretch" icon="🧘" />
            <MenuRow href="/suggest" label="Float a Stretchy" icon="💡" />
            <MenuRow href="/host/apply" label="Apply to be a host" icon="✦" />
          </div>

          {/* STRETCHY HQ */}
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted px-2 mb-2">Stretchy HQ</p>
            <MenuRow href="/contact" label="Contact Stretchy" icon="✉" />
            <MenuRow href="/" label="Sign out" destructive />
          </div>

          {/* TESTING */}
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted px-2 mb-2">🧪 Testing · Attendee</p>
            <MenuRow href="/hold/1"                        label="04 · Place Held"          icon="📍" />
            <MenuRow href="/notifications/going-ahead"     label="A4 · Going Ahead"         icon="✅" />
            <MenuRow href="/notifications/cancelled"       label="A4b · Not This Time"      icon="❌" />
            <MenuRow href="/social-stretch/1"              label="05 · Social Stretch"      icon="🤙" />
            <MenuRow href="/rate/1"                        label="A6 · Rate It"             icon="⭐" />
            <MenuRow href="/notifications"                 label="A7 · Inbox"               icon="📬" />
            <MenuRow href="/suggest"                       label="A8 · Suggest"             icon="💡" />
            <MenuRow href="/profile"                          label="A9 · Profile"             icon="👤" />
            <MenuRow href="/profile/notifications"            label="A9a · Notifications"      icon="🔔" />
            <MenuRow href="/profile/payment"                  label="A9b · Payment method"     icon="💳" />
            <MenuRow href="/profile/invite"                   label="A9c · Invite a mate"      icon="👥" />
            <MenuRow href="/profile/help"                     label="A9d · Help & contact"     icon="💬" />
          </div>

          {/* STRETCHY HQ */}
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted px-2 mb-2">🏢 Stretchy HQ · Admin</p>
            <MenuRow href="/admin"                    label="HQ Home"                  icon="🏢" />
            <MenuRow href="/admin/vetting"            label="ADM-01 · Vetting"         icon="👥" />
            <MenuRow href="/admin/live"               label="ADM-02 · Live Platform"   icon="🔴" />
            <MenuRow href="/admin/suggestions"        label="ADM-03 · Suggestions"     icon="💡" />
            <MenuRow href="/admin/finance"            label="ADM-04 · Finance"         icon="💰" />
            <MenuRow href="/admin/attendees"          label="ADM-05 · Attendee CRM"    icon="🧑‍🤝‍🧑" />
            <MenuRow href="/admin/hosts"              label="ADM-06 · Host CRM"        icon="🎙️" />
            <MenuRow href="/admin/waitlist"           label="ADM-07 · Host Waitlist"   icon="⏳" />
            <MenuRow href="/admin/moderation"         label="ADM-08 · Moderation"      icon="🎬" />
            <MenuRow href="/admin/analytics"          label="ADM-09 · Analytics"       icon="📊" />
          </div>

          {/* TESTING HOST */}
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted px-2 mb-2">🧪 Testing · Host</p>
            <MenuRow href="/host/apply"                    label="06 · Host Apply"          icon="🎙️" />
            <MenuRow href="/host/waitlist"                 label="06b · Host Waitlist"       icon="⏳" />
            <MenuRow href="/host/new-session"              label="07 · Add a Session"       icon="➕" />
            <MenuRow href="/host/floor-not-met"            label="08 · Floor Not Met"       icon="⚠️" />
            <MenuRow href="/host/dashboard"                label="09 · Host Dashboard"      icon="📊" />
            <MenuRow href="/host/session/1"                label="H1 · Manage Session"      icon="👥" />
            <MenuRow href="/host/payout"                   label="H2 · Monthly Payout"      icon="💰" />
            <MenuRow href="/host/inbox"                    label="H3 · Host Inbox"          icon="📬" />
          </div>
        </nav>
      </div>
    </>
  );
}

function MenuRow({
  href,
  label,
  icon,
  accent,
  accentText,
  destructive,
}: {
  href: string;
  label: string;
  icon?: string;
  accent?: string;
  accentText?: string;
  destructive?: boolean;
}) {
  const base =
    "flex items-center justify-between w-full px-3 py-3 rounded-stretchy text-sm font-semibold transition-all duration-150 active:scale-[0.98]";

  if (accent) {
    return (
      <Link
        href={href}
        className={`${base} text-white`}
        style={{ backgroundColor: accent, color: accentText ?? "#fff" }}
      >
        <span>{label}</span>
        <span className="opacity-70">›</span>
      </Link>
    );
  }

  if (destructive) {
    return (
      <Link href={href} className={`${base} text-red`}>
        <span>{label}</span>
        <span className="opacity-50">›</span>
      </Link>
    );
  }

  return (
    <Link href={href} className={`${base} text-ink hover:bg-sand-dark`}>
      <div className="flex items-center gap-2.5">
        {icon && <span className="text-base">{icon}</span>}
        <span>{label}</span>
      </div>
      <span className="text-muted">›</span>
    </Link>
  );
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "#2C8FE0" }}
    >
      {/* ── NAV ── */}
      <nav className="flex items-center justify-between px-5 py-4 max-w-lg mx-auto w-full">
        {/* S-mark */}
        <div className="text-cream">
          <SMark size={28} />
        </div>

        {/* MENU + Bell pill — right side */}
        <div
          className="flex items-center rounded-pill overflow-hidden"
          style={{ backgroundColor: "rgba(245,237,227,0.18)" }}
        >
          <button
            onClick={() => setMenuOpen(true)}
            className="flex items-center gap-1.5 pl-4 pr-3 py-2 font-mono text-xs font-bold uppercase tracking-widest transition-all hover:brightness-110"
            style={{ color: "#F5EDE3" }}
            aria-label="Open menu"
          >
            <span className="text-sm">≡</span>
            <span>MENU</span>
          </button>
          <div className="w-px h-4 flex-shrink-0" style={{ backgroundColor: "rgba(245,237,227,0.25)" }} />
          <Link
            href="/notifications"
            className="pl-3 pr-4 py-2 opacity-80 hover:opacity-100 transition-opacity text-sm"
            aria-label="Notifications"
          >
            🔔
          </Link>
        </div>
      </nav>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 max-w-lg mx-auto w-full">

        {/* Large S-mark */}
        <div className="text-cream mb-8">
          <SMark size={160} />
        </div>

        {/* Location + week label */}
        <p
          className="font-mono text-cream text-center uppercase tracking-[0.18em] mb-4"
          style={{ fontSize: "11px", opacity: 0.70 }}
        >
          Auckland · This week
        </p>

        {/* Headline */}
        <h1
          className="text-cream font-display font-bold text-center"
          style={{
            fontSize: "clamp(44px, 13vw, 60px)",
            letterSpacing: "-0.03em",
            lineHeight: "0.92",
          }}
        >
          A social<br />movement.
        </h1>

        {/* Subtext */}
        <p
          className="text-cream text-center mt-4 leading-snug"
          style={{ fontSize: "15px", opacity: 0.80 }}
        >
          The larger the group gets, the better value for all. Join us.
        </p>

        {/* CTAs */}
        <div className="w-full mt-8 flex flex-col gap-3">
          <Link
            href="/sessions"
            className="w-full flex items-center justify-between px-7 font-semibold text-ink rounded-pill transition-all hover:brightness-95 active:scale-[0.98]"
            style={{ backgroundColor: "#F5EDE3", height: "64px", fontSize: "17px" }}
          >
            <span>See this week</span>
            <span>→</span>
          </Link>

          <Link
            href="/host/create"
            className="w-full flex items-center justify-between px-7 font-semibold text-cream rounded-pill transition-all hover:brightness-125 active:scale-[0.98]"
            style={{ backgroundColor: "#1A1A1A", height: "58px", fontSize: "16px" }}
          >
            <span>Host a Stretchy</span>
            <span>→</span>
          </Link>

          <Link
            href="/suggest"
            className="w-full flex items-center justify-between px-7 font-semibold text-cream rounded-pill border transition-all hover:bg-white/10 active:scale-[0.98]"
            style={{ borderColor: "rgba(245,237,227,0.40)", height: "52px", fontSize: "15px" }}
          >
            <span>Suggest a Stretchy</span>
            <span>→</span>
          </Link>
        </div>
      </div>

      {/* ── HOW TO STRETCHY ── */}
      <div className="px-5 pt-10 pb-6 max-w-lg mx-auto w-full">
        <HowToStretchy />
      </div>

      {/* ── YELLOW FOOTER STRIP ── */}
      <div
        className="h-3"
        style={{ backgroundColor: "#FFD166" }}
      />

      {/* ── MENU DRAWER ── */}
      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </main>
  );
}
