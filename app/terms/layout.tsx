import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "How payment, cancellation, and hosting work at Stretchy.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
