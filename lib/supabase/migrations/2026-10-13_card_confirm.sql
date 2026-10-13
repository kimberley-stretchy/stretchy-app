-- 2026-10-13 · Confirming cards at 36 hours out.
-- When a session is confirmed, each booking gets a fresh card authorisation. If
-- one fails, we record it here, give the person until 12 hours before the
-- session to fix their card, remind them once, then release the place.
--   holds.card_failed_at    — when the 36-hour authorisation failed (null = fine)
--   holds.card_fail_reason  — the bank's reason code, for HQ
--   holds.card_reminded_at  — when the reminder went, so it's sent once
--   sessions.confirmed_headcount — places held when it was confirmed; nobody
--        pays more than the price at this number, even if a place is released
-- Additive and nullable: existing code ignores them. Idempotent.
alter table public.holds
  add column if not exists card_failed_at   timestamptz,
  add column if not exists card_fail_reason text,
  add column if not exists card_reminded_at timestamptz;

alter table public.sessions
  add column if not exists confirmed_headcount integer;
