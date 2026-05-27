-- ─────────────────────────────────────────────────────────────────────────────
-- STRETCHY DATABASE SCHEMA
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ─── ATTENDEES ────────────────────────────────────────────────────────────────
create table public.attendees (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  phone text,
  avatar_url text,
  neighbourhood text,
  stripe_customer_id text unique,
  payment_method_id text,          -- saved at onboarding, charged at lock-in
  sessions_attended integer default 0,
  notification_email boolean default true,
  notification_sms boolean default false,
  notification_push boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── HOSTS ────────────────────────────────────────────────────────────────────
create table public.hosts (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  avatar_url text,
  bio text,
  neighbourhood text not null,
  practice_types text[] not null default '{}',
  years_experience integer,
  is_certified boolean default false,
  has_first_aid boolean default false,
  instagram text,
  tiktok text,
  website text,
  substack text,
  bank_account_added boolean default false,
  stripe_account_id text,          -- Stripe Connect for payouts
  sessions_hosted integer default 0,
  rating_average numeric(3,2),
  rating_count integer default 0,
  vetting_status text default 'pending' check (vetting_status in ('pending', 'approved', 'declined', 'more_info', 'expired')),
  vetting_expires_at timestamptz,
  application_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── SESSIONS ─────────────────────────────────────────────────────────────────
create table public.sessions (
  id uuid primary key default uuid_generate_v4(),
  host_id uuid references public.hosts(id) on delete cascade,
  title text not null,
  description text,
  session_type text not null check (session_type in ('yoga','pilates','run_club','breathwork','sound_bath','dance','hiit','other')),
  duration_minutes integer not null,
  starts_at timestamptz not null,
  neighbourhood text not null,
  venue_name text not null,
  venue_address text not null,
  venue_notes text,

  -- Pricing
  host_target numeric(10,2) not null,       -- what host needs to earn (NZD)
  stretchy_fee numeric(10,2) default 23.00, -- $20 + 15% GST — never changes
  minimum_spots integer not null,
  max_capacity integer not null,
  current_holds integer default 0,          -- updated by trigger on holds table
  confirmed_spots integer default 0,

  -- Phase / Status
  -- HOLD_BELOW_MIN | HOLD_DROPPING | CONFIRMED | LOCKED | COMPLETED | CANCELLED
  phase text default 'HOLD_BELOW_MIN',
  -- open | dropping | filling | almost_full | confirmed | full | cancelled
  status text default 'open',

  -- Social stretch
  has_social_stretch boolean default false,
  social_stretch_venue text,
  social_stretch_details text,

  -- Repeat
  is_repeat boolean default false,
  repeat_frequency text check (repeat_frequency in ('weekly','fortnightly','monthly')),
  parent_session_id uuid references public.sessions(id),

  -- Timestamps
  confirmed_at timestamptz,
  locked_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── HOLDS ────────────────────────────────────────────────────────────────────
create table public.holds (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.sessions(id) on delete cascade,
  attendee_id uuid references public.attendees(id) on delete cascade,
  price_at_hold numeric(10,2) not null,     -- price when they joined
  price_paid numeric(10,2),                 -- final price charged at lock-in
  notes_for_host text,
  status text default 'held' check (status in ('held','confirmed','cancelled','charged','refunded')),
  stripe_payment_intent_id text,
  created_at timestamptz default now(),
  confirmed_at timestamptz,
  charged_at timestamptz,
  cancelled_at timestamptz,
  unique(session_id, attendee_id)           -- one hold per person per session
);

-- ─── RATINGS ──────────────────────────────────────────────────────────────────
create table public.ratings (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references public.sessions(id) on delete cascade,
  attendee_id uuid references public.attendees(id) on delete cascade,
  host_id uuid references public.hosts(id),
  stars integer not null check (stars between 1 and 5),
  vibe_chips text[] default '{}',
  note_to_host text,
  photo_urls text[] default '{}',
  consent_given boolean default false,
  created_at timestamptz default now(),
  unique(session_id, attendee_id)
);

-- ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null,                    -- attendee or host
  user_type text not null check (user_type in ('attendee','host','admin')),
  type text not null,                       -- DROPPING | CONFIRMED | UPDATE | ACTION | etc.
  session_id uuid references public.sessions(id),
  title text not null,
  body text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- ─── SUGGESTIONS ──────────────────────────────────────────────────────────────
create table public.suggestions (
  id uuid primary key default uuid_generate_v4(),
  suggested_by_id uuid references public.attendees(id),
  session_type text,
  preferred_time text,
  preferred_neighbourhood text,
  notes text,
  vote_count integer default 1,
  created_at timestamptz default now()
);

create table public.suggestion_votes (
  suggestion_id uuid references public.suggestions(id) on delete cascade,
  attendee_id uuid references public.attendees(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (suggestion_id, attendee_id)
);

-- ─── TRIGGERS: UPDATE current_holds WHEN HOLDS CHANGE ────────────────────────

create or replace function update_session_holds()
returns trigger as $$
declare
  hold_count integer;
  min_spots integer;
  max_cap integer;
  fill_pct numeric;
  new_status text;
  new_phase text;
begin
  -- Recalculate hold count for this session
  select count(*) into hold_count
  from public.holds
  where session_id = coalesce(NEW.session_id, OLD.session_id)
    and status in ('held', 'confirmed', 'charged');

  -- Get session thresholds
  select minimum_spots, max_capacity into min_spots, max_cap
  from public.sessions
  where id = coalesce(NEW.session_id, OLD.session_id);

  fill_pct := hold_count::numeric / max_cap::numeric;

  -- Determine status
  if hold_count >= max_cap then
    new_status := 'full';
  elsif fill_pct >= 0.8 then
    new_status := 'almost_full';
  elsif fill_pct >= 0.75 then
    new_status := 'filling';
  elsif hold_count >= min_spots then
    new_status := 'dropping';
  else
    new_status := 'open';
  end if;

  -- Determine phase (simplified — full logic in app)
  if hold_count >= min_spots then
    new_phase := 'HOLD_DROPPING';
  else
    new_phase := 'HOLD_BELOW_MIN';
  end if;

  -- Update session
  update public.sessions
  set
    current_holds = hold_count,
    status = new_status,
    phase = new_phase,
    updated_at = now()
  where id = coalesce(NEW.session_id, OLD.session_id);

  return coalesce(NEW, OLD);
end;
$$ language plpgsql security definer;

create trigger on_hold_change
  after insert or update or delete on public.holds
  for each row execute function update_session_holds();

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
-- Anyone can read sessions
alter table public.sessions enable row level security;
create policy "Sessions are publicly readable" on public.sessions for select using (true);
create policy "Hosts can manage their sessions" on public.sessions
  for all using (host_id in (
    select id from public.hosts where auth_user_id = auth.uid()
  ));

-- Holds: attendees see their own
alter table public.holds enable row level security;
create policy "Attendees see their own holds" on public.holds
  for select using (attendee_id in (
    select id from public.attendees where auth_user_id = auth.uid()
  ));
create policy "Attendees can create holds" on public.holds
  for insert with check (attendee_id in (
    select id from public.attendees where auth_user_id = auth.uid()
  ));

-- Attendees: own profile only
alter table public.attendees enable row level security;
create policy "Attendees see own profile" on public.attendees
  for all using (auth_user_id = auth.uid());

-- Hosts: own profile only
alter table public.hosts enable row level security;
create policy "Hosts see own profile" on public.hosts
  for all using (auth_user_id = auth.uid());

-- Suggestions: everyone can read and create
alter table public.suggestions enable row level security;
create policy "Suggestions publicly readable" on public.suggestions for select using (true);
create policy "Authenticated users can suggest" on public.suggestions
  for insert with check (auth.uid() is not null);

-- ─── REALTIME ────────────────────────────────────────────────────────────────
-- Enable realtime on sessions so price drops push live
-- Run in Supabase dashboard: Database → Replication → enable for 'sessions' table
-- This allows the frontend to subscribe to price changes in real-time.

-- ─── DONE ────────────────────────────────────────────────────────────────────
-- After running this schema:
-- 1. Go to Supabase → Database → Replication → add 'sessions' to realtime
-- 2. Copy your project URL + anon key into .env.local
-- 3. Run: npm run dev
