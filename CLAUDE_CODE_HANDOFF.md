# Stretchy — Claude Code Integration Handoff

This document is written for Claude Code (the terminal version of Claude).
Read this first at the start of every integration session.

**Project:** Stretchy Social Movement Club — community-led movement + social connection
**Stack:** Next.js 14 App Router · TypeScript · Tailwind · Supabase · Stripe · Resend · Google Maps · Vercel
**Domain:** stretchy.social
**Design system:** cream #F5EDE3 · ink #1A1A1A · yellow #FFD166 · blue #2C8FE0 · purple #A535C7 · olive #7A8330 · red #E63946 · orange #FF6B35

---

## Project context

Stretchy is a community movement platform. People hold a place at local sessions (yoga, pilates, breathwork, sound bath, run club, dance, HIIT). The price drops as more people join — minimum spots confirm the session, maximum capacity sets the floor price. After the session there's a "social stretch" — coffee, matcha, wine, whatever.

**Core pricing mechanic:**
- Host sets a target earnings amount
- Starting price = (hostTarget + $23 Stretchy fee) ÷ minimumSpots
- Price drops as each new person holds a place
- Floor price = (hostTarget + $23) ÷ maxCapacity
- At 24hr out: if minimum is met → confirmed; if not → cancelled + full refund
- At 2hr out: price locks, all Stripe payment intents are captured

**Key files to always read before starting:**
- `types/index.ts` — all data interfaces
- `lib/pricing.ts` — pricing engine (do not modify the formulas)
- `lib/supabase/client.ts` — Supabase browser client
- `middleware.ts` — auth route protection
- `.env.example` — all required environment variables

---

## Current state of the prototype

All screens are built as visual prototypes using mock data. The integration work is replacing mock data with real data sources. Nothing is wired up yet — no real auth, no real payments, no real database.

**Screens that exist (all under /app):**
- `/` — landing
- `/login` — magic link + Apple/Google auth + international waitlist
- `/onboarding` — 3-step signup (name/email/mobile → neighbourhood/movement types → payment)
- `/home` — attendee home feed
- `/sessions` — browse sessions list
- `/sessions/[id]` — session detail + hold button
- `/hold/[id]` — place held confirmation
- `/social-stretch/[id]` — post-session social page
- `/rate/[id]` — rate a session
- `/notifications` — notifications list
- `/profile` — attendee profile + favourites + settings
- `/profile/payment`, `/profile/notifications`, `/profile/invite`, `/profile/help` — sub-screens
- `/suggest` — suggest a session
- `/host/apply` — host application form
- `/host/new-session` — create a session (multi-step)
- `/host/dashboard` — host earnings + stats
- `/host/session/[id]` — manage a session
- `/host/floor-not-met` — 25hr alert (below minimum)
- `/host/inbox` — host messages
- `/host/payout` — monthly payout view
- `/admin` — admin hub
- `/admin/vetting` — host vetting queue
- `/admin/live` — live platform oversight
- `/admin/suggestions` — suggestions pipeline
- `/admin/finance` — transaction log
- `/admin/attendees` — attendee CRM
- `/admin/hosts` — host CRM
- `/admin/moderation` — moderation queue
- `/admin/analytics` — platform analytics
- `/admin/waitlist` — host waitlist

---

## INTEGRATION BUILD ORDER

Work through these in order. Each step is self-contained. Don't skip ahead.

---

### INTEGRATION 1 — GitHub + Vercel deploy (do this first, today)

Get the prototype live before touching any APIs.

**Step 1: Push to GitHub**
```bash
cd "/Users/kimberleytorrie/Documents/Claude/Projects/Stretchy/stretchy-app"
git init
git add .
git commit -m "Stretchy prototype — pre-integration build"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/stretchy-app.git
git push -u origin main
```

**Step 2: Deploy to Vercel**
1. Go to vercel.com → sign up with GitHub
2. "Add New Project" → import stretchy-app
3. Framework preset: Next.js (auto-detected)
4. Add environment variables — copy from `.env.example`, fill in placeholder values for now:
   - `NEXT_PUBLIC_SUPABASE_URL` = placeholder (any string)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = placeholder
   - `NEXT_PUBLIC_APP_URL` = https://stretchy-app.vercel.app (update to stretchy.social later)
5. Deploy → you'll get a live URL like `stretchy-app.vercel.app`

**Step 3: Connect stretchy.social**
1. Vercel project → Settings → Domains → add `stretchy.social`
2. Vercel shows you DNS records → log into your domain registrar → add them
3. Wait 5–30 min → stretchy.social is live

**After this step:** The visual prototype is publicly accessible. No real data yet, but you can share it.

---

### INTEGRATION 2 — Supabase (database + auth + real-time)

**Setup:**
1. supabase.com → new project → name: stretchy → region: Asia Pacific (Sydney)
2. SQL Editor → run this schema:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- HOSTS
create table hosts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  avatar_url text,
  bio text,
  neighbourhood text,
  practice_type text[] default '{}',
  years_experience int,
  is_certified boolean default false,
  has_first_aid boolean default false,
  instagram text,
  tiktok text,
  website text,
  substack text,
  sessions_hosted int default 0,
  rating_average numeric(3,2),
  rating_count int default 0,
  vetting_status text default 'pending', -- pending | approved | rejected
  vetting_expires_at timestamptz,
  bank_account_added boolean default false,
  stripe_account_id text,
  created_at timestamptz default now()
);

-- ATTENDEES
create table attendees (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  avatar_url text,
  neighbourhood text,
  stripe_customer_id text,
  payment_method_id text,
  sessions_attended int default 0,
  notification_email boolean default true,
  notification_sms boolean default true,
  notification_push boolean default true,
  created_at timestamptz default now()
);

-- SESSIONS
create table sessions (
  id uuid primary key default uuid_generate_v4(),
  host_id uuid references hosts(id) on delete cascade,
  title text not null,
  description text,
  session_type text not null,
  duration_minutes int not null default 60,
  starts_at timestamptz not null,
  neighbourhood text not null,
  venue_name text not null,
  venue_address text not null,
  venue_lat numeric(10,7),
  venue_lng numeric(10,7),
  venue_notes text,
  max_capacity int not null,
  minimum_spots int not null,
  host_target numeric(10,2) not null,
  current_holds int default 0,
  confirmed_spots int default 0,
  phase text default 'HOLD_BELOW_MIN',
  status text default 'open',
  social_stretch_venue text,
  social_stretch_details text,
  is_repeat boolean default false,
  repeat_frequency text,
  is_charity boolean default false,
  charity_name text,
  charity_website text,
  charity_instagram text,
  charity_note text,
  created_at timestamptz default now(),
  confirmed_at timestamptz,
  locked_at timestamptz,
  cancelled_at timestamptz
);

-- HOLDS
create table holds (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references sessions(id) on delete cascade,
  attendee_id uuid references attendees(id) on delete cascade,
  price_at_hold numeric(10,2) not null,
  price_paid numeric(10,2),
  notes_for_host text, -- SENSITIVE: only host + admin can read
  status text default 'held', -- held | confirmed | cancelled | charged | refunded
  stripe_payment_intent_id text,
  stripe_charge_id text,
  created_at timestamptz default now(),
  confirmed_at timestamptz,
  charged_at timestamptz,
  unique(session_id, attendee_id)
);

-- FAVOURITES
create table user_favourites (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  session_id uuid references sessions(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, session_id)
);

-- RATINGS
create table ratings (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid references sessions(id) on delete cascade,
  attendee_id uuid references attendees(id) on delete cascade,
  stars int not null check (stars between 1 and 5),
  vibe_chips text[] default '{}',
  note_to_host text,
  photo_urls text[] default '{}',
  photo_consent boolean default false,
  created_at timestamptz default now(),
  unique(session_id, attendee_id)
);

-- SUGGESTIONS
create table suggestions (
  id uuid primary key default uuid_generate_v4(),
  suggested_by_id uuid references attendees(id),
  session_type text not null,
  preferred_time text,
  preferred_neighbourhood text,
  notes text,
  vote_count int default 1,
  created_at timestamptz default now()
);

-- INTERNATIONAL WAITLIST
create table international_waitlist (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null unique,
  city text not null,
  country text not null,
  role text not null, -- mover | host | both
  created_at timestamptz default now()
);

-- DB TRIGGER: keep current_holds count accurate
create or replace function update_session_holds()
returns trigger as $$
begin
  update sessions
  set current_holds = (
    select count(*) from holds
    where session_id = coalesce(new.session_id, old.session_id)
    and status in ('held', 'confirmed', 'charged')
  )
  where id = coalesce(new.session_id, old.session_id);
  return new;
end;
$$ language plpgsql;

create trigger holds_count_trigger
after insert or update or delete on holds
for each row execute function update_session_holds();
```

**Row Level Security (RLS) — paste these after the schema:**
```sql
-- Enable RLS on all tables
alter table hosts enable row level security;
alter table attendees enable row level security;
alter table sessions enable row level security;
alter table holds enable row level security;
alter table user_favourites enable row level security;
alter table ratings enable row level security;
alter table suggestions enable row level security;
alter table international_waitlist enable row level security;

-- Sessions: anyone can read, only hosts can insert/update their own
create policy "sessions_read_all" on sessions for select using (true);
create policy "sessions_host_insert" on sessions for insert with check (
  host_id in (select id from hosts where user_id = auth.uid())
);
create policy "sessions_host_update" on sessions for update using (
  host_id in (select id from hosts where user_id = auth.uid())
);

-- Holds: attendee sees their own; host sees holds on their sessions; notes_for_host is restricted
create policy "holds_own" on holds for select using (
  attendee_id in (select id from attendees where user_id = auth.uid())
);
create policy "holds_host_read" on holds for select using (
  session_id in (
    select id from sessions where host_id in (
      select id from hosts where user_id = auth.uid()
    )
  )
);

-- Favourites: own only
create policy "favourites_own" on user_favourites for all using (user_id = auth.uid());

-- Attendees: own profile only
create policy "attendees_own" on attendees for all using (user_id = auth.uid());
```

**Enable Supabase Realtime on the sessions table:**
- Dashboard → Database → Replication → toggle ON for `sessions`
- This powers the live price-drop updates in `lib/supabase/client.ts`

**Claude Code task — replace mock data:**
```
Read CLAUDE_CODE_HANDOFF.md. Then:
1. Replace MOCK_SESSIONS in app/sessions/page.tsx with a Supabase query that fetches sessions where starts_at > now() and phase != 'CANCELLED', ordered by starts_at asc.
2. Replace MOCK_SESSION in app/sessions/[id]/page.tsx with a Supabase query using the [id] param.
3. Wire up the useFavourites hook to save/remove from the user_favourites table when the user is logged in, falling back to localStorage when not.
4. Wire up the international waitlist form in app/login/page.tsx to insert into the international_waitlist table.
Use the createClient() function from lib/supabase/client.ts for all queries.
```

---

### INTEGRATION 3 — Stripe (payments)

**Setup:**
1. stripe.com → create account → enable NZD under Settings → Business → Bank accounts
2. Dashboard → Developers → API Keys → copy TEST keys first
3. Add to Vercel environment variables and `.env.local`:
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...` (created in step 5)
4. Install Stripe: `npm install stripe @stripe/stripe-js @stripe/react-stripe-js`

**Replace raw card inputs with Stripe Elements:**

Claude Code task:
```
Read CLAUDE_CODE_HANDOFF.md. The onboarding page at app/onboarding/page.tsx currently has raw card number / expiry / CVC inputs in Step 3. Replace these with a Stripe Elements CardElement component. The component should:
- Load Stripe with the NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- Use Elements provider wrapping just the payment step
- On submit: call stripe.createPaymentMethod() to get a paymentMethodId
- Save the paymentMethodId to the Supabase attendees table (NOT the raw card numbers)
Never store raw card data — Stripe handles that entirely.
```

**Set up Stripe webhook:**
1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://stretchy.social/api/stripe/webhook`
3. Events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. Copy the webhook secret → add as `STRIPE_WEBHOOK_SECRET`

Claude Code task for webhook:
```
Create app/api/stripe/webhook/route.ts. This should:
- Verify the Stripe webhook signature using STRIPE_WEBHOOK_SECRET
- On payment_intent.succeeded: update the matching hold in Supabase to status 'charged'
- On payment_intent.payment_failed: update hold to status 'cancelled', send cancellation email via Resend
- On charge.refunded: update hold to status 'refunded'
```

**The hold → capture flow** (already scaffolded at `app/api/holds/route.ts`):

Claude Code task:
```
Uncomment and complete the Supabase + Stripe logic in app/api/holds/route.ts. The flow is:
1. Fetch session from Supabase to get current pricing
2. Calculate price using calculatePrice() from lib/pricing.ts
3. Create Stripe PaymentIntent with capture_method: "manual" (authorize only)
4. Insert hold row in Supabase with stripe_payment_intent_id
The DB trigger will automatically update current_holds, which triggers real-time price updates.
```

**The lock-in cron** (scaffolded at `app/api/stripe/charge-all/route.ts`):

Claude Code task:
```
Uncomment and complete the lock-in logic in app/api/stripe/charge-all/route.ts. Also create app/api/cron/lock-sessions/route.ts as a Vercel cron that runs every 15 minutes, finds sessions with starts_at between now+2h and now+2h15m, and calls charge-all for each one.
Add to vercel.json:
{
  "crons": [
    { "path": "/api/cron/lock-sessions", "schedule": "*/15 * * * *" },
    { "path": "/api/cron/confirm-sessions", "schedule": "0 * * * *" }
  ]
}
Also create the confirm-sessions cron that runs hourly, finds sessions hitting the 24hr window, checks if minimum_spots is met, confirms or cancels them, and updates Supabase accordingly.
```

---

### INTEGRATION 4 — Resend (transactional email)

**Setup:**
1. resend.com → create account → add domain stretchy.social
2. Follow their DNS verification steps (adds SPF/DKIM records to your domain)
3. API Keys → create key → add as `RESEND_API_KEY`
4. Install: `npm install resend`

**Claude Code task:**
```
Create lib/email/index.ts with five email-sending functions using Resend. Each should accept typed parameters and send a transactional email from hello@stretchy.social:

1. sendHoldConfirmation(to, sessionTitle, day, time, neighbourhood, priceAtHold, holdId)
   Subject: "You're in the mix — [sessionTitle]"
   Body: confirms hold, shows price they locked in, link to /hold/[id]

2. sendSessionConfirmed(to, sessionTitle, day, time, venue, currentPrice, sessionId)
   Subject: "It's happening — [sessionTitle]"
   Body: session is confirmed, final price, venue address, add-to-calendar link

3. sendSessionCancelled(to, sessionTitle, day, refundAmount)
   Subject: "Didn't get there this time — [sessionTitle]"
   Body: didn't hit minimum, full refund incoming, link to browse other sessions

4. sendReceipt(to, sessionTitle, day, pricePaid, stripeChargeId)
   Subject: "Receipt — [sessionTitle]"
   Body: payment confirmed, amount, Stripe charge reference, link to rate the session after

5. sendHostPayout(to, hostName, sessionTitle, grossAmount, stretchyFee, netAmount, payoutDate)
   Subject: "Your payout is on the way — [sessionTitle]"
   Body: session summary, earnings breakdown, expected bank arrival date

Use plain HTML emails that match the Stretchy brand: cream background #F5EDE3, ink text #1A1A1A, Space Grotesk or system font, and the yellow #FFD166 for CTA buttons.
```

Then wire up each function to the relevant API routes and cron jobs.

---

### INTEGRATION 5 — Google Maps

**Setup:**
1. console.cloud.google.com → create project "stretchy"
2. Enable: Maps JavaScript API, Places API, Geocoding API
3. Create API key → restrict to your domain (stretchy.social)
4. Add as `NEXT_PUBLIC_GOOGLE_MAPS_KEY`
5. Install: `npm install @googlemaps/js-api-loader`

**Claude Code task:**
```
Create a reusable component components/SessionMap.tsx that:
- Accepts lat, lng, venueName, venueAddress as props
- Loads the Google Maps JS API using NEXT_PUBLIC_GOOGLE_MAPS_KEY
- Shows a single map pin at the venue location
- Uses the Stretchy brand: custom pin in #A535C7 (purple), dark map style (#1A1A1A roads, #F5EDE3 land)
- Is lazy-loaded (only loads the Maps SDK when the component is in view)
- Falls back to a "View on Google Maps" link if the API fails

Then add <SessionMap> to app/sessions/[id]/page.tsx below the venue address, using the venue_lat and venue_lng from the session data.
```

**Add venue geocoding to host session creation:**
```
In app/host/new-session/page.tsx, add a Google Places Autocomplete input for the venue address field. When the host selects a venue:
- Auto-fill the venue_name from the Places result
- Store venue_lat and venue_lng in the form state
- These get saved to Supabase when the session is created
Use the Places API with types=['establishment', 'geocode'] biased toward Auckland NZ (lat: -36.8485, lng: 174.7633, radius: 50000m).
```

---

### INTEGRATION 6 — Calendar links (add to calendar)

No SDK needed — these are URL-based.

**Claude Code task:**
```
Create lib/calendar.ts with three functions:

1. getGoogleCalendarUrl(title, startISO, endISO, location, description): string
   Returns a google.com/calendar/render?action=TEMPLATE URL with all fields encoded.

2. getAppleCalendarUrl(title, startISO, endISO, location, description): string
   Returns a data: URI for a .ics file that Safari/Apple Calendar can open directly.

3. getICSFileContent(title, startISO, endISO, location, description): string
   Returns a valid iCalendar (.ics) string for download, including:
   - VCALENDAR wrapper
   - VEVENT with UID, DTSTART, DTEND, SUMMARY, LOCATION, DESCRIPTION
   - METHOD:PUBLISH

Then add an "Add to calendar" button to:
- app/notifications/going-ahead/page.tsx — shown after session is confirmed
- app/hold/[id]/page.tsx — shown on the held confirmation screen
- The button should show a small dropdown: Google Calendar | Apple Calendar | Download .ics
```

---

### INTEGRATION 7 — Social links + working URLs

**Claude Code task:**
```
Audit all hardcoded social links and placeholder hrefs across the app. For each file:

1. app/sessions/[id]/page.tsx
   - Host instagram link: replace # with https://instagram.com/[host.instagram] (only render if host.instagram exists)
   - Host tiktok link: https://tiktok.com/@[host.tiktok]
   - Host website link: host.website (use as-is, ensure it has https://)
   - Charity instagram: https://instagram.com/[charity.instagram]
   - Charity website: use charity.website directly

2. app/host/apply/page.tsx
   - Stripe terms link: https://stripe.com/nz/legal/connect-account
   - Host terms link: https://stretchy.social/terms (create a placeholder /terms page)

3. app/profile/page.tsx
   - Invite a mate: update href to /profile/invite (already exists as a page)
   - Become a host: /host/apply (already exists)
   - Help & contact: mailto:hello@stretchy.social

4. app/home/page.tsx + app/layout.tsx
   - Any remaining # hrefs: either wire up to real routes or remove the link wrapper

5. Create app/terms/page.tsx — a simple placeholder page:
   "Terms & conditions coming soon. Email hello@stretchy.social with any questions."

6. Create app/privacy/page.tsx — a simple placeholder page with:
   - What data Stretchy collects (name, email, mobile, neighbourhood, movement preferences, payment method via Stripe, notes for host)
   - How it's used (session matching, notifications, payouts)
   - Third parties: Stripe (payments), Resend (email), Supabase (database), Vercel (hosting)
   - How to request deletion: email hello@stretchy.social
   - NZ Privacy Act 2020 compliance note
```

---

### INTEGRATION 8 — Host CRM (Supabase-backed admin)

**Claude Code task:**
```
Replace the mock data in these admin screens with real Supabase queries:
- app/admin/attendees/page.tsx — query attendees table, order by created_at desc
- app/admin/hosts/page.tsx — query hosts table with sessions_hosted count and rating_average
- app/admin/vetting/page.tsx — query hosts where vetting_status = 'pending', order by created_at asc
- app/admin/finance/page.tsx — query holds where status in ('charged', 'refunded'), join sessions and attendees
- app/admin/waitlist/page.tsx — query international_waitlist, order by created_at desc

All admin routes are already protected by middleware.ts — they require role = 'admin' in user_metadata.
To make yourself admin, run in Supabase SQL editor:
  update auth.users set raw_user_meta_data = raw_user_meta_data || '{"role":"admin"}' where email = 'kimberleytorrie@gmail.com';
```

---

### INTEGRATION 9 — Stripe Connect (host payouts)

This is the final integration — host bank account connection and automated payouts.

**Claude Code task:**
```
Set up Stripe Connect for host payouts:

1. In Stripe Dashboard → Settings → Connect → enable Connect platform
2. Create app/api/stripe/connect/route.ts:
   - POST: creates a Stripe Connect account for the host, returns the onboarding URL
   - Redirect the host to Stripe's onboarding flow from app/host/apply/page.tsx after form submission

3. Create app/api/stripe/payout/route.ts:
   - Called by the cron after a session is charged
   - Transfers the host_target amount to their Stripe Connect account
   - Updates the session in Supabase with payout_sent_at

4. Update app/host/payout/page.tsx to fetch real payout history from Stripe Connect for the logged-in host.
```

---

## Environment variables checklist

Copy `.env.example` → `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=              # supabase.com → project → Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=         # same place, "anon public" key
SUPABASE_SERVICE_ROLE_KEY=             # same place, "service_role" key (never expose client-side)

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=    # stripe.com → Developers → API Keys → Publishable
STRIPE_SECRET_KEY=                     # stripe.com → Developers → API Keys → Secret
STRIPE_WEBHOOK_SECRET=                 # stripe.com → Developers → Webhooks → signing secret

RESEND_API_KEY=                        # resend.com → API Keys
EMAIL_FROM=hello@stretchy.social

NEXT_PUBLIC_APP_URL=https://stretchy.social
NEXT_PUBLIC_GOOGLE_MAPS_KEY=           # console.cloud.google.com → Maps JS API

CRON_SECRET=                           # generate a random string: openssl rand -hex 32
```

After adding to `.env.local`, also add all of these to Vercel:
Project → Settings → Environment Variables → add each one.

---

## Git workflow

After each integration session:
```bash
git add .
git commit -m "Integration 2: Supabase sessions + auth"
git push
```

Vercel auto-deploys on every push to main. If something breaks:
```bash
git stash          # rolls back uncommitted changes instantly
# or
git revert HEAD    # reverts last commit but keeps the history
```

---

## How to start a Claude Code session

```bash
cd "/Users/kimberleytorrie/Documents/Claude/Projects/Stretchy/stretchy-app"
claude
```

At the start of every session, say:
> "Read CLAUDE_CODE_HANDOFF.md and tell me what integration we're on."

Claude Code will read this file, understand the full project, and pick up where you left off.

---

## Questions / decisions still open

- **NZ bank account for Stripe payouts:** Stretchy needs a NZ business bank account to receive the Stretchy platform fee portion. Stripe Connect handles the host payout — the $23 Stretchy fee per session goes to your Stripe balance, then to your bank.
- **Push notifications:** Not included in this build. If you want them later, use Supabase + Expo Notifications (if going native) or Web Push API.
- **SMS notifications:** Twilio or MessageBird both have NZ coverage. Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` to your env vars and wire up in the cron jobs alongside Resend emails.
- **Repeat sessions:** The `is_repeat` and `repeat_frequency` fields are in the schema — the UI to create repeating sessions is partially built in `app/host/new-session/page.tsx`. Full automation (auto-create future sessions) is a cron job task for Integration 3.
