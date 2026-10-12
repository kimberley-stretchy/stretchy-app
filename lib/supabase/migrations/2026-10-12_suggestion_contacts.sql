-- 2026-10-12 · Who suggested a Stretchy, and whether they want to hear if it
-- goes ahead. Kept in its OWN table, not as columns on `suggestions`, because
-- `suggestions` is publicly readable (the /suggest board) and names/emails must
-- never be. RLS is on with no policies, so only the service role (our API
-- routes) can read or write it. Run in the Supabase SQL editor. Idempotent.
create table if not exists public.suggestion_contacts (
  id            uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references public.suggestions(id) on delete cascade,
  name          text,
  email         text not null,
  notify        boolean not null default true,   -- opted in to hear if this one goes ahead
  created_at    timestamptz not null default now()
);

create index if not exists suggestion_contacts_suggestion_idx on public.suggestion_contacts (suggestion_id);

alter table public.suggestion_contacts enable row level security;
