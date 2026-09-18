import { FROM, REPLY_TO } from "@/lib/stretchy-email";

// Newsletters go out as Resend Broadcasts (to the marketing Audience, with Resend
// handling unsubscribes). Done via the REST API so we don't have to bump the SDK
// major version and risk the transactional send path. Best-effort return shapes;
// callers surface errors to HQ.

const API = "https://api.resend.com";

function key(): string | null {
  return process.env.RESEND_API_KEY ?? null;
}

// Create a broadcast for the Audience, then send it now. Returns the broadcast id.
export async function sendBroadcast(opts: {
  audienceId: string;
  subject: string;
  html: string;
  name?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const k = key();
  if (!k) return { ok: false, error: "RESEND_API_KEY missing" };
  const headers = { Authorization: `Bearer ${k}`, "Content-Type": "application/json" };
  try {
    const createRes = await fetch(`${API}/broadcasts`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        audience_id: opts.audienceId,
        from: FROM,
        reply_to: REPLY_TO,
        subject: opts.subject,
        html: opts.html,
        name: opts.name ?? opts.subject,
      }),
    });
    const created = await createRes.json().catch(() => ({}));
    if (!createRes.ok || !created?.id) {
      return { ok: false, error: created?.message || `Create failed (HTTP ${createRes.status})` };
    }
    const sendRes = await fetch(`${API}/broadcasts/${created.id}/send`, { method: "POST", headers, body: "{}" });
    if (!sendRes.ok) {
      const e = await sendRes.json().catch(() => ({}));
      return { ok: false, id: created.id, error: e?.message || `Send failed (HTTP ${sendRes.status})` };
    }
    return { ok: true, id: created.id };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

// Count the Audience so a send receipt can say how many it went to. Broadcasts
// deliver to SUBSCRIBED contacts, so that's the number that matters.
export async function getAudienceCount(audienceId: string): Promise<{ total: number; subscribed: number } | null> {
  const k = key();
  if (!k) return null;
  try {
    const res = await fetch(`${API}/audiences/${audienceId}/contacts`, {
      headers: { Authorization: `Bearer ${k}` },
    });
    if (!res.ok) return null;
    const body = await res.json().catch(() => ({}));
    const rows: { unsubscribed?: boolean }[] = body?.data ?? [];
    const subscribed = rows.filter((r) => !r.unsubscribed).length;
    return { total: rows.length, subscribed };
  } catch {
    return null;
  }
}

// Send a one-off test of the newsletter to a single address (a normal email, not
// a broadcast) so HQ can preview it in a real inbox before sending to everyone.
export async function sendTestNewsletter(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  const k = key();
  if (!k) return { ok: false, error: "RESEND_API_KEY missing" };
  try {
    // The unsubscribe merge tag only resolves inside a broadcast — strip it for the test.
    const testHtml = html.replace(/\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/g, "#");
    const res = await fetch(`${API}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${k}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to, reply_to: REPLY_TO, subject: `[TEST] ${subject}`, html: testHtml }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      return { ok: false, error: e?.message || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}
