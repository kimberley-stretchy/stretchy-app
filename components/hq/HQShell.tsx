"use client";

import { useEffect, useState, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import SMark from "@/components/SMark";
import { createClient } from "@/lib/supabase/client";

const T = {
  black: "#14110F",
  cream: "#F7F0E8",
  yellow: "#FCBB16",
  blue: "#0000FF",
  mono: "'JetBrains Mono', monospace",
  body: "'Space Grotesk', system-ui, sans-serif",
};

const NAV_FLAT = [
  { href: "/admin/sessions", label: "Today", skipHighlight: true },
  { href: "/admin/sessions", label: "This week", skipHighlight: true },
  { href: "/admin/sessions", label: "Sessions" },
  { href: "/admin/customers", label: "Customers / Accounts" },
  { href: "/admin/money", label: "Money" },
  { href: "/admin/venues", label: "Venues" },
  { href: "/admin/portal", label: "Team portal" },
];

const NAV_GROUPS = [
  {
    heading: "PROFILES",
    items: [
      { href: "/admin/profiles?tab=teachers", label: "Teachers" },
      { href: "/admin/profiles?tab=gems", label: "GEMs" },
    ],
  },
  {
    heading: "PENDING & APPLIED",
    items: [
      { href: "/admin/people?tab=teachers", label: "Teachers" },
      { href: "/admin/people?tab=gems", label: "GEMs" },
    ],
  },
];

const NAV_TAIL_GROUP = {
  heading: "COMMUNITY",
  items: [
    { href: "/admin/newsletters", label: "Newsletters" },
    { href: "/admin/suggestions", label: "Future sessions" },
    { href: "/admin/feedback", label: "Feedback" },
  ],
};

// A link is active on pathname match; if it also carries a ?tab= param
// (Profiles/Pending share the "Teachers"/"GEMs" labels but point at
// different pages+tabs), the current tab has to match too.
function isNavActive(href: string, pathname: string, currentTab: string | null) {
  const [hrefPath, hrefQuery] = href.split("?");
  if (pathname !== hrefPath) return false;
  if (!hrefQuery) return true;
  const hrefTab = new URLSearchParams(hrefQuery).get("tab");
  return hrefTab === currentTab;
}

function NavLink({ href, label, isActive }: { href: string; label: string; isActive: boolean }) {
  return (
    <Link
      href={href}
      style={{
        padding: "9px 12px",
        borderRadius: 10,
        fontSize: 13,
        fontWeight: isActive ? 700 : 500,
        color: isActive ? T.black : "rgba(245,237,227,0.65)",
        background: isActive ? T.yellow : "transparent",
        textDecoration: "none",
      }}
    >
      {label}
    </Link>
  );
}

// HQ was laid out for a wide screen. Under 820px (phones, small tablets) the
// side menu becomes a drawer behind a top bar, and every HQ page gets phone
// spacing: tighter edges, side-by-side columns stacked, wide tables scrollable,
// and form fields at 16px so iPhones don't zoom in when you tap one.
// The pages themselves use inline styles, hence the !important overrides.
const HQ_MOBILE_CSS = `
.hq-topbar, .hq-scrim { display: none; }
@media (max-width: 820px) {
  .hq-shell { display: block !important; }
  .hq-topbar {
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; z-index: 40;
    padding: 10px 14px; background: #14110F;
    border-bottom: 1px solid rgba(245,237,227,0.12);
  }
  .hq-scrim { display: block; position: fixed; inset: 0; z-index: 45; background: rgba(0,0,0,0.5); }
  .hq-aside {
    position: fixed !important; top: 0 !important; left: 0; bottom: 0; z-index: 50;
    width: min(82vw, 300px) !important; height: 100dvh !important;
    overflow-y: auto; transform: translateX(-102%); transition: transform .2s ease;
    padding-bottom: 32px !important;
  }
  .hq-aside.is-open { transform: translateX(0); box-shadow: 0 0 40px rgba(0,0,0,.5); }
  .hq-aside a { padding-top: 12px !important; padding-bottom: 12px !important; font-size: 15px !important; }
  .hq-content main[style*="padding"] { padding: 16px !important; }
  .hq-content main > div { max-width: 100% !important; }
  .hq-content main > div[style*="padding"] { padding-left: 16px !important; padding-right: 16px !important; padding-top: 20px !important; }
  .hq-content [style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
  .hq-content table { display: block; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .hq-content input, .hq-content select, .hq-content textarea { font-size: 16px !important; min-width: 0 !important; max-width: 100%; }
  .hq-content button, .hq-content a[role="button"] { min-height: 40px; }
  .hq-content h1 { font-size: clamp(26px, 8vw, 34px) !important; line-height: 1.05 !important; }
}
`;

function HQShellInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      const role = session?.user?.user_metadata?.role;
      const email = session?.user?.email ?? "";
      if (!session) { router.replace(`/login?next=${pathname}`); return; }
      if (role !== "admin" || !email.toLowerCase().endsWith("@stretchyyoga.co.nz")) {
        router.replace("/home?error=not_authorised");
        return;
      }
      supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data: aal }) => {
        if (aal?.currentLevel !== "aal2") {
          router.replace(`/mfa-setup?next=${encodeURIComponent(pathname)}`);
          return;
        }
        setChecked(true);
      });
    });
    return () => subscription.unsubscribe();
  }, [router, pathname]);

  if (!checked) {
    return <main style={{ background: T.black, minHeight: "100vh" }} />;
  }
  return <HQFrame>{children}</HQFrame>;
}

// The HQ layout itself: side menu (a drawer on phones) + the page.
export function HQFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentTab = useSearchParams().get("tab");
  // On a phone the side menu is a drawer, opened from the top bar.
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { setMenuOpen(false); }, [pathname, currentTab]);

  return (
    <div className="hq-shell" style={{ display: "flex", minHeight: "100vh", background: T.black, fontFamily: T.body }}>
      <style dangerouslySetInnerHTML={{ __html: HQ_MOBILE_CSS }} />

      {/* Phone only: a slim top bar with the menu button. */}
      <header className="hq-topbar">
        <Link href="/admin/sessions" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{ width: 28, height: 28, background: T.cream, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ color: T.black }}><SMark size={16} /></div>
          </div>
          <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 800, color: T.cream, letterSpacing: "0.04em" }}>STRETCHY HQ</span>
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-controls="hq-menu"
          style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", color: T.black, background: T.yellow, border: "none", borderRadius: 999, padding: "10px 16px", cursor: "pointer" }}
        >
          {menuOpen ? "✕ CLOSE" : "≡ MENU"}
        </button>
      </header>
      {menuOpen && <div className="hq-scrim" onClick={() => setMenuOpen(false)} aria-hidden />}

      <aside
        id="hq-menu"
        className={`hq-aside${menuOpen ? " is-open" : ""}`}
        style={{
          width: 200,
          flexShrink: 0,
          background: T.black,
          borderRight: "1px solid rgba(245,237,227,0.10)",
          padding: "24px 16px",
          position: "sticky",
          top: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Link href="/admin/sessions" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28, textDecoration: "none" }}>
          <div style={{ width: 32, height: 32, background: T.cream, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <div style={{ color: T.black }}><SMark size={18} /></div>
          </div>
          <span style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 800, color: T.cream, letterSpacing: "0.02em", lineHeight: 1.15 }}>
            STRETCHY<br />HQ
          </span>
        </Link>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_FLAT.map((item) => (
            <NavLink
              key={item.label + item.href}
              href={item.href}
              label={item.label}
              isActive={!item.skipHighlight && isNavActive(item.href, pathname, currentTab)}
            />
          ))}

          {NAV_GROUPS.map((group) => (
            <div key={group.heading} style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(245,237,227,0.35)", padding: "0 12px", marginBottom: 4 }}>
                {group.heading}
              </div>
              {group.items.map((item) => (
                <NavLink
                  key={item.label + item.href}
                  href={item.href}
                  label={item.label}
                  isActive={isNavActive(item.href, pathname, currentTab)}
                />
              ))}
            </div>
          ))}

          <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(245,237,227,0.35)", padding: "0 12px", marginBottom: 4 }}>
              {NAV_TAIL_GROUP.heading}
            </div>
            {NAV_TAIL_GROUP.items.map((item) => (
              <NavLink
                key={item.label + item.href}
                href={item.href}
                label={item.label}
                isActive={isNavActive(item.href, pathname, currentTab)}
              />
            ))}
          </div>
        </nav>

        <div style={{ marginTop: "auto" }}>
          <Link href="/home" style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "rgba(245,237,227,0.4)", letterSpacing: "0.12em", textDecoration: "none" }}>
            ← BACK TO APP
          </Link>
        </div>
      </aside>

      <div className="hq-content" style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  );
}

export default function HQShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<main style={{ background: T.black, minHeight: "100vh" }} />}>
      <HQShellInner>{children}</HQShellInner>
    </Suspense>
  );
}
