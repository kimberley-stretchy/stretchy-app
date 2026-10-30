-- 2026-10-30 · Every message the booking pop-up shows someone when something
-- goes wrong (card details, starting the booking, the bank's answer, saving),
-- so HQ can see exactly what people saw. No card details are ever stored.
-- RLS on, no public policies: only the server reads and writes. Idempotent.
create table if not exists public.booking_errors (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  session_id  uuid,
  user_id     uuid,
  email       text,
  stage       text not null,
  message     text,
  code        text,
  quantity    integer
);
create index if not exists booking_errors_session on public.booking_errors (session_id, created_at desc);
alter table public.booking_errors enable row level security;
grant select, insert, update, delete on public.booking_errors to service_role;
