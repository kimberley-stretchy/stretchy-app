-- ─────────────────────────────────────────────────────────────────────────────
-- STRETCHY ROW LEVEL SECURITY (RLS)
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Run AFTER the schema is already set up.
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable RLS on all tables
alter table public.attendees          enable row level security;
alter table public.holds              enable row level security;
alter table public.sessions           enable row level security;
alter table public.hosts              enable row level security;
alter table public.ratings            enable row level security;
alter table public.suggestions        enable row level security;
alter table public.suggestion_votes   enable row level security;
alter table public.waitlist           enable row level security;
alter table public.notifications      enable row level security;
alter table public.push_subscriptions enable row level security;

-- ─── SESSIONS (public read, service-role write) ───────────────────────────────
-- Anyone can browse sessions (no login needed)
create policy "sessions_public_read"
  on public.sessions for select
  using (true);

-- Only service role (admin API) can insert/update/delete
-- (No authenticated user policy — all writes go through our API with service key)

-- ─── ATTENDEES ────────────────────────────────────────────────────────────────
-- Users can only read their own attendee record
create policy "attendees_own_read"
  on public.attendees for select
  using (auth_user_id = auth.uid());

-- Users can update their own record
create policy "attendees_own_update"
  on public.attendees for update
  using (auth_user_id = auth.uid());

-- Service role handles inserts via API (no user insert policy needed)

-- ─── HOLDS ────────────────────────────────────────────────────────────────────
-- Users can only see their own holds
create policy "holds_own_read"
  on public.holds for select
  using (user_id = auth.uid());

-- ─── HOSTS ────────────────────────────────────────────────────────────────────
-- Hosts are public (attendees can see who is running a session)
create policy "hosts_public_read"
  on public.hosts for select
  using (true);

-- ─── RATINGS ──────────────────────────────────────────────────────────────────
-- Users can see all ratings (for aggregate display)
create policy "ratings_public_read"
  on public.ratings for select
  using (true);

-- Users can only see their own rating details
-- (For now, all ratings readable — adjust if you add private fields)

-- ─── SUGGESTIONS ──────────────────────────────────────────────────────────────
-- Anyone can read suggestions
create policy "suggestions_public_read"
  on public.suggestions for select
  using (true);

-- ─── SUGGESTION VOTES ─────────────────────────────────────────────────────────
create policy "suggestion_votes_public_read"
  on public.suggestion_votes for select
  using (true);

-- ─── WAITLIST ─────────────────────────────────────────────────────────────────
-- Public inserts (anyone can join waitlist)
create policy "waitlist_public_insert"
  on public.waitlist for insert
  with check (true);

-- Only admin (service role) can read
-- No select policy for anon/authenticated users

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
create policy "notifications_own_read"
  on public.notifications for select
  using (user_id = auth.uid());

-- ─── PUSH SUBSCRIPTIONS ────────────────────────────────────────────────────────
-- Users can only see their own push subscription
create policy "push_subscriptions_own_read"
  on public.push_subscriptions for select
  using (user_id = auth.uid());

-- Users can manage their own subscription
create policy "push_subscriptions_own_write"
  on public.push_subscriptions for all
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE: Service role key (used in our API routes) bypasses ALL RLS policies.
-- This is correct — our server-side APIs handle their own auth checks.
-- The RLS policies protect against direct Supabase client calls only.
-- ─────────────────────────────────────────────────────────────────────────────
