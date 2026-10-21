-- 2026-10-22 · stretchy.social/research — the market research survey.
-- One row per response. Contact details are optional (anonymous is fine).
-- Answers are a JSON object keyed by question (lib/socialResearch.ts).
-- RLS on, no public policies: only the server reads and writes. The grant line
-- is what Supabase requires for tables created from 30 Oct 2026. Idempotent.
create table if not exists public.social_research (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  name          text,
  organisation  text,
  email         text,
  website       text,
  source        text,
  answers       jsonb not null default '{}'::jsonb
);
alter table public.social_research enable row level security;
grant select, insert, update, delete on public.social_research to service_role;
