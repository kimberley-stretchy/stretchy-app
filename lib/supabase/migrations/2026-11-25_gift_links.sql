-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-11-25 · Gift links: a link someone can pass to friends, each friend
-- claims ONE free place ("on us", covered by Stretchy) at a session of their
-- choice. Used for Daisy (GEM): 4 friends, until the end of 24 Dec 2026.
--
-- Places claimed this way are ordinary "on us" holds (holds.is_comp = true):
-- they count in the headcount like HQ's comps.
-- Only the server (service role) reads or writes these tables.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.gift_links (
  code        text primary key,
  from_name   text not null,          -- "Daisy": shown to friends and in their email
  max_uses    integer not null,       -- how many friends can claim (one place each)
  expires_at  timestamptz not null,   -- claimable until, and sessions up to, this time
  note        text,                   -- HQ's own note
  created_at  timestamptz not null default now()
);

create table if not exists public.gift_link_uses (
  id          uuid primary key default gen_random_uuid(),
  code        text not null references public.gift_links(code) on delete cascade,
  email       text not null,
  session_id  uuid references public.sessions(id) on delete set null,
  user_id     uuid,
  created_at  timestamptz not null default now()
);

-- One place per friend per link.
create unique index if not exists gift_link_uses_one_each on public.gift_link_uses (code, lower(email));

alter table public.gift_links enable row level security;
alter table public.gift_link_uses enable row level security;

-- Daisy's link: 4 friends, until 11:59pm Thursday 24 Dec 2026 (NZ time).
insert into public.gift_links (code, from_name, max_uses, expires_at, note)
values ('daisy-57av9r', 'Daisy', 4, '2026-12-24 23:59:59 Pacific/Auckland', 'GEM gift: 4 friends, one place each, on Stretchy')
on conflict (code) do nothing;
