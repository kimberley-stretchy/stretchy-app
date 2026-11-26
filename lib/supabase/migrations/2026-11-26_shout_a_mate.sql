-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-11-26 · Shout a mate (SOCIAL_BOOKING_BRIEF.md section 4).
--
-- shouts: one row per place someone has paid for, for a mate, at one session.
--   pending  → card step started, not paid yet (no place held)
--   paid     → paid; the place is held (holds.shout_id) and counts in the headcount
--   claimed  → the mate has claimed it; the hold is now theirs (holds.user_id)
--   settled  → final price charged 30 mins out; any difference refunded
--   cancelled / released / refunded → part B (cancelling)
--
-- holds.shout_id: marks a held place as a shout. It's already paid, so the
-- 36-hour card check and the 30-minute charge skip it. Until it's claimed the
-- hold has no user_id.
--
-- The mate's email is only used for this place, never the newsletter.
-- Only the server (service role) reads or writes.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.shouts (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,          -- the mate's one-time claim link: /shout/{code}
  session_id       uuid not null references public.sessions(id) on delete cascade,
  giver_user_id    uuid not null,
  recipient_name   text not null,
  recipient_email  text,                           -- only when "We email {Name}"
  deliver          text not null check (deliver in ('email', 'link')),
  hide_price       boolean not null default false,
  note             text check (note is null or char_length(note) <= 140),
  amount_cents     integer not null,               -- what the giver paid (today's max)
  final_cents      integer,                        -- the final price, 30 mins out
  refund_cents     integer,                        -- the difference sent back
  stripe_pi_id     text,
  state            text not null default 'pending'
                   check (state in ('pending', 'paid', 'claimed', 'settled', 'cancelled', 'released', 'refunded')),
  hold_id          uuid,
  claimed_user_id  uuid,
  created_at       timestamptz not null default now(),
  paid_at          timestamptz,
  claimed_at       timestamptz,
  settled_at       timestamptz,
  nudged_at        timestamptz,
  cancelled_at     timestamptz
);
create index if not exists shouts_session_idx on public.shouts (session_id, state);
create index if not exists shouts_giver_idx on public.shouts (giver_user_id, session_id);
alter table public.shouts enable row level security;

-- An unclaimed shout is a held place with nobody's name on it yet.
alter table public.holds alter column user_id drop not null;

alter table public.holds add column if not exists shout_id uuid references public.shouts(id) on delete set null;
