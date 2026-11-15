// "Paid" ticks on a session's payees (HQ → Session money). Stored on the
// session's own cost_lines as paidAt on each line, so no extra table or column.
// A tick is set by HQ (Save) or automatically when a remittance is sent.

export type CostLine = { role: string; name: string; amount: number; paidAt?: string | null };

/** Set or clear paidAt on the lines at these positions. Other lines untouched. */
export function withPaid(lines: CostLine[], changes: Record<number, boolean>, when = new Date().toISOString()): CostLine[] {
  return lines.map((l, i) => {
    if (!(i in changes)) return l;
    if (changes[i]) return { ...l, paidAt: l.paidAt || when };
    const { paidAt: _drop, ...rest } = l;
    return rest;
  });
}

/** Editing a session rewrites its cost lines: carry each line's paid tick over
 *  (matched by role + name) so an edit never quietly un-ticks someone. */
export function keepPaid(next: CostLine[], before: CostLine[]): CostLine[] {
  const paid = new Map(before.filter((l) => l.paidAt).map((l) => [`${l.role}|${l.name}`, l.paidAt]));
  return next.map((l) => (l.paidAt || !paid.has(`${l.role}|${l.name}`) ? l : { ...l, paidAt: paid.get(`${l.role}|${l.name}`) }));
}
