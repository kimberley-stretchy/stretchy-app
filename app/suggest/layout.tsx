import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Suggest a Stretchy",
  description: "Tell us where you want one — a place, a day, a kind of movement. Outside of Auckland too.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
