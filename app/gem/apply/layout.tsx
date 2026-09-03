import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Become a Good Energy Manager",
  description: "No qualifications needed, just good energy. Greet people, check them in, and make sure nobody stands on their own at the Social Stretch.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
