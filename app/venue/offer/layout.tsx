import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offer a Venue",
  description: "A hall, a studio, a rooftop — or a café or bar for the Social Stretch afterwards. Offer your space to Stretchy's community.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
