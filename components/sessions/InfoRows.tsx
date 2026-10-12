// Shared row layout for the session page and Manage my booking: a mono label
// on the left; a bold value with a grey second line on the right; 2px rules
// between rows. No emojis, no boxes. COPY_REFRESH_HANDOVER.md sections 4–5.

export type InfoRow = {
  label: string;
  /** Label colour (hex). Ignored when the whole block is grey. */
  color?: string;
  bold: React.ReactNode;
  grey?: React.ReactNode;
};

export default function InfoRows({
  rows,
  tone = "normal",
  ruleColor = "#E1D5C6",
  labelWidth = 84,
  closed = false,
}: {
  rows: (InfoRow | null | false | undefined)[];
  /** "grey" = labels and both lines at ink 60% (the timing rows). */
  tone?: "normal" | "grey";
  /** Divider colour — sand on cream, ink on the yellow booking page. */
  ruleColor?: string;
  labelWidth?: number;
  /** Draw a rule under the last row too. */
  closed?: boolean;
}) {
  const shown = rows.filter(Boolean) as InfoRow[];
  if (shown.length === 0) return null;
  const grey = tone === "grey";
  const muted = "rgba(20,17,15,.6)";

  return (
    <div style={{ borderTop: `2px solid ${ruleColor}`, borderBottom: closed ? `2px solid ${ruleColor}` : undefined }}>
      {shown.map((r, i) => (
        <div
          key={`${r.label}-${i}`}
          className="grid gap-[10px] py-[10px]"
          style={{
            gridTemplateColumns: `${labelWidth}px minmax(0,1fr)`,
            borderTop: i === 0 ? undefined : `2px solid ${ruleColor}`,
          }}
        >
          <p
            className="m-0 font-mono text-[10px] font-extrabold tracking-[0.08em] uppercase pt-[3px] leading-[1.3]"
            style={{ color: grey ? muted : r.color ?? "#14110F" }}
          >
            {r.label}
          </p>
          <div className="text-[14px] leading-[1.35] min-w-0">
            <p className="m-0 font-bold" style={grey ? { color: muted } : undefined}>{r.bold}</p>
            {r.grey && <p className="m-0 text-[13px]" style={{ color: muted }}>{r.grey}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
