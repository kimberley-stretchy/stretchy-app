import type { Metadata } from "next";
import CapacityPips from "@/components/CapacityPips";
import PolicyLinks from "@/components/PolicyLinks";
import { sessionTimes, formatDayTime, type SessionTimePhase } from "@/lib/sessionTimes";
import { heldHeadline, priceRow, bringNote, cancelLabel, moreToGoAhead, inAndRoom } from "@/lib/places";
import { startingPrice, floorPrice, maxPriceToPromise } from "@/lib/pricing";

// ─────────────────────────────────────────────────────────────────────────────
// TEMPORARY — copy refresh, section 1 sign-off page. Shows the shared helpers
// working on example sessions so Kimberley can see them before any real page
// uses them. Uses fixed example data only: it never reads or writes the
// database. DELETE THIS FOLDER before the branch is merged (handover section 10).
// ─────────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = { title: "Copy refresh check", robots: { index: false, follow: false } };

const COST = 199.49;
const TARGET = 120;
const MIN = 14;
const MAX = 30;

// "now" is pinned per example so each phase can be shown side by side.
const EXAMPLES: { name: string; starts_at: string; duration_mins: number; now: string; held: number; mine: number }[] = [
  { name: "Morning · more than 36 hrs out · 1 place", starts_at: "2026-10-22T17:15:00Z", duration_mins: 60, now: "2026-10-13T00:00:00Z", held: 4, mine: 1 },
  { name: "Morning · more than 36 hrs out · 3 places", starts_at: "2026-10-22T17:15:00Z", duration_mins: 60, now: "2026-10-13T00:00:00Z", held: 6, mine: 3 },
  { name: "Morning · between 36 and 2 hrs out", starts_at: "2026-10-22T17:15:00Z", duration_mins: 60, now: "2026-10-22T00:00:00Z", held: 18, mine: 1 },
  { name: "Evening session", starts_at: "2026-10-29T05:45:00Z", duration_mins: 60, now: "2026-10-20T00:00:00Z", held: 9, mine: 2 },
  { name: "Late morning, runs past midday (75 min)", starts_at: "2026-10-23T22:30:00Z", duration_mins: 75, now: "2026-10-20T00:00:00Z", held: 14, mine: 0 },
];

const PHASE_WORDS: Record<SessionTimePhase, string> = {
  before36: "More than 36 hrs out — free to cancel",
  between: "36 → 2 hrs out — still room to join, no free cancelling",
  after2: "Inside 2 hrs — joining closed, final price charged",
  cancelled: "Called off",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3 py-2.5 border-t-2" style={{ borderColor: "#E1D5C6" }}>
      <div className="font-mono text-[10px] font-extrabold tracking-[0.1em] uppercase text-ink/60 pt-0.5">{label}</div>
      <div className="text-sm text-ink">{children}</div>
    </div>
  );
}

export default function CopyRefreshCheckPage() {
  return (
    <main className="min-h-screen bg-cream text-ink px-4 py-8">
      <div className="max-w-[640px] mx-auto flex flex-col gap-6">
        <div>
          <p className="font-mono text-[10px] font-extrabold tracking-[0.14em] text-purple">COPY REFRESH · SECTION 1 · TEMPORARY PAGE</p>
          <h1 className="font-display text-[34px] leading-[.95] mt-2">Shared helpers check</h1>
          <p className="text-sm text-ink/70 leading-relaxed mt-2">
            Example sessions only. Nothing here reads or changes real bookings. Each box shows what the new helpers
            work out for a session: dates and times, which stage it&rsquo;s at, the wording for one place or several,
            the &ldquo;never more than&rdquo; price, and the people dots.
          </p>
        </div>

        {EXAMPLES.map((ex) => {
          const t = sessionTimes({ starts_at: ex.starts_at, duration_mins: ex.duration_mins, state: "open" }, ex.now);
          const before36 = t.phase === "before36";
          const promise = maxPriceToPromise(COST, TARGET, MIN, ex.held, before36);
          const price = priceRow(promise, ex.mine || 1);
          const need = moreToGoAhead(ex.held, MIN);
          return (
            <section key={ex.name} className="border-2 border-ink rounded-[22px] p-5 bg-cream">
              <p className="font-mono text-[10px] font-extrabold tracking-[0.12em] uppercase text-ink/60">{ex.name}</p>
              <h2 className="font-display text-[24px] leading-none mt-2 mb-3">{ex.mine ? heldHeadline(ex.mine) : "Not holding a place"}</h2>

              <Row label="Date | time"><strong>{t.dayAndRange}</strong></Row>
              <Row label="How it goes">
                {t.parkTime} park · {t.arriveTime} say kia ora · {t.startTime} start · {t.endTime} Social Stretch
              </Row>
              <Row label="Day word">&ldquo;moving together <strong>{t.dayWord}</strong>&rdquo;</Row>
              <Row label="Stage"><strong>{PHASE_WORDS[t.phase]}</strong></Row>
              <Row label="36 hrs out">{formatDayTime(t.goNoGo)} <span className="text-ink/50">(only ever shown in the &ldquo;can&rsquo;t cancel now&rdquo; message)</span></Row>
              <Row label="2 hrs out">{formatDayTime(t.finalCharge)}</Row>
              <Row label="Price now">
                <strong>{price.bold}</strong>
                <span className="block text-ink/60">
                  {price.greyLead ? `${price.greyLead} ` : ""}
                  {need ? `${need}.` : `${inAndRoom(ex.held)}.`} Drops to ${floorPrice(COST, TARGET, MAX).toFixed(2)} if all {MAX} fill.
                </span>
              </Row>
              <Row label="Never more than">
                <strong>${promise.toFixed(2)}</strong>
                <span className="block text-ink/60">
                  {before36
                    ? "Before 36 hrs out, this is the price at the minimum."
                    : "After 36 hrs out, this is the current price. It can only drop from here."}
                </span>
              </Row>
              <Row label="Bring with you">
                <strong>Your mat &amp; water</strong>
                <span className="block text-ink/60">{bringNote("Plus any props you like, and $$ for coffee after.", ex.mine || 1)}</span>
              </Row>
              <Row label="Cancel button">{ex.mine ? (before36 ? <strong>{cancelLabel(ex.mine)}</strong> : "Hidden (after 36 hrs out)") : "—"}</Row>

              <div className="pt-3 border-t-2" style={{ borderColor: "#E1D5C6" }}>
                <div className="flex justify-between font-mono text-[10px] font-extrabold tracking-[0.06em] uppercase mb-2">
                  <span>{need ? need : "Going ahead ✓ · still room to join"}</span>
                  <span>{MAX} max</span>
                </div>
                <CapacityPips min={MIN} max={MAX} held={ex.held} accent="#902F8A" showMinLine />
                <div className="flex justify-between font-mono text-[11px] font-bold mt-2">
                  <span>${startingPrice(COST, TARGET, MIN).toFixed(2)}</span>
                  <span>${floorPrice(COST, TARGET, MAX).toFixed(2)}</span>
                </div>
              </div>
            </section>
          );
        })}

        <section className="border-2 border-dashed border-ink/35 rounded-[22px] p-5">
          <p className="font-mono text-[10px] font-extrabold tracking-[0.12em] uppercase text-ink/60 mb-2">Links (both open in a new tab)</p>
          <PolicyLinks />
          <p className="text-xs text-ink/50 mt-2">
            &ldquo;Cancellation policy&rdquo; lands on the right section once the Terms page is updated in a later group.
          </p>
        </section>

        <section className="border-2 border-dashed border-ink/35 rounded-[22px] p-5">
          <p className="font-mono text-[10px] font-extrabold tracking-[0.12em] uppercase text-ink/60 mb-3">Dots as they look today (no line, no outline)</p>
          <CapacityPips min={MIN} max={MAX} held={4} accent="#902F8A" />
        </section>
      </div>
    </main>
  );
}
