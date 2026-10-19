-- 2026-10-19 · stretchy.social leads (MVP handover brief, section 6).
-- One row per form submission: the four buttons (waitlist, beta, talk,
-- invest), plus the optional "Help shape Stretchy Social" answers saved onto
-- the same row afterwards. Row level security ON with no policies: only the
-- server can read or write. Idempotent.
create table if not exists public.social_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type text not null check (type in ('waitlist','beta','talk','invest')),
  -- step 1
  name text not null,
  email text not null,
  organisation text,
  group_type text,
  region text,
  country text not null,
  group_size text,
  beta_start text,
  brings text[],
  about text,
  message text,
  opt_in boolean not null default false,
  source text,
  -- step 2 (optional, same row)
  step2_at timestamptz,
  stage text,
  frequency text,
  access text,
  pay_now text[],
  current_tools text[],
  currency text check (currency in ('NZD','AUD','USD','GBP','EUR')),
  monthly_spend text check (monthly_spend in ('0','lt50','50-150','150-400','400+','unsure')),
  takes_cut text,
  integrations text[],
  headache text,
  chat_ok boolean,
  heard_from text,
  founding boolean not null default false  -- first 50 sign-ups
);
create index if not exists social_leads_email_idx on public.social_leads (lower(email), created_at desc);
alter table public.social_leads enable row level security;
