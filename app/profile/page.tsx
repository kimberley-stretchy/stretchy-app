"use client";

import Link from "next/link";
import SMark from "@/components/SMark";
import { useFavourites } from "@/hooks/useFavourites";

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const MOCK = {
  name: "Marlee F.",
  neighbourhood: "Grey Lynn",
  joined: "Feb '26",
  initial: "M",
  sessionsCount: 27,
  matesMet: 41,
  upcoming: [
    { id: "1", title: "Sunday Slow Flow", day: "SUN 1 · 9:00 AM", status: "GOING", color: "#A535C7", initial: "Y" },
    { id: "2", title: "Ponsonby Pilates", day: "THU 5 · 6:30 AM", status: "HOLD", color: "#2A3FE0", initial: "P" },
  ],
};

const SETTINGS = [
  { label: "Notifications", icon: "🔔", href: "/profile/notifications" },
  { label: "Payment method", icon: "💳", href: "/profile/payment" },
  { label: "Invite a mate", icon: "👥", href: "/profile/invite" },
  { label: "Suggest a session", icon: "💡", href: "/suggest" },
  { label: "Become a host", icon: "🎙️", href: "/host/apply" },
  { label: "Help & contact", icon: "💬", href: "/profile/help" },
];

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { favourites, toggle } = useFavourites();

  return (
    <main className="min-h-screen bg-cream pb-20">

      {/* ── NAV ── */}
      <nav className="flex items-center justify-between px-4 py-4 max-w-lg mx-auto">
        <Link href="/home" className="text-ink"><SMark size={28} /></Link>
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted">
          A9 · Profile
        </p>
        <Link href="/home" className="text-muted hover:text-ink text-lg transition-colors">×</Link>
      </nav>

      <div className="px-4 max-w-lg mx-auto space-y-4">

        {/* ── AVATAR + NAME ── */}
        <div className="flex items-center gap-4 pt-2 pb-2">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-white text-2xl flex-shrink-0"
            style={{ backgroundColor: "#2C8FE0" }}
          >
            {MOCK.initial}
          </div>
          <div>
            <h1 className="font-display font-bold text-ink" style={{ fontSize: "26px", letterSpacing: "-0.02em" }}>
              {MOCK.name}
            </h1>
            <p className="font-mono text-xs text-muted uppercase tracking-widest mt-0.5">
              {MOCK.neighbourhood} · joined {MOCK.joined}
            </p>
          </div>
        </div>

        {/* ── STATS ROW ── */}
        <div className="flex gap-3">
          {/* Sessions */}
          <div className="flex-1 bg-white rounded-card shadow-card p-4">
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-1">
              Sessions
            </p>
            <p
              className="font-mono font-black text-ink"
              style={{ fontSize: "40px", lineHeight: "1", letterSpacing: "-0.04em" }}
            >
              {MOCK.sessionsCount}
            </p>
          </div>

          {/* Mates met */}
          <div className="flex-1 rounded-card p-4" style={{ backgroundColor: "#A535C7" }}>
            <p
              className="font-mono text-xs font-bold uppercase tracking-widest mb-1"
              style={{ color: "rgba(255,255,255,0.65)" }}
            >
              Mates met
            </p>
            <p
              className="font-mono font-black text-white"
              style={{ fontSize: "40px", lineHeight: "1", letterSpacing: "-0.04em" }}
            >
              {MOCK.matesMet}
            </p>
          </div>

          {/* Saved */}
          <div className="flex-1 bg-white rounded-card shadow-card p-4">
            <p className="font-mono text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#E63946" }}>
              Saved
            </p>
            <p
              className="font-mono font-black"
              style={{ fontSize: "40px", lineHeight: "1", letterSpacing: "-0.04em", color: "#E63946" }}
            >
              {favourites.length}
            </p>
          </div>
        </div>

        {/* ── UPCOMING ── */}
        <div>
          <h2 className="font-display font-bold text-ink mb-3" style={{ fontSize: "20px" }}>
            Upcoming
          </h2>

          <div className="space-y-2">
            {MOCK.upcoming.map((s) => (
              <Link key={s.id} href={`/sessions/${s.id}`} className="block group">
                <div className="bg-white rounded-card shadow-card p-4 flex items-center gap-3 group-hover:shadow-card-hover transition-shadow duration-200">
                  {/* Type circle */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                    style={{ backgroundColor: s.color }}
                  >
                    {s.initial}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-ink text-sm">{s.title}</p>
                    <p className="font-mono text-xs text-muted mt-0.5">{s.day}</p>
                  </div>

                  {/* Status badge */}
                  <span
                    className="font-mono text-xs font-bold px-3 py-1 rounded-pill flex-shrink-0"
                    style={
                      s.status === "GOING"
                        ? { border: "1.5px solid #4CAF82", color: "#4CAF82" }
                        : { backgroundColor: "#FFD166", color: "#1A1A1A" }
                    }
                  >
                    {s.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── FAVOURITES ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-ink" style={{ fontSize: "20px" }}>
              Saved ♥
            </h2>
            {favourites.length > 0 && (
              <Link href="/sessions" className="font-mono text-xs font-bold text-muted hover:text-ink transition-colors uppercase tracking-widest">
                Browse more →
              </Link>
            )}
          </div>

          {favourites.length === 0 ? (
            <div className="bg-white rounded-card shadow-card p-6 text-center">
              <p className="text-3xl mb-3">♡</p>
              <p className="font-semibold text-ink text-sm mb-1">Nothing saved yet</p>
              <p className="text-sm text-muted leading-snug mb-4">
                Tap ♡ on any session to save it here for later.
              </p>
              <Link
                href="/sessions"
                className="font-mono text-xs font-bold px-5 py-2.5 rounded-pill transition-all hover:brightness-110"
                style={{ backgroundColor: "#1A1A1A", color: "#fff" }}
              >
                Browse sessions →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {favourites.map((fav) => (
                <div key={fav.id} className="bg-white rounded-card shadow-card p-4 flex items-center gap-3">
                  {/* Type circle */}
                  <div
                    className="w-10 h-10 rounded-card flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
                    style={{ backgroundColor: fav.typeColor }}
                  >
                    {fav.initial}
                  </div>

                  {/* Info */}
                  <Link href={`/sessions/${fav.id}`} className="flex-1 min-w-0">
                    <p className="font-bold text-ink text-sm truncate">{fav.title}</p>
                    <p className="font-mono text-xs text-muted mt-0.5">
                      {fav.day} · {fav.time} · {fav.neighbourhood}
                    </p>
                  </Link>

                  {/* Price + heart */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="font-mono text-xs font-bold px-2.5 py-1 rounded-pill"
                      style={{ backgroundColor: "#FFD166", color: "#1A1A1A" }}
                    >
                      ${fav.priceLabel}
                    </span>
                    <button
                      onClick={() => toggle(fav)}
                      className="text-lg transition-transform active:scale-90"
                      style={{ color: "#E63946" }}
                      aria-label="Remove from favourites"
                    >
                      ♥
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── SETTINGS ── */}
        <div className="bg-white rounded-card shadow-card overflow-hidden">
          {SETTINGS.map((s, i) => (
            <Link
              key={s.label}
              href={s.href}
              className="flex items-center gap-3 px-4 py-4 hover:bg-cream transition-colors"
              style={{ borderTop: i > 0 ? "1px solid #F0EBE4" : "none" }}
            >
              <span className="text-xl flex-shrink-0">{s.icon}</span>
              <p className="flex-1 text-sm font-semibold text-ink">{s.label}</p>
              <span className="text-muted text-lg">›</span>
            </Link>
          ))}
        </div>

        {/* ── SIGN OUT ── */}
        <button className="w-full font-mono text-xs font-bold uppercase tracking-widest text-muted py-4 hover:text-ink transition-colors">
          Sign out
        </button>

      </div>
    </main>
  );
}
