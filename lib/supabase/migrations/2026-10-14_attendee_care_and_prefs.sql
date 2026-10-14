-- 2026-10-14 · The sign-up details the app has been trying to save but the live
-- database never had columns for. Without these, the "moving with care" note
-- (injuries, pregnancy, anything a teacher should know) was never stored, and
-- the run sheet couldn't read anyone's details.
-- Additive and nullable / defaulted: nothing existing changes. Idempotent.
alter table public.attendees
  add column if not exists moving_with_care_note     text,
  add column if not exists moving_with_care_duration text,
  add column if not exists moving_with_care_ends_at  timestamptz,
  add column if not exists neighbourhoods            text[]  default '{}',
  add column if not exists when_suits                text[]  default '{}',
  add column if not exists show_first_name_to_room   boolean default true,
  add column if not exists notify_going_ahead        boolean default true,
  add column if not exists notify_price_locked       boolean default true,
  add column if not exists notify_new_nearby         boolean default false;
