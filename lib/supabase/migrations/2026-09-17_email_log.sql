-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-09-17 · Email audit log. Every email the app sends (attendee lifecycle,
-- comp, HQ digests, teacher/GEM) records a row here as it goes out — so HQ can
-- see exactly who got which email for a session without opening Resend, and so
-- silent send failures are visible. Run in the Supabase SQL editor. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.email_log (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid,
  recipient   text not null,
  email_type  text not null,
  subject     text,
  resend_id   text,
  status      text not null default 'sent',   -- 'sent' | 'error'
  error       text,
  created_at  timestamptz not null default now()
);

create index if not exists email_log_session_idx on public.email_log (session_id, created_at desc);
create index if not exists email_log_created_idx on public.email_log (created_at desc);
