import type { Metadata } from "next";
import RateForm from "@/components/RateForm";

// stretchyyoga.co.nz/feedback — the same quick questions, not tied to a
// session. For sending to people directly and for newsletters.
export const metadata: Metadata = { title: "Feedback · Stretchy" };

export default function FeedbackPage() {
  return <RateForm />;
}
