-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-09-13 · "Interested" toggle + HQ comp (gifted) holds
-- Run in: Supabase Dashboard → SQL Editor → New Query, against the STRETCHY
-- project (NOT the Studio Dawn project connected to the MCP).
-- Safe to run more than once (idempotent).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. "Interested" ───────────────────────────────────────────────────────────
-- One row per (session, user). A single toggle — "notify me about this one".
-- These people get the 38h "almost there / it's on / not this time" nudges even
-- though they haven't held a paid spot.
create table if not exists public.session_interest (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create index if not exists session_interest_session_idx on public.session_interest (session_id);
create index if not exists session_interest_user_idx    on public.session_interest (user_id);

alter table public.session_interest enable row level security;

-- The API writes with the service-role key (bypasses RLS), but these policies
-- keep it safe if the client ever reads/writes directly: you only see and
-- change your own interest.
drop policy if exists "own interest select" on public.session_interest;
create policy "own interest select" on public.session_interest
  for select using (auth.uid() = user_id);

drop policy if exists "own interest insert" on public.session_interest;
create policy "own interest insert" on public.session_interest
  for insert with check (auth.uid() = user_id);

drop policy if exists "own interest delete" on public.session_interest;
create policy "own interest delete" on public.session_interest
  for delete using (auth.uid() = user_id);

-- ── 2. Comp (gifted) holds ────────────────────────────────────────────────────
-- A hold Stretchy HQ creates on someone's behalf, covered by us. No Stripe
-- PaymentIntent — is_comp = true means "never charge, mark charged $0 at lock-in".
alter table public.holds
  add column if not exists is_comp boolean not null default false;
