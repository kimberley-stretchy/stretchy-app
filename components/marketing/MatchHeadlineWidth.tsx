"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Lays out a headline with something underneath it (e.g. a box) and makes
// that something exactly as wide as the headline's longest *rendered* line.
// CSS can't do this on its own: a wrapped heading's box is always the full
// column width, not the width of its longest line. Re-measures on resize and
// once fonts have loaded; before that (or with JS off) the box is full width.
export default function MatchHeadlineWidth({ headline, children }: { headline: ReactNode; children: ReactNode }) {
  const headRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const el = headRef.current;
    if (!el) return;
    const measure = () => {
      // Measure the words themselves: a range around the heading *element*
      // would also report its full-width box.
      const range = document.createRange();
      range.selectNodeContents(el.firstElementChild ?? el);
      const left = el.getBoundingClientRect().left;
      let right = 0;
      for (const r of Array.from(range.getClientRects())) right = Math.max(right, r.right);
      setWidth(right > left ? Math.ceil(right - left) : null);
    };
    measure();
    document.fonts?.ready.then(measure).catch(() => {});
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <>
      <div ref={headRef}>{headline}</div>
      <div style={width ? { width, maxWidth: "100%" } : undefined}>{children}</div>
    </>
  );
}
