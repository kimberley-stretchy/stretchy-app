import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Stretchy collects, why, who we share it with, and your rights under the NZ Privacy Act 2020.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
