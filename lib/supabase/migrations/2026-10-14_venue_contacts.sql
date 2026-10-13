-- 2026-10-14 · Venue contacts, so each session's two venues can be sent a hold.
--   sessions.venue_email                 — contact at the yoga venue
--   sessions.social_venue_email          — contact at the Social Stretch venue
--   sessions.venue_invited_email         — who the yoga-venue hold last went to
--   sessions.social_venue_invited_email  — …and the Social Stretch one
-- The "invited" columns stop the hold being re-sent every time a session is
-- saved; changing the contact email sends it to the new address.
-- Additive and nullable: existing code ignores them. Idempotent.
alter table public.sessions
  add column if not exists venue_email                text,
  add column if not exists social_venue_email         text,
  add column if not exists venue_invited_email        text,
  add column if not exists social_venue_invited_email text;
