-- 2026-10-13 · HQ "Keep alive".
-- When HQ presses "Keep alive" on a session before 36 hours out, we record the
-- moment here. Nothing is sent to customers at that point: at 36 hours out the
-- session-check job sees this and confirms the session even if it's under its
-- minimum. Empty (null) = HQ hasn't stepped in, so the normal rule applies.
-- Additive and nullable: existing code ignores it. Idempotent.
alter table public.sessions
  add column if not exists keep_alive_at timestamptz;
