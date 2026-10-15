-- 2026-10-16 · A phone number on each teacher / GEM profile, editable by HQ
-- (Profiles → Teachers / GEMs) and by the person themselves (team view).
-- Additive and nullable. Idempotent.
alter table public.hosts
  add column if not exists phone text;
