-- 2026-10-28 · Stretchy Australia (Sydney first).
-- au_waitlist: one row per sign-up at stretchyyoga.co.nz/australia.
-- au_visits: an anonymous count of Australian visitors (state only, one per
-- device, recorded when the Australia pop-up first shows). No personal data.
-- RLS on, no public policies: only the server reads and writes. The grant
-- lines are what Supabase requires for tables created from 30 Oct 2026.
create table if not exists public.au_waitlist (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  name            text not null,
  email           text not null,
  sydney_areas    text[] not null default '{}',
  sydney_other    text,
  times           text[] not null default '{}',
  other_cities    text[] not null default '{}',
  other_city_note text,
  is_teacher      boolean not null default false,
  is_gem          boolean not null default false,
  team_tip        text,
  venue_tip       text,
  heard_from      text,
  heard_group     text,
  opt_in          boolean not null default false,
  state           text,
  source          text
);
create unique index if not exists au_waitlist_email on public.au_waitlist (lower(email));
alter table public.au_waitlist enable row level security;
grant select, insert, update, delete on public.au_waitlist to service_role;

create table if not exists public.au_visits (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  state       text
);
alter table public.au_visits enable row level security;
grant select, insert, update, delete on public.au_visits to service_role;
