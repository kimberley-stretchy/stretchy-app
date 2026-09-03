import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Stretchy",
  description: "Questions, feedback, or something else on your mind? Get in touch with Stretchy HQ.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
