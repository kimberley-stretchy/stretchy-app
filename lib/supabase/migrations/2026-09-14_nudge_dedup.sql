-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-09-14 · One-time guard so the 38h recruit nudge fires ONCE per session
-- (never a double nudge to customers within an hour). Run in the Supabase SQL
-- editor (Stretchy project). Idempotent.
--
-- The cron is written fail-open: if this column isn't there yet it still sends
-- the nudge (just without the once-only guard), so nothing breaks before you
-- run this. Once the column exists, the guard activates automatically.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.sessions
  add column if not exists nudge_sent_at timestamptz;
