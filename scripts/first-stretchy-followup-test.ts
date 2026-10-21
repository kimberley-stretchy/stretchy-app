// Timing rules for the "How was your first Stretchy?" email, and a rendered copy
// to read (docs/follow-up-email/).   npx tsx scripts/first-stretchy-followup-test.ts
import { writeFileSync } from "fs";
import { followUpDue } from "../lib/firstStretchyFollowUp";
import { renderAttendeeEmail } from "../lib/attendeeEmailTemplates";

let fail = 0;
const check = (name: string, ok: boolean) => { console.log(`${ok ? "ok  " : "FAIL"} ${name}`); if (!ok) fail++; };
const START = "2026-10-22T17:15:00Z"; // Fri 23 Oct, 6:15am Auckland
const at = (iso: string) => followUpDue(START, new Date(iso));

check("the same day → not yet", !at("2026-10-23T02:00:00Z"));
check("Sat midday → not yet (under two days)", !at("2026-10-23T23:00:00Z"));
check("Sun 6:15am, exactly two days on → too early in the day", !at("2026-10-24T17:15:00Z"));
check("Sun 8:45am → still too early", !at("2026-10-24T19:45:00Z"));
check("Sun 9:00am → send", at("2026-10-24T20:00:00Z"));
check("Sun 6:59pm → still fine", at("2026-10-25T05:59:00Z"));
check("Sun 7:00pm → wait for tomorrow", !at("2026-10-25T06:00:00Z"));
check("a week and a bit later → too late, never sent", !at("2026-10-31T21:00:00Z"));

const e = renderAttendeeEmail("first_stretchy_followup", { to: "you@example.com", name: "Amelia", sessionTitle: "Herne Bay | Morning", date: "", sessionId: "preview" });
writeFileSync("docs/follow-up-email/how-was-your-first-stretchy.html", e.html);
check(`renders: "${e.subject}"`, e.html.includes("/suggest") && e.html.includes("tell ya mates") && e.html.includes("/rate/preview") && e.html.includes("Rate it quick-smart"));
console.log(fail ? `\n${fail} FAILED` : "\nall passed");
process.exit(fail ? 1 : 0);
