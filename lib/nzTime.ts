// Turn an Auckland wall-clock date + time ("2026-10-23", "06:15") into a UTC
// ISO string, getting daylight saving right (+13 Sep–Apr, +12 otherwise).
// Works the same in the browser and on the server, whatever their own zone.
export function nzLocalToISO(date: string, time: string): string {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, mi] = time.split(":").map(Number);
  const wallAsUTC = Date.UTC(y, mo - 1, d, h, mi);

  const offsetAt = (utcMs: number) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Pacific/Auckland",
      hourCycle: "h23",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    }).formatToParts(new Date(utcMs));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    return Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute")) - utcMs;
  };

  // Guess with the offset at the wall time, then correct once in case the
  // guess landed on the other side of a daylight-saving switch.
  let utc = wallAsUTC - offsetAt(wallAsUTC);
  utc = wallAsUTC - offsetAt(utc);
  return new Date(utc).toISOString();
}
