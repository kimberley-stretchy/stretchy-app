import type { Metadata } from "next";
import AustraliaWaitlist from "./AustraliaWaitlist";

// stretchyyoga.co.nz/australia — see AustraliaWaitlist.tsx.
export const metadata: Metadata = {
  title: "Stretchy Sydney — join the waitlist",
  description: "Community yoga in Sydney where the price drops as more people join, then a Social Stretch after. Launching soon. Join the waitlist.",
  alternates: { canonical: "/australia" },
  openGraph: { title: "Stretchy is coming to Sydney 🇦🇺", description: "Launching soon (yes, this side of summer!). Join the Sydney waitlist.", url: "/australia", locale: "en_AU" },
};

export default function AustraliaPage() {
  return <AustraliaWaitlist />;
}
