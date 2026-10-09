"use client";

import { Fragment, type ReactNode } from "react";
import { AGREEMENT_SECTIONS, type PortalAgreement, type PortalPerson } from "@/lib/portal";

function inline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>
  );
}

// Light markdown: "## heading", "- bullet", "**bold**", blank line = paragraph.
export function Markdown({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) out.push(<ul key={out.length} className="list-disc pl-5 flex flex-col gap-1">{bullets.map((b, i) => <li key={i}>{inline(b)}</li>)}</ul>);
    bullets = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (line.startsWith("- ") || line.startsWith("• ")) { bullets.push(line.slice(2)); continue; }
    flush();
    if (!line) continue;
    if (line.startsWith("## ")) out.push(<h4 key={out.length} className="font-display text-lg leading-tight mt-2">{line.slice(3)}</h4>);
    else out.push(<p key={out.length}>{inline(line)}</p>);
  }
  flush();
  return <div className="flex flex-col gap-2 text-sm leading-relaxed">{out}</div>;
}

// Everyone gets "For everyone"; each role gets its own section. HQ (or no
// role match) sees every section.
export default function AgreementView({ agreement, role, showAll }: { agreement: PortalAgreement; role?: PortalPerson["role"] | null; showAll?: boolean }) {
  const sections = AGREEMENT_SECTIONS.filter((s) => agreement[s.key]?.trim() && (showAll || !s.role || s.role === role));
  return (
    <div className="flex flex-col gap-5">
      {sections.map((s) => (
        <section key={s.key}>
          <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-1.5" style={{ color: "#902F8A" }}>{s.title.toUpperCase()}</div>
          <Markdown text={agreement[s.key]} />
        </section>
      ))}
    </div>
  );
}
