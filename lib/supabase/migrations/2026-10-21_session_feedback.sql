-- 2026-10-21 · Quick feedback after a session (stretchyyoga.co.nz/rate/[session]).
-- No sign-in needed. Name and email are optional (people choose to add them).
-- If the person happens to be signed in, user_id is kept so answering again
-- updates their row instead of adding a second; HQ never shows it as a name.
-- Answers are a small JSON object keyed by question (lib/feedbackQuestions.ts).
-- RLS on, no public policies: only the server reads and writes. The grant line
-- is what Supabase requires for tables created from 30 Oct 2026. Idempotent.
create table if not exists public.session_feedback (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  session_id  uuid not null,
  user_id     uuid,
  name        text,
  email       text,
  answers     jsonb not null default '{}'::jsonb
);
create unique index if not exists session_feedback_one_per_person on public.session_feedback (session_id, user_id) where user_id is not null;
alter table public.session_feedback enable row level security;
grant select, insert, update, delete on public.session_feedback to service_role;
