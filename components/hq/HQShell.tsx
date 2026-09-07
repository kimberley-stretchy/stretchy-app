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
  { href: "/admin/money", label: "Money" },
  { href: "/admin/venues", label: "Venues" },
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

const NAV_TAIL = [{ href: "/admin/suggestions", label: "Community" }];

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

function HQShellInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
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

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.black, fontFamily: T.body }}>
      <aside
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
            <div key={group.heading} style={{ marginTop: 14 }}>
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

          <div style={{ marginTop: 14 }}>
            {NAV_TAIL.map((item) => (
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

      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
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
