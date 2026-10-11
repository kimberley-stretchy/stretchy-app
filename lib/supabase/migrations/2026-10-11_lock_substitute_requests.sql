-- substitute_requests was readable by anyone holding the public (anon) key.
-- Every read/write in the app goes through /api/host/* and /api/admin/* with
-- the service-role key (which bypasses RLS), so enabling RLS with no policies
-- closes public access without changing app behaviour.
alter table public.substitute_requests enable row level security;

drop policy if exists "substitute_requests_public_read" on public.substitute_requests;
