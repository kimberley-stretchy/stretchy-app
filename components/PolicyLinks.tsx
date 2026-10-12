// "How it works ↗ · Cancellation policy ↗" — the two links that sit under
// booking screens. Both ALWAYS open in a new tab so nobody loses their place
// mid-booking (COPY_REFRESH_HANDOVER.md section 1, "Links").
export const HOW_IT_WORKS_HREF = "/#how-it-works";
export const CANCELLATION_POLICY_HREF = "/terms#cancellation";

export function NewTabLink({
  href,
  children,
  className = "underline underline-offset-2",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children} <span aria-hidden>↗</span>
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export default function PolicyLinks({ className = "text-sm text-ink/60" }: { className?: string }) {
  return (
    <p className={className}>
      <NewTabLink href={HOW_IT_WORKS_HREF}>How it works</NewTabLink>
      <span aria-hidden> · </span>
      <NewTabLink href={CANCELLATION_POLICY_HREF}>Cancellation policy</NewTabLink>
    </p>
  );
}
