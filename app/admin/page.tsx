"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// /admin is legacy — it used to list ADM-01..09 mock screens built before the
// Stretchy HQ redesign (fake numbers, never wired to real data, old dark-card
// style). Sessions/Money/People under HQShell are the real system now.
export default function AdminHomePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/sessions");
  }, [router]);
  return null;
}
