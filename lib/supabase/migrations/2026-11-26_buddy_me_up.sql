-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-11-26 · Buddy me up (SOCIAL_BOOKING_BRIEF.md section 6).
--
-- buddy_optins:  one row per person who switched Buddy me up on for a session,
--                with their optional Say hello line (140 characters).
-- buddy_matches: who's matched with whom (same group_no = same pair or group).
--                Made at 36 hrs out once a session is going ahead; people who
--                switch it on later are matched up until joining closes.
-- sessions.buddy_matched_at: when matching first ran for that session.
--
-- Both tables are emptied for a session one week after it (or when it's called
-- off): the 15-minute session-check job does this. Only the server (service role) reads or writes.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.buddy_optins (
  session_id        uuid not null references public.sessions(id) on delete cascade,
  user_id           uuid not null,
  hello             text check (hello is null or char_length(hello) <= 140),
  solo_notified_at  timestamptz,   -- "You're our only buddy-upper this time" sent
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (session_id, user_id)
);

create table if not exists public.buddy_matches (
  session_id  uuid not null references public.sessions(id) on delete cascade,
  user_id     uuid not null,
  group_no    integer not null,
  created_at  timestamptz not null default now(),
  primary key (session_id, user_id)
);
create index if not exists buddy_matches_group_idx on public.buddy_matches (session_id, group_no);

alter table public.buddy_optins enable row level security;
alter table public.buddy_matches enable row level security;

alter table public.sessions add column if not exists buddy_matched_at timestamptz;
