// Shout a mate (SOCIAL_BOOKING_BRIEF.md section 4): limits and the on/off
// switch, shared by pages, emails and the server. No server code in here.

/**
 * Off until Part B (cancelling) is built and Kimberley's DIA check is clear.
 * While off, no button links to Shout (site or emails); the pages still work
 * by direct link so they can be previewed.
 */
export const SHOUT_LIVE = false;

/** One shout = one place. At most this many per person per session. */
export const MAX_SHOUTS = 4;
export const SHOUT_NOTE_MAX = 140;

export const shoutPath = (sessionId: string) => `/sessions/${sessionId}/shout`;
export const claimPath = (code: string) => `/shout/${code}`;
/** After we call a session off: the giver picks re-book or refund. */
export const againPath = (shoutId: string) => `/shout/again/${shoutId}`;
