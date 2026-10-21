import type { Metadata } from "next";
import ResearchSurvey from "./ResearchSurvey";

// stretchy.social/research — see ResearchSurvey.tsx.
export const metadata: Metadata = {
  title: "Help shape Stretchy Social — a short survey",
  description: "Early-stage research on how communities run, book and pay for their gatherings. 3–5 minutes, anonymous if you like.",
  alternates: { canonical: "/research" },
  openGraph: { title: "Help shape Stretchy Social", description: "A 3–5 minute survey on how you run, book and pay for your gatherings.", url: "https://stretchy.social/research", siteName: "Stretchy Social" },
};

export default function ResearchPage() {
  return <ResearchSurvey />;
}
