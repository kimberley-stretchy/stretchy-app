-- 2026-10-14 · Team notices from Stretchy HQ.
-- Short messages Kimberley posts for every teacher and GEM ("No Stretchy next
-- week", "Come to this event") — shown on their home screen and run sheets
-- until the "show until" date passes or HQ removes them.
-- Row level security is ON with no policies: only the server (service role)
-- can read or write, never a browser directly. Idempotent.
create table if not exists public.team_notices (
  id          uuid primary key default gen_random_uuid(),
  message     text not null,
  author_name text,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz
);
alter table public.team_notices enable row level security;
