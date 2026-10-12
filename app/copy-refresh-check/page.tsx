import type { Metadata } from "next";
import SessionView, { type SessionViewData } from "@/components/sessions/SessionView";
import BookingView, { type BookingSession } from "@/components/sessions/BookingView";
import { cancelLabel } from "@/lib/places";

// ─────────────────────────────────────────────────────────────────────────────
// TEMPORARY — copy refresh sign-off page. Shows the new session page and
// Manage my booking in states that can't easily be reached with real bookings
// (inside 36 hours, holding 3 places, an evening session). Uses fixed example
// data only: it never reads or writes the database, and its buttons do nothing.
// DELETE THIS FOLDER before the branch is merged (handover section 10).
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = { title: "Copy refresh check", robots: { index: false, follow: false } };

const MORNING: BookingSession & SessionViewData = {
  id: "example-morning",
  title: "Herne Bay | Morning",
  description: "Vinyasa · all levels",
  movement_type: "yoga",
  starts_at: "2026-10-22T17:15:00Z", // Fri 23 Oct, 6:15am
  ends_at: "2026-10-22T18:15:00Z",
  duration_mins: 60,
  location_name: "Bayfield Primary School Hall",
  location_address: "Corner of Jervois Road & Clifton Road, Herne Bay, Auckland",
  getting_there: "Easiest parking is on Jervois Road — enter through the gate on that side.",
  cost_base: 199.49,
  revenue_target: 120,
  min_attendees: 14,
  max_attendees: 30,
  current_holds: 4,
  state: "open",
  social_stretch_venue: "Honey Sundays · café",
  social_stretch_note: null,
  what_to_bring: [],
  bring_title: "Your mat & water",
  bring_note: "Plus any props you like, and $$ for coffee after.",
  teacherName: "Gamo Farani Tomlin",
  gemName: "Esmay",
};

const EVENING: BookingSession & SessionViewData = {
  ...MORNING,
  id: "example-evening",
  title: "Ponsonby | Evening",
  description: "Yin · beginners welcome",
  starts_at: "2026-10-29T05:45:00Z", // Thu 29 Oct, 6:45pm
  ends_at: "2026-10-29T06:45:00Z",
  location_name: "Johnny Mitchell Hall",
  location_address: "20 Ponsonby Terrace, Ponsonby, Auckland 1011",
  getting_there: "Street parking on Ponsonby Terrace.",
  social_stretch_venue: "Freida Margolis · bar",
  current_holds: 9,
  gemName: null,
};

// Local copies: this page is a server component, and plain values can't be
// imported from the client-side BookingView file.
const bookingButton = "block w-full text-center rounded-pill py-[13px] px-[18px] font-bold text-[15px]";
const BOOKING_INK = "#14110F";

const BEFORE = new Date("2026-10-13T00:00:00Z");
const BETWEEN = new Date("2026-10-22T00:00:00Z"); // Thu 22 Oct, 1pm — inside 36 hrs

function Frame({ label, note, children }: { label: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <p className="m-0 font-mono text-[10px] font-extrabold tracking-[0.12em] uppercase text-purple">{label}</p>
      <div className="border-2 border-ink rounded-[26px] overflow-hidden bg-cream shadow-[4px_4px_0_#14110F]">{children}</div>
      {note && <p className="m-0 text-xs text-ink/60 leading-relaxed">{note}</p>}
    </section>
  );
}

const ExampleHold = () => (
  <span className={bookingButton} style={{ background: "#14110F", color: "#F7F0E8" }}>Hold my place</span>
);
const ExampleCancel = ({ n }: { n: number }) => (
  <span className={`${bookingButton} border-2 border-dashed`} style={{ borderColor: BOOKING_INK }}>{cancelLabel(n)}</span>
);

export default function CopyRefreshCheckPage() {
  return (
    <main className="min-h-screen bg-cream text-ink px-4 py-8">
      <div className="max-w-[1100px] mx-auto flex flex-col gap-8">
        <div className="max-w-[640px]">
          <p className="font-mono text-[10px] font-extrabold tracking-[0.14em] text-purple m-0">COPY REFRESH · TEMPORARY SIGN-OFF PAGE</p>
          <h1 className="font-display text-[34px] leading-[.95] mt-2 mb-0">Session page &amp; Manage my booking</h1>
          <p className="text-sm text-ink/70 leading-relaxed mt-2 mb-0">
            Example sessions only. Nothing here reads or changes real bookings, and the Hold and Cancel buttons are for show.
            These are the states you can&rsquo;t easily reach with a real booking.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 items-start">
          <Frame label="Session page · more than 36 hrs out">
            <div className="py-[18px]"><SessionView s={MORNING} now={BEFORE} action={<ExampleHold />} /></div>
          </Frame>

          <Frame
            label="Session page · between 36 and 2 hrs out"
            note="Confirmed, 17 in. The price shown is the current price, because nobody can cancel now."
          >
            <div className="py-[18px]">
              <SessionView s={{ ...MORNING, current_holds: 17, state: "confirmed" }} now={BETWEEN} action={<ExampleHold />} />
            </div>
          </Frame>

          <Frame label="Session page · evening session">
            <div className="py-[18px]"><SessionView s={EVENING} now={BEFORE} action={<ExampleHold />} /></div>
          </Frame>

          <Frame label="Manage my booking · 1 place">
            <BookingView embedded session={MORNING} myQty={1} now={BEFORE} cancelArea={<ExampleCancel n={1} />} />
          </Frame>

          <Frame label="Manage my booking · 3 places">
            <BookingView embedded session={{ ...MORNING, current_holds: 6 }} myQty={3} now={BEFORE} cancelArea={<ExampleCancel n={3} />} />
          </Frame>

          <Frame
            label="Manage my booking · between 36 and 2 hrs out"
            note="The cancel button is hidden once free cancelling has closed."
          >
            <BookingView embedded session={{ ...MORNING, current_holds: 17, state: "confirmed" }} myQty={1} now={BETWEEN} />
          </Frame>

          <Frame label="Manage my booking · evening, no GEM assigned" note="Times follow the session: 6:35pm, 6:40pm, 6:45pm, 7:45pm.">
            <BookingView embedded session={EVENING} myQty={2} now={BEFORE} cancelArea={<ExampleCancel n={2} />} />
          </Frame>
        </div>
      </div>
    </main>
  );
}
