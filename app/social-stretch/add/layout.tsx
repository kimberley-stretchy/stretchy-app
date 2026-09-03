import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add a Social Stretch",
  description: "Got a good spot for after? Tell us where the room should end up — a café, a bar, a patch of grass.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
