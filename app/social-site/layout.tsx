import type { Metadata } from "next";
import { Bricolage_Grotesque, Space_Mono } from "next/font/google";

// stretchy.social — its own fonts, title, description and share card.
// (BN Chubb, the display font, already comes from the main app's globals.css.)
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-bricolage", display: "swap" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono", display: "swap" });

const TITLE = "Stretchy Social — People-powered pricing for communities";
const DESCRIPTION = "The tech behind Stretchy. Event, booking and payment software with people-powered pricing, for community groups, run clubs, charities and studios.";

export const metadata: Metadata = {
  metadataBase: new URL("https://stretchy.social"),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  icons: { icon: "/social/stretchy-s-ink.png", apple: "/social/stretchy-s-ink.png" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "https://stretchy.social", siteName: "Stretchy Social", locale: "en_NZ", type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function SocialSiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${bricolage.variable} ${spaceMono.variable}`} lang="en-NZ">
      {/* stretchy.social has its own footer: hide the main site's small one. */}
      <style dangerouslySetInnerHTML={{ __html: "body > footer { display: none !important; } html, body { background: #F7F1EA; }" }} />
      {children}
    </div>
  );
}
