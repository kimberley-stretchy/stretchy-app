"use client";

import { useParams } from "next/navigation";
import RateForm from "@/components/RateForm";

// stretchyyoga.co.nz/rate/[session] — quick questions after a session.
export default function RateItPage() {
  const params = useParams<{ id: string }>();
  return <RateForm sessionId={params.id} />;
}
