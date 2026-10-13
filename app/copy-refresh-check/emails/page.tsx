import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { buildAttendeeEmail, type AttendeeEmailPayload, type AttendeeEmailType } from "@/lib/stretchy-email";
import { buildSessionEmailExtras } from "@/lib/sessionEmailContext";

// ─────────────────────────────────────────────────────────────────────────────
// TEMPORARY — copy refresh sign-off page for the emails. Renders every attendee
// email from fixed example data, exactly as it would be sent, without sending
// anything. DELETE THIS FOLDER before the branch is merged (handover section 10).
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = { title: "Copy refresh · emails", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic"; // "now" decides before / after 36 hrs

const HOUR = 60 * 60 * 1000;
// Rounded to the quarter hour so the example times read like real session times.
const iso = (hoursFromNow: number) => new Date(Math.round((Date.now() + hoursFromNow * HOUR) / (15 * 60 * 1000)) * 15 * 60 * 1000).toISOString();

// A morning session a week away (more than 36 hrs out) and one tomorrow (inside 36 hrs).
function base(hoursOut: number, over: Partial<AttendeeEmailPayload> = {}): AttendeeEmailPayload {
  return {
    to: "sam@example.com",
    name: "Sam",
    sessionTitle: "Herne Bay | Morning",
    date: "",
    sessionId: "example",
    venue: "Bayfield Primary School Hall",
    locationAddress: "Corner of Jervois Road & Clifton Road, Herne Bay, Auckland",
    directions: "Easiest parking is on Jervois Road. Enter through the gate on that side.",
    socialStretchVenue: "Honey Sundays · café",
    teacherName: "Gamo Farani Tomlin",
    gemName: "Esmay",
    styleLine: "Vinyasa yoga",
    level: "all levels",
    bringTitle: "Your mat & water",
    bringNote: "Plus any props you like, and $$ for coffee after.",
    startsAt: iso(hoursOut),
    durationMins: 60,
    minAttendees: 14,
    maxAttendees: 30,
    held: 4,
    costBase: 199.49,
    revenueTarget: 120,
    sessionState: "open",
    spots: 1,
    ...over,
  };
}
const FAR = 24 * 8;  // 8 days out
const NEAR = 20;     // 20 hours out — inside 36 hrs

const EXAMPLES: { n: string; note?: string; type: AttendeeEmailType; p: AttendeeEmailPayload }[] = [
  { n: "1 · Place held (more than 36 hrs out)", type: "hold_confirmed", p: base(FAR) },
  { n: "1c · Place held · holding 3 places", type: "hold_confirmed", p: base(FAR, { spots: 3, held: 6 }) },
  { n: "1b · You’re in (joined 36 → 2 hrs out)", note: "No free cancelling offered.", type: "hold_confirmed", p: base(NEAR, { held: 17, sessionState: "confirmed" }) },
  { n: "2 · So close (to people holding)", type: "almost_there", p: base(38, { held: 10, needed: 4, isHolder: true }) },
  { n: "3 · Could it be you? (people who tapped ♡)", type: "almost_there", p: base(38, { held: 10, needed: 4, isHolder: false }) },
  { n: "4 · It’s going ahead (36 hrs out)", type: "session_going_ahead", p: base(35.9, { held: 14, sessionState: "confirmed" }) },
  { n: "5 · Still room (after 36 hrs, interested people)", type: "session_confirmed_open", p: base(30, { held: 16, sessionState: "confirmed" }) },
  { n: "6 · Your final price (2 hrs out)", type: "price_locked", p: base(2, { attendeeCount: 18, unitPriceCents: 1775, sessionState: "locked" }) },
  { n: "6b · Your final price · holding 3 places", type: "price_locked", p: base(2, { attendeeCount: 18, unitPriceCents: 1775, spots: 3, sessionState: "locked" }) },
  { n: "7 · Not this time (36 hrs out)", type: "session_cancelled", p: base(35.9, { attendeeCount: 9, sessionState: "cancelled" }) },
  { n: "7 · Not this time (called off by HQ)", note: "Sent when HQ cancels a session by hand.", type: "session_cancelled", p: base(FAR, { calledOffByHQ: true, sessionState: "cancelled" }) },
  { n: "8 · Hold cancelled (by you)", type: "hold_cancelled", p: base(FAR, { cancelledSpots: 1, remainingSpots: 0 }) },
  { n: "8 · Booking updated (some places cancelled)", note: "Not in the mock: sent when someone cancels some of their places.", type: "hold_cancelled", p: base(FAR, { cancelledSpots: 1, remainingSpots: 2 }) },
  { n: "9 · A place on us (HQ comp)", type: "comp_hold_confirmed", p: base(FAR, { isComp: true, newAccount: true }) },
  { n: "10 · Your card didn’t go through", note: "New: sent when a booking attempt fails at the card step. HQ gets an alert at the same time.", type: "booking_card_failed", p: base(FAR, { declineReason: "Your bank told us there weren’t enough funds available." }) },
  { n: "Evening session · place held", note: "Times and “tonight” follow the session.", type: "hold_confirmed", p: base(FAR + 12.5, { sessionTitle: "Ponsonby | Evening", venue: "Johnny Mitchell Hall", locationAddress: "20 Ponsonby Terrace, Ponsonby, Auckland 1011", directions: "Street parking on Ponsonby Terrace.", socialStretchVenue: "Freida Margolis · bar", gemName: undefined, styleLine: "Yin yoga", level: "beginners welcome" }) },
];

// ?session=<id> — draw the emails from a REAL session's details instead of the
// examples (read-only: nothing is sent or changed). A dry run of exactly what the
// automated jobs will send for that session.
async function realFacts(sessionId: string): Promise<Partial<AttendeeEmailPayload> | null> {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    global: { fetch: (u, o) => fetch(u, { ...o, cache: "no-store" }) },
  });
  const { data: session } = await admin
    .from("sessions")
    .select("title, host_id, gem_host_id, movement_type, duration_mins, getting_there, venue_instagram, social_venue_instagram, location_name, social_stretch_venue")
    .eq("id", sessionId)
    .maybeSingle();
  if (!session) return null;
  return {
    sessionTitle: session.title,
    sessionId,
    venue: session.location_name ?? undefined,
    socialStretchVenue: session.social_stretch_venue ?? undefined,
    ...(await buildSessionEmailExtras(admin, session, sessionId)),
  };
}

export default async function CopyRefreshEmailsPage({ searchParams }: { searchParams: { session?: string } }) {
  const real = searchParams.session ? await realFacts(searchParams.session) : null;
  const blank: Partial<AttendeeEmailPayload> = { teacherName: undefined, gemName: undefined, styleLine: undefined, level: undefined, bringTitle: undefined, bringNote: undefined, directions: undefined, locationAddress: undefined, socialStretchVenue: undefined };
  const EMAILS = real
    ? EXAMPLES.filter((e) => !e.n.startsWith("Evening")).map((e) => ({
        ...e,
        // Keep the example's scenario (who it's for, how many places) but take
        // every session detail from the real session.
        p: { ...e.p, ...blank, ...real, ...(e.p.attendeeCount != null ? { attendeeCount: e.p.attendeeCount } : {}) },
      }))
    : EXAMPLES;
  return (
    <main className="min-h-screen bg-cream text-ink px-4 py-8">
      <div className="max-w-[1180px] mx-auto flex flex-col gap-8">
        <div className="max-w-[680px]">
          <p className="font-mono text-[10px] font-extrabold tracking-[0.14em] text-purple m-0">COPY REFRESH · TEMPORARY SIGN-OFF PAGE</p>
          <h1 className="font-display text-[34px] leading-[.95] mt-2 mb-0">The emails</h1>
          <p className="text-sm text-ink/70 leading-relaxed mt-2 mb-0">
            Every attendee email, drawn from example data exactly as it would be sent. Nothing is sent from this page.
            Dates here are relative to today, so the “more than 36 hours out” and “inside 36 hours” versions both show.
          </p>
          {real && (
            <p className="text-sm font-bold mt-2 mb-0">
              Dry run from the real session “{real.sessionTitle}”: every detail below is read from it. Nothing is sent.
            </p>
          )}
        </div>

        <div className="grid gap-8 md:grid-cols-2 items-start">
          {EMAILS.map(({ n, note, type, p }) => {
            const { subject, html } = buildAttendeeEmail(type, p);
            return (
              <section key={n} className="flex flex-col gap-2">
                <p className="m-0 font-mono text-[10px] font-extrabold tracking-[0.12em] uppercase text-purple">{n}</p>
                <div className="border-2 border-ink rounded-[18px] overflow-hidden bg-white shadow-[4px_4px_0_#14110F]">
                  <div className="px-4 py-2.5 border-b-2 border-ink text-xs">
                    <span className="text-ink/50">Subject </span>
                    <strong className="text-sm">{subject}</strong>
                  </div>
                  <iframe title={n} srcDoc={html} className="block w-full" style={{ height: 760, border: 0 }} />
                </div>
                {note && <p className="m-0 text-xs text-ink/60 leading-relaxed">{note}</p>}
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
