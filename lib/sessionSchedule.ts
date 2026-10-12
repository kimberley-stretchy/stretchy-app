// ─────────────────────────────────────────────────────────────────────────────
// What the session-check job should do for ONE session at a given moment.
// Pure logic, no database or email — so it can be tested on its own, and so the
// job and HQ can never disagree about the rules.
//
// The countdown to every Stretchy (all counted back from its start time):
//
//   38 hrs out  "So close" nudge. If it's under its minimum, everyone holding
//               or interested is asked to share, the teacher + GEM are told,
//               and HQ gets a heads-up.
//   37 hrs out  HQ-only window opens. If it's still under its minimum, HQ (and
//               nobody else) is told it will be called off at 36 hrs unless they
//               press "Keep alive". One hour to decide.
//   36 hrs out  The yes / no. Minimum met, or HQ kept it alive → going ahead.
//               Otherwise → called off. Everyone is told at this moment, and
//               free cancelling closes at the same moment. No grace after it.
//
// The job runs every 15 minutes, so sessions starting on the quarter hour
// (6:00am, 6:15am, 6:45pm…) hit each step exactly on time. A session starting at
// an odd minute is picked up at the next run, at most 15 minutes late — a step
// is never early and never skipped.
// ─────────────────────────────────────────────────────────────────────────────

export const NUDGE_HOURS = 38;
export const HQ_WINDOW_HOURS = 37;
export const DECISION_HOURS = 36;

// Only nudge when at least this many places are held — an empty room isn't "so close".
export const NUDGE_MIN_HOLDS = 1;

export type ScheduleStep = "nudge" | "hq_alert" | "confirm" | "cancel";

export interface ScheduleInput {
  /** Hours from now until the session starts (can be fractional). */
  hoursUntil: number;
  /** Places currently held. */
  held: number;
  /** The session's minimum to go ahead. */
  min: number;
  /** The "so close" nudge has already gone out. */
  nudgeSent: boolean;
  /** HQ has already had its "your call" alert. */
  hqAlerted: boolean;
  /** HQ pressed "Keep alive" — go ahead at 36 hrs whatever the numbers. */
  keptAlive: boolean;
}

/** The steps due right now for a still-open session, in the order to run them. */
export function stepsDue(i: ScheduleInput): ScheduleStep[] {
  const short = i.held < i.min;

  // 36 hrs out (or later, if a run was missed): the decision, and nothing else.
  if (i.hoursUntil <= DECISION_HOURS) {
    return [!short || i.keptAlive ? "confirm" : "cancel"];
  }

  const steps: ScheduleStep[] = [];

  // 38 → 36 hrs out: the nudge, once. Still eligible after 37 hrs so a missed
  // run is caught up rather than lost.
  if (i.hoursUntil <= NUDGE_HOURS && short && !i.keptAlive && !i.nudgeSent && i.held >= NUDGE_MIN_HOLDS) {
    steps.push("nudge");
  }

  // 37 → 36 hrs out: HQ's window. Alerted once, the first time it's seen short —
  // including if a late cancellation drops it under the minimum mid-window.
  if (i.hoursUntil <= HQ_WINDOW_HOURS && short && !i.keptAlive && !i.hqAlerted) {
    steps.push("hq_alert");
  }

  return steps;
}

/** Hours from `now` until a session starts. */
export function hoursUntil(startsAt: string | Date, now: Date = new Date()): number {
  return (new Date(startsAt).getTime() - now.getTime()) / (60 * 60 * 1000);
}
