// Read-only: who each upcoming session's venue emails would go to. Sends nothing.
//   set -a; . ./.env.local; set +a; npx tsx scripts/venue-dry-run.ts
import { createClient } from "@supabase/supabase-js";
import { previewVenueRecipients, VENUE_HOLD_DAYS_AHEAD } from "../lib/notifyVenue";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const dom = (e: string | null) => (e ? `…@${e.split("@")[1]}` : "none");
(async () => {
  const now = new Date();
  const { data } = await admin.from("sessions").select("id, title, starts_at").in("state", ["open", "confirmed"]).not("is_draft", "is", true).gt("starts_at", now.toISOString()).order("starts_at").limit(20);
  for (const s of data ?? []) {
    const r = await previewVenueRecipients(admin, s.id);
    const soon = new Date(s.starts_at).getTime() - now.getTime() <= VENUE_HOLD_DAYS_AHEAD * 86400000;
    console.log(`${s.starts_at.slice(0, 10)} ${s.title.padEnd(22)} ${soon ? "→ on release" : "  later     "} yoga: ${dom(r!.venue)}  social: ${dom(r!.social)}`);
  }
})();
