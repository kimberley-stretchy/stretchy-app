-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-11-25 · Invite a mate (SOCIAL_BOOKING_BRIEF.md 0d)
--
-- invite_code: each person's own link, stretchyyoga.co.nz/i/{code}
--              (first name + 4 characters, e.g. "kim7k2q"). Made the first
--              time they open Profile → Invite a mate.
-- invited_by:  who invited someone, saved on their FIRST place held after
--              opening an invite link. Only ever used as a count ("3 people
--              have come to Stretchy through you"), never to show names.
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.attendees
  add column if not exists invite_code text,
  add column if not exists invited_by uuid references public.attendees(id) on delete set null;

create unique index if not exists attendees_invite_code_key on public.attendees (lower(invite_code));
create index if not exists attendees_invited_by_idx on public.attendees (invited_by);
