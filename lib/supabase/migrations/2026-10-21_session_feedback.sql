-- 2026-10-21 · Quick feedback after a session (stretchyyoga.co.nz/rate/[session]).
-- One row per person per session; answering again updates it. Answers are a
-- small JSON object keyed by question (see lib/feedbackQuestions.ts).
-- RLS on, no public policies: only the server reads and writes. The grant line
-- is what Supabase requires for tables created from 30 Oct 2026. Idempotent.
create table if not exists public.session_feedback (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  session_id  uuid not null,
  user_id     uuid not null,
  hide_name   boolean not null default false,
  answers     jsonb not null default '{}'::jsonb
);
create unique index if not exists session_feedback_one_per_person on public.session_feedback (session_id, user_id);
alter table public.session_feedback enable row level security;
grant select, insert, update, delete on public.session_feedback to service_role;
