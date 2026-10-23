-- 2026-10-23 · HQ Money: the card fee Stripe took on each payment, saved the
-- first time HQ looks it up so it isn't asked for again (lib/stripeFees.ts).
-- Existing table, so no new grant needed. Idempotent.
alter table public.holds add column if not exists stripe_fee_cents integer;
