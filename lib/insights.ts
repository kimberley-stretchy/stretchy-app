// HQ → Insights: attendance, new vs returning people, retention and year on
// year, worked out from every session that has run and its bookings.
// Pure functions (no database) so the numbers are easy to test.
//
// What counts:
//   a session  — not a draft, not cancelled, already started, no "TEST" in the title
//   a booking  — held or charged (released and refunded ones don't count)
//   a person   — one account (user_id); a booking for 3 is 3 places, 1 person
//   location   — the title before "|" (and before " - "), e.g. "Herne Bay"

export type InsightSession = { id: string; title: string; starts_at: string; state: string; is_draft?: boolean | null };
export type InsightHold = { session_id: string; user_id: string | null; quantity: number | null; is_comp?: boolean | null; checked_in_at?: string | null };

const NZ = "Pacific/Auckland";
const DAY = 24 * 60 * 60 * 1000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function nzYearMonth(iso: string): { year: number; month: number } {
  const [y, m] = new Date(iso).toLocaleDateString("en-CA", { timeZone: NZ }).split("-").map(Number);
  return { year: y, month: m };
}

export function locationOf(title: string): string {
  return (title.split("|")[0].split(" - ")[0] || title).trim();
}

export type MonthRow = { key: string; label: string; sessions: number; places: number; people: number; newPeople: number; returning: number; checkedIn: number; onUs: number };
export type LocationRow = { location: string; sessions: number; places: number; perSession: number; people: number };
export type Retention = { people: number; avgSessions: number; regulars: number; back4w: { eligible: number; came: number }; back3m: { eligible: number; came: number } };
export type Insights = {
  totals: { sessions: number; places: number; people: number; checkedIn: number; onUs: number; firstSession: string | null };
  months: MonthRow[];
  locations: LocationRow[];
  retention: Retention;
  yearOnYear: { years: number[]; rows: { month: string; places: Record<number, number> }[] };
};

export function computeInsights(sessionsIn: InsightSession[], holdsIn: InsightHold[], now = new Date()): Insights {
  const sessions = sessionsIn
    .filter((s) => !s.is_draft && s.state !== "cancelled" && new Date(s.starts_at) < now && !/test/i.test(s.title))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const byId = new Map(sessions.map((s) => [s.id, s]));
  const holds = holdsIn.filter((h) => byId.has(h.session_id));
  const qty = (h: InsightHold) => h.quantity ?? 1;

  // Each person's session dates, in order.
  const visits = new Map<string, number[]>();
  for (const h of holds) {
    if (!h.user_id) continue;
    const t = new Date(byId.get(h.session_id)!.starts_at).getTime();
    const list = visits.get(h.user_id) ?? [];
    list.push(t);
    visits.set(h.user_id, list);
  }
  visits.forEach((l) => l.sort((a, b) => a - b));
  const firstSeen = new Map(Array.from(visits.entries()).map(([u, l]) => [u, l[0]]));

  // Months
  const months = new Map<string, MonthRow & { ppl: Set<string>; fresh: Set<string> }>();
  for (const s of sessions) {
    const { year, month } = nzYearMonth(s.starts_at);
    const key = `${year}-${String(month).padStart(2, "0")}`;
    if (!months.has(key)) months.set(key, { key, label: `${MONTHS[month - 1]} ${year}`, sessions: 0, places: 0, people: 0, newPeople: 0, returning: 0, checkedIn: 0, onUs: 0, ppl: new Set(), fresh: new Set() });
    months.get(key)!.sessions += 1;
  }
  for (const h of holds) {
    const s = byId.get(h.session_id)!;
    const { year, month } = nzYearMonth(s.starts_at);
    const m = months.get(`${year}-${String(month).padStart(2, "0")}`)!;
    m.places += qty(h);
    if (h.is_comp) m.onUs += qty(h);
    if (h.checked_in_at) m.checkedIn += qty(h);
    if (h.user_id) {
      m.ppl.add(h.user_id);
      if (firstSeen.get(h.user_id) === new Date(s.starts_at).getTime()) m.fresh.add(h.user_id);
    }
  }
  const monthRows: MonthRow[] = Array.from(months.values())
    .map(({ ppl, fresh, ...m }) => ({ ...m, people: ppl.size, newPeople: fresh.size, returning: ppl.size - fresh.size }))
    .sort((a, b) => b.key.localeCompare(a.key));

  // Locations
  const locs = new Map<string, { sessions: number; places: number; ppl: Set<string> }>();
  for (const s of sessions) {
    const k = locationOf(s.title);
    if (!locs.has(k)) locs.set(k, { sessions: 0, places: 0, ppl: new Set() });
    locs.get(k)!.sessions += 1;
  }
  for (const h of holds) {
    const l = locs.get(locationOf(byId.get(h.session_id)!.title))!;
    l.places += qty(h);
    if (h.user_id) l.ppl.add(h.user_id);
  }
  const locationRows = Array.from(locs.entries())
    .map(([location, l]) => ({ location, sessions: l.sessions, places: l.places, perSession: l.sessions ? Math.round((l.places / l.sessions) * 10) / 10 : 0, people: l.ppl.size }))
    .sort((a, b) => b.places - a.places);

  // Retention: only people whose first session was long enough ago to judge.
  const nowMs = now.getTime();
  const backWithin = (days: number) => {
    let eligible = 0, came = 0;
    visits.forEach((l) => {
      if (nowMs - l[0] < days * DAY) return;
      eligible += 1;
      if (l.some((t) => t > l[0] && t - l[0] <= days * DAY)) came += 1;
    });
    return { eligible, came };
  };
  const counts = Array.from(visits.values()).map((l) => l.length);
  const retention: Retention = {
    people: visits.size,
    avgSessions: counts.length ? Math.round((counts.reduce((a, b) => a + b, 0) / counts.length) * 10) / 10 : 0,
    regulars: counts.filter((n) => n >= 3).length,
    back4w: backWithin(28),
    back3m: backWithin(90),
  };

  // Year on year: places per calendar month, one column per year.
  const years = Array.from(new Set(monthRows.map((m) => Number(m.key.slice(0, 4))))).sort();
  const yoy = MONTHS.map((month, i) => {
    const places: Record<number, number> = {};
    for (const y of years) places[y] = monthRows.find((m) => m.key === `${y}-${String(i + 1).padStart(2, "0")}`)?.places ?? 0;
    return { month, places };
  });

  const allPlaces = holds.reduce((n, h) => n + qty(h), 0);
  return {
    totals: {
      sessions: sessions.length,
      places: allPlaces,
      people: visits.size,
      checkedIn: holds.filter((h) => h.checked_in_at).reduce((n, h) => n + qty(h), 0),
      onUs: holds.filter((h) => h.is_comp).reduce((n, h) => n + qty(h), 0),
      firstSession: sessions[0]?.starts_at ?? null,
    },
    months: monthRows,
    locations: locationRows,
    retention,
    yearOnYear: { years, rows: yoy },
  };
}
