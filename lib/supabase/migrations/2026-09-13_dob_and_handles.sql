-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-09-13 · Date of birth (under-18 HQ alert) + social handles
-- Run in the Supabase SQL editor (STRETCHY project). Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

-- Date of birth — captured at signup. Used to alert HQ if an under-18 books.
-- (They can still book; HQ just gets notified.)
alter table public.attendees
  add column if not exists date_of_birth date;

-- Social handles that can optionally appear on the listing + in emails.
-- Teachers and GEMs already have handles on their host profile
-- (public.hosts.instagram / tiktok / website), so this only adds the venue
-- and Social-Stretch venue handles, which live on the session.
alter table public.sessions
  add column if not exists venue_instagram text;
alter table public.sessions
  add column if not exists social_venue_instagram text;
