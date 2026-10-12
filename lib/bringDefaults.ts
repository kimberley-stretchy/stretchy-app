// What HQ's "Bring with you" lines start as, by movement type, so they rarely
// need typing. HQ can overwrite both. COPY_REFRESH_HANDOVER.md section 6.
export function bringDefaults(movementType?: string | null): { title: string; note: string } {
  const t = (movementType ?? "").toLowerCase();
  if (t === "yoga" || t === "pilates") {
    return { title: "Your mat & water", note: "Plus any props you like, and $$ for coffee after." };
  }
  if (t === "run" || t === "run_club") {
    return { title: "Running shoes & water", note: "And $$ for coffee after." };
  }
  return { title: "Comfy clothes & water", note: "And $$ for the Social Stretch after." };
}
