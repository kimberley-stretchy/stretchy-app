// Writes the three "card couldn't be confirmed" emails to docs/option-c-emails/
// so they can be read before anything is sent.  npx tsx scripts/render-card-emails.ts
import { writeFileSync } from "fs";
import { renderAttendeeEmail } from "../lib/attendeeEmailTemplates";

const base = { to: "you@example.com", name: "Kimberley", sessionTitle: "Herne Bay | Morning", date: "", sessionId: "preview", spots: 1 };
const out = [
  ["1-couldnt-confirm", renderAttendeeEmail("card_confirm_failed", { ...base, declineReason: "Your bank told us there weren’t enough funds available.", cardDeadline: "Thu 22 Oct, 6:15pm" })],
  ["2-reminder", renderAttendeeEmail("card_confirm_reminder", { ...base, cardDeadline: "Thu 22 Oct, 6:15pm" })],
  ["3-place-released", renderAttendeeEmail("card_place_released", base)],
] as const;
for (const [name, e] of out) {
  writeFileSync(`docs/option-c-emails/${name}.html`, e.html);
  console.log(`${name}: ${e.subject}`);
}
