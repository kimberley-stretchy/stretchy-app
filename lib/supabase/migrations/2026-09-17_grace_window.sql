-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-09-17 · Grace window for the 36h decision.
--
-- When a session is still short at the 36h mark, it is NOT cancelled straight
-- away. It enters a silent grace window (invisible to customers): HQ is alerted
-- only, and has ~1 hour to hit "Keep it alive & confirm" before the next cron run
-- auto-cancels it. This column records when that window opened; NULL means the
-- session is not in grace. Run in the Supabase SQL editor (Stretchy project).
-- Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.sessions
  add column if not exists grace_started_at timestamptz;
