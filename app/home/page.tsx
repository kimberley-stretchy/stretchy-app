"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// /home is the old attendee landing — redirect to sessions (the real app entry point)
// The host app will have its own route in Phase 2
export default function HomePage() {
  const router = useRouter();
  useEffect(() => { router.replace("/sessions"); }, [router]);
  return null;
}
