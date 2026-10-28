"use client";

// The Stretchy Australia pop-up: only for visitors in Australia (Vercel tells
// us the country), only once per device, never on HQ, the team view, the
// waitlist itself or stretchy.social. Closing it (×) or joining stops it showing.
// Copy agreed with Kimberley, Oct 2026.

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LAUNCH_LINE, LINKS, NZ_VIBES } from "@/lib/australia";

const KEY = "stretchy_au_popup";
const SKIP = ["/admin", "/host", "/australia", "/social-site", "/mfa-setup", "/login", "/auth"];
const INK = "#14110F";
const CREAM = "#F7F0E8";

export default function AustraliaPopup() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (SKIP.some((p) => pathname.startsWith(p))) return;
    try { if (localStorage.getItem(KEY)) return; } catch { return; }
    // Local runs can pretend to be in Australia with ?geo=AU.
    const geo = new URLSearchParams(window.location.search).get("geo");
    fetch(`/api/australia/seen${geo ? `?geo=${encodeURIComponent(geo)}` : ""}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.australia) return;
        setOpen(true);
        try { localStorage.setItem(KEY, "seen"); } catch { /* fine */ }
        fetch(`/api/australia/seen${geo ? `?geo=${encodeURIComponent(geo)}` : ""}`, { method: "POST" }).catch(() => {});
      })
      .catch(() => {});
  }, [pathname]);

  if (!open) return null;
  const close = () => setOpen(false);
  const link = { color: CREAM, fontWeight: 700, textDecoration: "underline" } as const;

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="au-title" onClick={close} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(20,17,15,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", background: "#E96709", color: INK, border: `2px solid ${INK}`, borderRadius: 24, padding: "26px 22px 22px", maxWidth: 420, width: "100%", display: "flex", flexDirection: "column", gap: 12, fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
        <button onClick={close} aria-label="Close" style={{ position: "absolute", top: 12, right: 12, width: 34, height: 34, borderRadius: 999, border: `2px solid ${INK}`, background: "transparent", color: INK, fontSize: 16, fontWeight: 800, cursor: "pointer" }}>×</button>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 800, letterSpacing: ".14em" }}>STRETCHY AUSTRALIA 🇦🇺</span>
        <h2 id="au-title" style={{ margin: 0, fontFamily: "'BN Chubb', 'Space Grotesk', sans-serif", fontSize: "clamp(30px,9vw,40px)", lineHeight: 0.95, textTransform: "uppercase" }}>Sydney, we&rsquo;re coming.</h2>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{LAUNCH_LINE}</p>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>Community yoga where the price drops as more people join, then a Social Stretch over coffee after. Sydney first, with more of Australia to come soon.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
          <a href="/australia?src=popup" onClick={() => { try { localStorage.setItem(KEY, "clicked"); } catch { /* fine */ } }} style={{ flex: "1 1 200px", height: 46, borderRadius: 999, border: `2px solid ${INK}`, color: INK, fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>Join the Sydney waitlist</a>
        </div>
        <div style={{ borderTop: `1.5px solid ${INK}`, paddingTop: 10, fontSize: 13, lineHeight: 1.6, color: INK }}>
          Follow along: <a href={LINKS.auInstagram.href} target="_blank" rel="noopener" style={{ ...link, color: INK }}>{LINKS.auInstagram.label}</a> · <a href={LINKS.tiktok.href} target="_blank" rel="noopener" style={{ ...link, color: INK, fontWeight: 600 }}>{LINKS.tiktok.label}</a><br />
          {NZ_VIBES} <a href={LINKS.nzInstagram.href} target="_blank" rel="noopener" style={{ ...link, color: INK }}>{LINKS.nzInstagram.label}</a> 🌿
        </div>
      </div>
    </div>
  );
}
