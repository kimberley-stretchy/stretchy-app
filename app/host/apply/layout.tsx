import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Teach a Stretchy",
  description: "Bring your own style, paid fairly every session — whether the room is full or just full enough. Register your interest to teach with Stretchy.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
