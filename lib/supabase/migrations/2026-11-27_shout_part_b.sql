-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-11-27 · Shout a mate, part B: cancelling (SOCIAL_BOOKING_BRIEF.md 4).
--
-- declined_at: the mate tapped "I can't make it" inside 36 hrs out. The place
--   stays paid (no free cancelling from there) so the giver can pass the link
--   on; this stops us telling the giver twice.
-- resent_at: the giver tapped "Send it again" (once per shout, so it can't
--   be used to keep emailing someone).
-- rebook_of: a shout made to re-book a mate after we called a session off.
--   Once it's paid, the old one is refunded in full.
--
-- States used by part B:
--   cancelled → we called the session off; the giver chooses re-book or refund
--               (no choice in 7 days → refunded automatically)
--   released  → the mate can't make it (up to 36 hrs out); giver refunded
--   refunded  → refunded in full (giver cancelled, chose a refund, or re-booked)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.shouts add column if not exists declined_at timestamptz;
alter table public.shouts add column if not exists resent_at timestamptz;
alter table public.shouts add column if not exists rebook_of uuid references public.shouts(id) on delete set null;
create index if not exists shouts_cancelled_idx on public.shouts (state, cancelled_at) where state = 'cancelled';
