// Newsletter text toolbar. "wrap" puts markers around the selection
// (**bold**, *italic*, __underline__); "line" toggles a prefix on every line
// the selection touches (## heading, - bullet), swapping one for the other.
// Returns the new text and the range to re-select.
export function applyFormat(
  v: string,
  start: number,
  end: number,
  mode: "wrap" | "line",
  marker: string
): { text: string; selStart: number; selEnd: number } {
  if (mode === "wrap") {
    const sel = v.slice(start, end) || "text";
    const text = v.slice(0, start) + marker + sel + marker + v.slice(end);
    const selStart = start + marker.length;
    return { text, selStart, selEnd: selStart + sel.length };
  }
  const from = v.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = v.indexOf("\n", Math.max(end - (end > start && v[end - 1] === "\n" ? 1 : 0), from));
  const to = lineEnd === -1 ? v.length : lineEnd;
  const lines = v.slice(from, to).split("\n");
  const allHave = lines.every((l) => l.startsWith(marker));
  const changed = lines
    .map((l) => (allHave ? l.slice(marker.length) : marker + l.replace(/^(## |- |• )/, "")))
    .join("\n");
  return { text: v.slice(0, from) + changed + v.slice(to), selStart: from, selEnd: from + changed.length };
}
