// The venue emails and their calendar holds, checked and written to
// docs/venue-emails/ to read.   npx tsx scripts/venue-invite-test.ts
import { writeFileSync } from "fs";
import { venuePart, renderVenueHold, renderVenueUpdate } from "../lib/notifyVenue";
import { buildIcsContent } from "../lib/calendar";

let fail = 0;
const check = (name: string, ok: boolean, extra = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${name} ${extra}`); if (!ok) fail++; };

const s = {
  id: "abc", title: "Herne Bay | Morning", description: "Vinyasa · all levels", state: "open",
  starts_at: "2026-10-22T17:15:00Z", ends_at: "2026-10-22T18:15:00Z", duration_mins: 60,
  location_name: "Bayfield Primary School Hall", location_address: "Corner of Jervois Road & Clifton Road, Herne Bay, Auckland",
  social_stretch_venue: "Honey Sundays · café", min_attendees: 14, max_attendees: 30,
};

const yoga = venuePart(s, "venue");
const social = venuePart(s, "social");
check("yoga venue is held for the class itself", yoga.when === "Fri 23 Oct, 6:15am–7:15am", `(${yoga.when})`);
check("Social Stretch venue is held for the hour after", social.when === "Fri 23 Oct, 7:15am–8:15am", `(${social.when})`);
check("each hold names its own place", yoga.event.location.startsWith("Bayfield") && social.event.location === "Honey Sundays");
check("the two holds are separate calendar entries", yoga.event.uid !== social.event.uid);
const ics = buildIcsContent(social.event);
check("calendar file has the right start and end", ics.includes("DTSTART:20261022T181500Z") && ics.includes("DTEND:20261022T191500Z"));

const hold = renderVenueHold(s, "venue", 6);
check("before 36 hrs it says pencilled in, and that we confirm either way", hold.subject.startsWith("Pencilled in") && hold.html.includes("36 hours before"));
const late = renderVenueHold({ ...s, state: "confirmed" }, "social", 15);
check("added after it's confirmed → says going ahead, with numbers", late.subject.startsWith("Going ahead") && late.html.includes("15 booked so far"));
const on = renderVenueUpdate(s, "social", "confirmed", 16);
check("36 hrs out, going ahead → numbers so far", on.html.includes("16 booked so far"));
const off = renderVenueUpdate(s, "venue", "cancelled", 9);
check("called off → asks them to release the hold, no numbers", off.subject.startsWith("Called off") && off.html.includes("release the hold") && !off.html.includes("booked so far"));

writeFileSync("docs/venue-emails/1-yoga-venue-pencilled-in.html", hold.html);
writeFileSync("docs/venue-emails/2-social-venue-pencilled-in.html", renderVenueHold(s, "social", 6).html);
writeFileSync("docs/venue-emails/3-going-ahead.html", on.html);
writeFileSync("docs/venue-emails/4-called-off.html", off.html);
console.log(fail ? `\n${fail} FAILED` : "\nall passed");
process.exit(fail ? 1 : 0);
