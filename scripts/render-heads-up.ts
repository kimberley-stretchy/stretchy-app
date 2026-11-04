// Renders the "It's on" heads-up from the real schedule to docs/heads-up-emails/
// for review, and shows which sessions each suggestion matches. Sends nothing.
//   set -a; . ./.env.local; set +a; npx tsx scripts/render-heads-up.ts
import { writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { upcomingGroups, matchGroup, renderHeadsUp } from "@/lib/suggestionHeadsUp";

(async () => {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const groups = await upcomingGroups(admin);
  for (const g of groups) {
    const { subject, html } = renderHeadsUp(g, "Sam Example");
    writeFileSync(`docs/heads-up-emails/${g.key}.html`, `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title><body style="margin:0">${html}</body>`);
    console.log(`${g.key}: ${subject}`);
  }
  const { data } = await admin.from("suggestions").select("preferred_neighbourhood, preferred_time, vote_count").order("vote_count", { ascending: false });
  for (const s of data ?? []) console.log(`${s.vote_count} votes | ${s.preferred_neighbourhood} · ${s.preferred_time} → ${matchGroup(s.preferred_neighbourhood, s.preferred_time, groups) ?? "(none yet)"}`);
})();
