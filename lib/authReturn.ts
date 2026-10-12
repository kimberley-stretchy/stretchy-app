// Remembering where someone was headed when they went off to sign in.
//
// The sign-in link normally carries this in its address (?next=/sessions/…).
// But if the sign-in service doesn't recognise that address it falls back to
// the site's home page and the destination is lost — the person lands on the
// homepage instead of back on the session they were trying to book. Keeping a
// copy in the browser means we can still take them there.
// Browser-only; every call is safe if storage is unavailable.

const KEY = "stretchy-auth-next";
const MAX_AGE_MS = 30 * 60 * 1000; // a sign-in started more than 30 min ago is stale

/** Only ever return to a path on this site — never an outside address. */
function safePath(next: unknown): string | null {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export function rememberNext(next: string): void {
  const path = safePath(next);
  if (!path) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ next: path, at: Date.now() }));
  } catch {
    // ignore
  }
}

/** Read the remembered destination, if there's a fresh one. Doesn't clear it. */
export function peekNext(): string | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { next, at } = JSON.parse(raw) as { next?: unknown; at?: number };
    if (!at || Date.now() - at > MAX_AGE_MS) return null;
    return safePath(next);
  } catch {
    return null;
  }
}

/** Read and clear. */
export function takeNext(): string | null {
  const next = peekNext();
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  return next;
}
