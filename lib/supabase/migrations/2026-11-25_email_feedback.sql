-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-11-25 · "How was this email?" in every email footer
-- (SOCIAL_BOOKING_BRIEF.md section 8).
--
-- email_feedback:            one row per Good / Not great tap, with which email
--                            it was. No name or email address: counts only.
-- session_feedback.email_type: when someone taps "Tell us more" in an email,
--                            their answers remember which email it came from.
-- Only the server (service role) reads or writes these.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.email_feedback (
  id          uuid primary key default gen_random_uuid(),
  email_type  text not null,
  rating      text not null check (rating in ('good', 'not_great')),
  created_at  timestamptz not null default now()
);
create index if not exists email_feedback_type_idx on public.email_feedback (email_type, created_at desc);
alter table public.email_feedback enable row level security;

alter table public.session_feedback add column if not exists email_type text;
