// HQ lists people A→Z by first name (Kimberley, Oct 2026). Case and accents
// don't matter; anyone without a name sorts by email, after everyone named.
const first = (name?: string | null, _email?: string | null) => {
  const n = (name ?? "").trim();
  // A "name" that's really an email address (first sign-ups) counts as no name.
  return n && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(n) ? n : "";
};

export function byFirstName<T extends { name?: string | null; email?: string | null }>(a: T, b: T): number {
  const an = first(a.name, a.email);
  const bn = first(b.name, b.email);
  if (!an !== !bn) return an ? -1 : 1;
  return (an || a.email || "").localeCompare(bn || b.email || "", "en", { sensitivity: "base" });
}
