import { createBrowserClient } from "@supabase/ssr";

// ── Browser client (for use in React components / client-side code) ───────────
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ── Subscribe to real-time session price changes ──────────────────────────────
// Call this inside a useEffect in any component that needs live prices.
// The callback fires whenever a session row changes (e.g. current_holds updates).
//
// Usage:
//   const unsub = subscribeToSession(sessionId, (updated) => {
//     setCurrentHolds(updated.current_holds)
//   })
//   return () => unsub()  // cleanup on unmount

export function subscribeToSession(
  sessionId: string,
  onChange: (session: Record<string, unknown>) => void
) {
  const supabase = createClient();

  const channel = supabase
    .channel(`session:${sessionId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "sessions",
        filter: `id=eq.${sessionId}`,
      },
      (payload) => {
        onChange(payload.new);
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    supabase.removeChannel(channel);
  };
}
