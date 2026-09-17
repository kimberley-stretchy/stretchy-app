import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Best-effort audit log of every email the app sends. NEVER throws and never
// blocks a send — if the table isn't there yet or the insert fails, we swallow
// it. The client is created lazily (inside the call) so importing this module
// from anywhere can't touch the service-role key at load time.

let _admin: SupabaseClient | null = null;
function admin(): SupabaseClient | null {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _admin = createClient(url, key, {
    global: { fetch: (u, o) => fetch(u, { ...o, cache: "no-store" }) },
  });
  return _admin;
}

export interface EmailLogEntry {
  sessionId?: string | null;
  recipient: string;
  emailType: string;
  subject?: string | null;
  resendId?: string | null;
  status?: "sent" | "error";
  error?: string | null;
}

function toRow(e: EmailLogEntry) {
  return {
    session_id: e.sessionId ?? null,
    recipient: e.recipient,
    email_type: e.emailType,
    subject: e.subject ?? null,
    resend_id: e.resendId ?? null,
    status: e.status ?? "sent",
    error: e.error ? String(e.error).slice(0, 500) : null,
  };
}

export async function logEmail(entry: EmailLogEntry): Promise<void> {
  try {
    const a = admin();
    if (!a || !entry.recipient) return;
    await a.from("email_log").insert(toRow(entry));
  } catch {
    /* audit log must never break a send */
  }
}

export async function logEmails(entries: EmailLogEntry[]): Promise<void> {
  try {
    const rows = entries.filter((e) => e.recipient).map(toRow);
    if (rows.length === 0) return;
    const a = admin();
    if (!a) return;
    await a.from("email_log").insert(rows);
  } catch {
    /* audit log must never break a send */
  }
}
