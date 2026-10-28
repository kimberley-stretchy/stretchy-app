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

const NAV_GROUPS = [
  {
    heading: "ADMIN & OPS",
    items: [
      { href: "/admin/sessions", label: "Sessions" },
      { href: "/admin/customers", label: "Customers / Accounts" },
      { href: "/admin/money", label: "Money" },
    ],
  },
  {
    heading: "PROFILES",
    items: [
      { href: "/admin/profiles?tab=teachers", label: "Teachers" },
      { href: "/admin/profiles?tab=gems", label: "GEMs" },
      // The venues we use, with their contacts, live in Team portal → Locations.
      { href: "/admin/portal?tab=locations", label: "Venues" },
    ],
  },
  {
    heading: "PENDING & APPLIED",
    items: [
      { href: "/admin/people?tab=teachers", label: "Teachers" },
      { href: "/admin/people?tab=gems", label: "GEMs" },
      // Offers that came in through the venue form.
      { href: "/admin/venues", label: "Venues" },
    ],
  },
  {
    heading: "COMMUNITY",
    items: [
      { href: "/admin/portal", label: "Team portal" },
      { href: "/admin/notices", label: "Team notices" },
      { href: "/admin/newsletters", label: "Newsletters" },
      { href: "/admin/suggestions", label: "Future sessions" },
      { href: "/admin/feedback", label: "Feedback" },
      { href: "/admin/social", label: "stretchy.social leads" },
      { href: "/admin/social-research", label: "stretchy.social research" },
      { href: "/admin/australia", label: "Australia waitlist 🇦🇺" },
    ],
  },
];
const ALL_HREFS = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));

// A link is active on pathname match; if it also carries a ?tab= param
// (Profiles/Pending share the "Teachers"/"GEMs" labels but point at
// different pages+tabs), the current tab has to match too.
function isNavActive(href: string, pathname: string, currentTab: string | null) {
  const [hrefPath, hrefQuery] = href.split("?");
  if (pathname !== hrefPath) return false;
  // Plain link (Team portal): active unless a ?tab= link on the same page
  // (Profiles → Venues = Team portal's Locations tab) claims the current tab.
  if (!hrefQuery) return !ALL_HREFS.some((h) => h.startsWith(`${hrefPath}?`) && new URLSearchParams(h.split("?")[1]).get("tab") === currentTab);
  const hrefTab = new URLSearchParams(hrefQuery).get("tab");
  return hrefTab === currentTab;
}

function NavLink({ href, label, isActive }: { href: string; label: string; isActive: boolean }) {
  return (
    <Link
      href={href}
      className={isActive ? "hq-link is-active" : "hq-link"}
      style={{
        padding: "7px 12px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: isActive ? 700 : 500,
        color: T.black,
        background: "transparent",
        border: `2px solid ${isActive ? T.black : "transparent"}`,
        textDecoration: "none",
      }}
    >
      {label}
    </Link>
  );
}

// HQ was laid out for a wide screen. Under 820px (phones, small tablets) it
// takes on the look of the app itself (cream, ink outlines, the same MENU pill):
// the side menu becomes a drawer behind a top bar, and every HQ page gets phone
// spacing: tighter edges, side-by-side columns stacked, wide tables scrollable,
// and form fields at 16px so iPhones don't zoom in when you tap one.
// The pages themselves use inline styles, hence the !important overrides.
// The HQ look (Oct 2026, matching stretchy.social and the app): cream, ink
// keylines, one colour at most. Coloured fills on buttons and pill badges in
// any HQ page become ink outlines here, so pages don't each need restyling.
// Ink-filled buttons stay: that's the "selected" look on toggles.
const NOT_NEUTRAL = ':not([style*="background: rgb(20, 17, 15)"]):not([style*="background: rgb(255, 255, 255)"]):not([style*="background: rgb(247, 240, 232)"])';
const HQ_LOOK_CSS = `
.hq-content button[style*="background: rgb"]${NOT_NEUTRAL},
.hq-content a[style*="border-radius: 999px"][style*="background: rgb"]${NOT_NEUTRAL} {
  background: transparent !important; color: #14110F !important; border: 2px solid #14110F !important;
}
.hq-content span[style*="border-radius: 999px"][style*="padding"][style*="background: rgb"]${NOT_NEUTRAL} {
  background: transparent !important; color: #14110F !important; box-shadow: inset 0 0 0 1.5px #14110F;
}
.hq-aside .hq-link:hover:not(.is-active) { border-color: rgba(20,17,15,0.25) !important; }
`;

const HQ_MOBILE_CSS = `
.hq-topbar, .hq-scrim { display: none; }
@media (max-width: 820px) {
  .hq-shell { display: block !important; background: #F7F0E8 !important; }
  .hq-topbar {
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; z-index: 40;
    padding: 12px 16px; background: #F7F0E8;
    border-bottom: 2px solid #14110F;
  }
  .hq-scrim { display: block; position: fixed; inset: 0; z-index: 45; background: rgba(20,17,15,0.45); }
  .hq-aside {
    position: fixed !important; top: 0 !important; left: 0; bottom: 0; z-index: 50;
    width: min(84vw, 320px) !important; height: 100dvh !important;
    overflow-y: auto; transform: translateX(-102%); transition: transform .2s ease;
    padding-bottom: 32px !important;
    background: #F7F0E8 !important; border-right: 2px solid #14110F !important;
  }
  .hq-aside.is-open { transform: translateX(0); }
  .hq-aside .hq-ink { color: #14110F !important; }
  .hq-aside .hq-link { padding: 13px 14px !important; font-size: 15px !important; font-weight: 600 !important; color: #14110F !important; border-radius: 14px !important; }
  .hq-aside .hq-link.is-active { border-color: #14110F !important; }
  .hq-aside .hq-nav-heading { color: rgba(20,17,15,0.45) !important; font-size: 10px !important; margin-top: 6px; }
  .hq-aside .hq-back { color: rgba(20,17,15,0.55) !important; display: inline-block; padding: 16px 12px 0; }
  .hq-content main[style*="padding"] { padding: 16px !important; }
  .hq-content main > div { max-width: 100% !important; }
  .hq-content main > div[style*="padding"] { padding-left: 16px !important; padding-right: 16px !important; padding-top: 20px !important; }
  .hq-content [style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
  .hq-content table { display: block; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .hq-content input, .hq-content select, .hq-content textarea { font-size: 16px !important; min-width: 0 !important; max-width: 100%; }
  .hq-content button, .hq-content a[role="button"] { min-height: 34px; }
  .hq-content h1 { font-family: 'BN Chubb', 'Space Grotesk', sans-serif !important; font-size: clamp(30px, 9vw, 40px) !important; line-height: 1 !important; letter-spacing: -0.02em !important; }
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
    return <main style={{ background: T.cream, minHeight: "100vh" }} />;
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
    <div className="hq-shell" style={{ display: "flex", minHeight: "100vh", background: T.cream, fontFamily: T.body }}>
      <style dangerouslySetInnerHTML={{ __html: HQ_LOOK_CSS + HQ_MOBILE_CSS }} />

      {/* Phone only: a slim top bar with the menu button. */}
      <header className="hq-topbar">
        <Link href="/admin/sessions" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: T.black }}>
          <SMark size={30} />
          <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 800, color: T.black, letterSpacing: "0.12em" }}>HQ</span>
        </Link>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-controls="hq-menu"
          style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: T.black, background: "transparent", border: `2px solid ${T.black}`, borderRadius: 999, padding: "7px 16px", cursor: "pointer" }}
        >
          {menuOpen ? "✕ CLOSE" : "≡ MENU"}
        </button>
      </header>
      {menuOpen && <div className="hq-scrim" onClick={() => setMenuOpen(false)} aria-hidden />}

      <aside
        id="hq-menu"
        className={`hq-aside${menuOpen ? " is-open" : ""}`}
        style={{
          width: 210,
          flexShrink: 0,
          background: T.cream,
          borderRight: `2px solid ${T.black}`,
          padding: "24px 16px",
          position: "sticky",
          top: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Link href="/admin/sessions" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28, textDecoration: "none" }}>
          <div style={{ color: T.black, flexShrink: 0 }}><SMark size={28} /></div>
          <span className="hq-ink" style={{ fontFamily: T.mono, fontSize: 12, fontWeight: 800, color: T.black, letterSpacing: "0.02em", lineHeight: 1.15 }}>
            STRETCHY<br />HQ
          </span>
        </Link>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_GROUPS.map((group) => (
            <div key={group.heading} style={{ marginTop: group === NAV_GROUPS[0] ? 0 : 14, display: "flex", flexDirection: "column", gap: 2 }}>
              <div className="hq-nav-heading" style={{ fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(20,17,15,0.4)", padding: "0 14px", marginBottom: 4 }}>
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

        </nav>

        <div style={{ marginTop: "auto" }}>
          <Link href="/home" className="hq-back" style={{ fontFamily: T.mono, fontSize: 10, fontWeight: 700, color: "rgba(20,17,15,0.5)", letterSpacing: "0.12em", textDecoration: "none" }}>
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
    <Suspense fallback={<main style={{ background: T.cream, minHeight: "100vh" }} />}>
      <HQShellInner>{children}</HQShellInner>
    </Suspense>
  );
}
