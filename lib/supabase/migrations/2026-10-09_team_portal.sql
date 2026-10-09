-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-10-09 · Team portal. Per-location run info (venues, contacts, access /
-- alarm codes, weekly instructions) + a team directory + a code of conduct
-- everyone accepts. Edited in HQ (/admin/portal), read by teachers & GEMs at
-- /host/portal — they only see the locations they're assigned to.
--
-- RLS is ON with NO policies: these tables hold door/alarm codes, so the
-- public anon key must never read them. Only the service-role API routes
-- (/api/admin/portal, /api/portal) touch them.
-- Run in the Supabase SQL editor. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.portal_locations (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,           -- "Herne Bay"
  sort_order            integer not null default 0,
  schedule_day          text,                    -- "Friday morning"
  access_time           text,                    -- "6:00am"
  class_time            text,                    -- "6:15–7:15am"

  yoga_venue_name       text,
  yoga_venue_address    text,
  yoga_venue_phone      text,
  yoga_venue_email      text,
  yoga_venue_website    text,
  yoga_contact_name     text,
  yoga_contact_email    text,
  yoga_contact_phone    text,
  yoga_notes            text,                    -- booking info, how to get in, etc.

  social_venue_name     text,
  social_venue_address  text,
  social_venue_phone    text,
  social_venue_email    text,
  social_contact_name   text,
  social_contact_email  text,
  social_contact_phone  text,
  social_notes          text,

  access_codes          text,                    -- door / lockbox / key safe
  alarm_codes           text,
  security_company      text,
  security_phone        text,
  weekly_instructions   text,                    -- what to do each week (setup, pack-down, lock-up)

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table if not exists public.portal_people (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  preferred_name  text,
  role            text not null default 'teacher'
                  check (role in ('owner', 'hq', 'teacher', 'gem', 'partner', 'other')),
  role_label      text,                          -- free text, e.g. "Stretchy Owner"
  email           text,
  phone           text,
  instagram       text,
  tiktok          text,
  other_handles   text,
  on_all_locations boolean not null default false, -- e.g. Kimberley: shown on every location
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Who works which location. A person's email is what links them to their
-- teacher/GEM login, so this is also what decides which locations they see.
create table if not exists public.portal_location_people (
  location_id  uuid not null references public.portal_locations(id) on delete cascade,
  person_id    uuid not null references public.portal_people(id) on delete cascade,
  primary key (location_id, person_id)
);

-- Code of conduct / agreement. `body` is the part for everyone; the role
-- sections are shown to that role (HQ sees all). Light markdown: "## heading",
-- "- bullet", "**bold**". Edits happen on the latest unpublished version;
-- publishing it makes everyone (re)accept.
create table if not exists public.portal_agreements (
  id            uuid primary key default gen_random_uuid(),
  version       integer not null,
  title         text not null default 'Stretchy team agreement',
  body          text not null default '',      -- everyone
  body_teacher  text not null default '',
  body_gem      text not null default '',
  body_partner  text not null default '',
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (version)
);

create table if not exists public.portal_agreement_acceptances (
  agreement_id  uuid not null references public.portal_agreements(id) on delete cascade,
  user_id       uuid not null,
  email         text not null,
  name          text,
  accepted_at   timestamptz not null default now(),
  primary key (agreement_id, user_id)
);

alter table public.portal_locations             enable row level security;
alter table public.portal_people                enable row level security;
alter table public.portal_location_people       enable row level security;
alter table public.portal_agreements            enable row level security;
alter table public.portal_agreement_acceptances enable row level security;

-- ── Seed: the four locations + Kimberley (only if the tables are empty) ─────
do $seed$
begin
  if not exists (select 1 from public.portal_locations) then
    insert into public.portal_locations
      (name, sort_order, schedule_day, access_time, class_time,
       yoga_venue_name, yoga_venue_address, yoga_venue_phone, yoga_venue_email, yoga_venue_website,
       yoga_contact_name, yoga_contact_email, yoga_contact_phone, yoga_notes,
       social_venue_name, social_venue_address, social_venue_phone, social_venue_email,
       social_contact_name, social_contact_email, social_contact_phone, social_notes)
    values
      ('Herne Bay', 1, 'Friday morning', '6:00am', '6:15–7:15am',
       'Bayfield School (Hall)', '2/12 Clifton Road, Herne Bay, Auckland 1011', '09 376 5703', null, null,
       'Liz De Leun', 'lizd@bayfield.school.nz', null, null,
       'Honey Sundays', '203 Jervois Road, Herne Bay, Auckland 1011', null, 'hello@honeysundays.co.nz',
       'Elyse Toomey (Owner)', 'hello@honeysundays.co.nz', null, 'Anton is the Manager.'),

      ('Ponsonby', 2, 'Thursday evening', '6:30pm', '6:45–7:45pm',
       'Johnny Mitchell Hall, Ponsonby Community Centre', '20 Ponsonby Terrace, Ponsonby, Auckland 1011', '09 378 1752', 'info@ponsonbycommunity.org.nz', 'https://ponsonbycommunity.org.nz/venue-hire/',
       'Lisa Rogers (Manager)', 'info@ponsonbycommunity.org.nz', null, null,
       'Beau', '265 Ponsonby Road, Ponsonby, Auckland 1011', '09 218 5137', 'kiaora@beauponsonby.co.nz',
       'Marlies (Manager)', 'kiaora@beauponsonby.co.nz', null, null),

      ('St Heliers', 3, 'Thursday evening', '6:00pm', '6:15–7:15pm',
       'Tāmaki Ex-Services Association Hall', '19 Turua Street, St Heliers, Auckland', null, 'venuehire@aucklandcouncil.govt.nz', null,
       'Auckland Council venue hire', 'venuehire@aucklandcouncil.govt.nz', null, 'Booked via Auckland Council.',
       'Water Boy', '413 Tamaki Drive, St Heliers, Auckland', null, null,
       'Victoria (Owner)', 'vicroria@waterboystheliers.co.nz', '021 176 6509', null),

      ('Orakei', 4, null, '5:45am', '6:00–7:00am',
       null, null, null, null, null,
       null, null, null, 'Yoga venue to come.',
       'Good Day Cafe', '3/78 Coates Avenue, Orakei, Auckland 1071', '09 529 5048', null,
       'Jacqui & Dan (Owners)', null, '021 253 1041', null);
  end if;

  if not exists (select 1 from public.portal_people) then
    insert into public.portal_people
      (name, preferred_name, role, role_label, email, phone, on_all_locations, sort_order)
    values
      ('Kimberley Torrie', 'Kimberley', 'owner', 'Stretchy Owner', 'kimberley@stretchyyoga.co.nz', '021 209 0435', true, 0);
  end if;
end
$seed$;
