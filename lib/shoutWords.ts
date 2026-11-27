// Shout a mate (SOCIAL_BOOKING_BRIEF.md section 4): limits and the on/off
// switch, shared by pages, emails and the server. No server code in here.

/**
 * On: switched on by Kimberley, 27 Nov 2026, after Part B, her DIA check and
 * the privacy & terms wording. Set to false to hide every Shout button (site
 * and emails) again; the pages still work by direct link.
 */
export const SHOUT_LIVE = true;

/** One shout = one place. */
/**
 * Not a limit people should ever meet (shouts are paid upfront): a safety net
 * against card-testing fraud, or someone filling a session then cancelling.
 * Decided with Kimberley 27 Nov 2026 (was 4).
 */
export const MAX_SHOUTS = 10;
export const SHOUT_NOTE_MAX = 140;

export const shoutPath = (sessionId: string) => `/sessions/${sessionId}/shout`;
export const claimPath = (code: string) => `/shout/${code}`;
/** After we call a session off: the giver picks re-book or refund. */
export const againPath = (shoutId: string) => `/shout/again/${shoutId}`;
