-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-09-17 · Marketing consent (for newsletters via Resend Audiences).
--
-- Marketing email is SEPARATE from transactional: it needs explicit opt-in +
-- unsubscribe (NZ Unsolicited Electronic Messages Act / GDPR / CAN-SPAM). Only
-- attendees with marketing_consent = true are synced to the Resend Audience and
-- may receive newsletters. The existing notification_prefs.news toggle drives it;
-- these columns are the durable consent record (what + when). Run in the Supabase
-- SQL editor. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.attendees
  add column if not exists marketing_consent boolean not null default false;
alter table public.attendees
  add column if not exists marketing_consent_at timestamptz;
