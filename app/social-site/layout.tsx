import type { Metadata } from "next";
import { Bricolage_Grotesque, Space_Mono } from "next/font/google";

// stretchy.social — its own fonts, title, description and share card.
// (BN Chubb, the display font, already comes from the main app's globals.css.)
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-bricolage", display: "swap" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono", display: "swap" });

const TITLE = "Stretchy Social — People-powered pricing for events & communities";
const DESCRIPTION =
  "Event, booking and payment software with people-powered pricing (also called participation or social pricing): the price drops for everyone as more people join. Licence or white-label it for your studio, run club, charity or community group. The tech behind Stretchy Yoga.";

// Read by search and AI tools, so they can match "people-powered pricing",
// "dynamic pricing for events" etc. to Stretchy Social and how to get in touch.
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://stretchy.social/#org",
      name: "Stretchy Social",
      url: "https://stretchy.social",
      logo: "https://stretchy.social/social/stretchy-s-ink.png",
      email: "kimberley@stretchyyoga.co.nz",
      description: DESCRIPTION,
      areaServed: "New Zealand",
      sameAs: ["https://www.stretchyyoga.co.nz", "https://www.instagram.com/stretchy.yoga/"],
      knowsAbout: ["people-powered pricing", "participation pricing", "social pricing", "group pricing", "dynamic pricing for events", "community events", "social movement"],
      contactPoint: { "@type": "ContactPoint", contactType: "sales", email: "kimberley@stretchyyoga.co.nz", availableLanguage: "English" },
    },
    {
      "@type": "SoftwareApplication",
      name: "Stretchy Social",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "https://stretchy.social",
      publisher: { "@id": "https://stretchy.social/#org" },
      description:
        "People-powered pricing engine with events, bookings and payments. Set your costs and a minimum number of people; once it's going ahead, the price drops for everyone with each person who joins. Available to licence or white-label.",
      featureList: ["People-powered (participation) pricing", "Event scheduling and bookings", "Card payments", "Minimum-to-go-ahead and automatic call-off", "White-label and licensing"],
    },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://stretchy.social"),
  title: TITLE,
  description: DESCRIPTION,
  keywords: ["people-powered pricing", "participation pricing", "social pricing", "dynamic pricing for events", "group pricing", "white-label event booking", "community events software", "Stretchy Yoga"],
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      {children}
    </div>
  );
}
