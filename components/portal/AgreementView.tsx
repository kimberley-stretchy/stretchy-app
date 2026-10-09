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

// Splits a section on "## " headings: any intro text stays visible, each
// heading becomes a concertina item.
function Concertina({ text }: { text: string }) {
  const [intro, ...parts] = text.split(/^## /m);
  return (
    <div className="flex flex-col gap-2">
      {intro.trim() && <Markdown text={intro} />}
      {parts.map((part, i) => {
        const nl = part.indexOf("\n");
        const heading = (nl === -1 ? part : part.slice(0, nl)).trim();
        const body = nl === -1 ? "" : part.slice(nl + 1);
        return (
          <details key={i} className="group border-2 border-ink rounded-xl bg-white overflow-hidden">
            <summary className="flex items-center justify-between gap-3 px-3.5 py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              <span className="font-bold text-sm">{heading}</span>
              <span className="text-lg leading-none transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="px-3.5 pb-3.5 pt-0.5 border-t-2 border-ink/10"><Markdown text={body} /></div>
          </details>
        );
      })}
    </div>
  );
}

// Everyone gets "For everyone"; each role gets its own section. HQ (or no
// role match) sees every section.
export default function AgreementView({ agreement, role, showAll }: { agreement: PortalAgreement; role?: PortalPerson["role"] | null; showAll?: boolean }) {
  const sections = AGREEMENT_SECTIONS.filter((s) => agreement[s.key]?.trim() && (showAll || !s.role || s.role === role));
  return (
    <div className="flex flex-col gap-5">
      {sections.map((s) => (
        <section key={s.key}>
          <div className="font-mono text-[10px] font-extrabold tracking-[0.12em] mb-2" style={{ color: "#902F8A" }}>{s.title.toUpperCase()}</div>
          <Concertina text={agreement[s.key]} />
        </section>
      ))}
    </div>
  );
}
