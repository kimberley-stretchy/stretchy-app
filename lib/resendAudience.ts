// ── Marketing Audience sync (Resend Contacts) ──────────────────────────────────
// Separate from transactional email. Only opted-in people (marketing_consent)
// live in the Resend Audience; newsletters/broadcasts send to that Audience, with
// Resend managing unsubscribes. Every call here is BEST-EFFORT — it never throws
// and never blocks the caller. If the env isn't configured yet it no-ops, so the
// app runs fine before the Audience exists.
//
// Uses Resend's REST API directly (not the SDK) so we get an email-keyed upsert
// regardless of SDK version. Setup (one-time, in Resend): create an Audience,
// copy its ID, set RESEND_AUDIENCE_ID in Vercel (RESEND_API_KEY is already set),
// then run the admin backfill once.

const API = "https://api.resend.com";

function config(): { key: string; audienceId: string } | null {
  const key = process.env.RESEND_API_KEY;
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!key || !audienceId) return null;
  return { key, audienceId };
}

export function marketingConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.RESEND_AUDIENCE_ID);
}

export interface ContactInput {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  subscribed: boolean; // true = opted in, false = unsubscribed
}

// Idempotent upsert: create the contact; if it already exists, PATCH it by email
// (Resend contacts are keyed by email within an audience).
export async function syncMarketingContact(c: ContactInput): Promise<{ ok: boolean; skipped?: boolean; error?: unknown }> {
  const cfg = config();
  if (!cfg || !c.email) return { ok: false, skipped: true };
  const { key, audienceId } = cfg;
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const first = c.firstName?.split(" ")[0] ?? undefined;
  const body = JSON.stringify({ email: c.email, first_name: first, last_name: c.lastName ?? undefined, unsubscribed: !c.subscribed });

  try {
    const create = await fetch(`${API}/audiences/${audienceId}/contacts`, { method: "POST", headers, body });
    if (create.ok) return { ok: true };

    // Already exists (or other) → update by email.
    const update = await fetch(`${API}/audiences/${audienceId}/contacts/${encodeURIComponent(c.email)}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ first_name: first, unsubscribed: !c.subscribed }),
    });
    if (update.ok) return { ok: true };
    const errText = await update.text().catch(() => "");
    return { ok: false, error: errText || `HTTP ${update.status}` };
  } catch (error) {
    console.error("syncMarketingContact error:", error);
    return { ok: false, error };
  }
}

export async function unsubscribeMarketingContact(email: string): Promise<{ ok: boolean; skipped?: boolean }> {
  const r = await syncMarketingContact({ email, subscribed: false });
  return { ok: r.ok, skipped: r.skipped };
}
