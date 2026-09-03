"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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

const NAV = [
  { href: "/admin/sessions", label: "Today" },
  { href: "/admin/sessions", label: "This week" },
  { href: "/admin/sessions", label: "Sessions" },
  { href: "/admin/money", label: "Money" },
  { href: "/admin/people?tab=teachers", label: "Teachers" },
  { href: "/admin/people?tab=gems", label: "GEMs" },
  { href: "/admin/people?tab=venues", label: "Venues" },
  { href: "/admin/suggestions", label: "Community" },
];

export default function HQShell({ children }: { children: React.ReactNode }) {
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
      setChecked(true);
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
          {NAV.map((item, i) => {
            const isActive = pathname === item.href.split("?")[0] && (i >= 2);
            return (
              <Link
                key={item.label}
                href={item.href}
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
                {item.label}
              </Link>
            );
          })}
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
