import type { Metadata } from "next";
import RateForm from "@/components/RateForm";

// stretchyyoga.co.nz/feedback — the same quick questions, not tied to a
// session. For sending to people directly and for newsletters, and for
// "How was this email?" in email footers (?msg={emailType}&r=good|not_great).
export const metadata: Metadata = { title: "Feedback · Stretchy" };

export default function FeedbackPage({ searchParams }: { searchParams: { msg?: string; r?: string } }) {
  const msg = typeof searchParams.msg === "string" && /^[a-z0-9_]{2,60}$/.test(searchParams.msg) ? searchParams.msg : undefined;
  const r = searchParams.r === "good" || searchParams.r === "not_great" ? searchParams.r : undefined;
  return <RateForm emailType={msg} rated={r} />;
}
