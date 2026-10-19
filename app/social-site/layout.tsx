import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "stretchy.social — run your community the Stretchy way",
  description: "The booking, people-powered pricing and on-the-day tools behind Stretchy Yoga, for your classes, teachers, venues and organisation.",
};

export default function SocialSiteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
