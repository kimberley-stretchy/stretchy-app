-- ─────────────────────────────────────────────────────────────────────────────
-- 2026-11-25 · Team agreement: final price is charged 30 minutes before a
-- session (changed from 2 hours, 18 Nov 2026).
--
-- Copies the latest PUBLISHED agreement (including any edits made in HQ) into a
-- new DRAFT version with that one sentence updated. Nothing changes for the
-- team until Kimberley publishes it from HQ → Team portal → Agreement.
-- Publishing a new version asks every teacher and GEM to accept it again.
--
-- Safe to run twice: does nothing if a draft already exists, or if the
-- published version no longer says "2 hours".
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.portal_agreements (version, title, body, body_teacher, body_gem, body_partner)
select
  latest.version + 1,
  latest.title,
  replace(latest.body,         'locked 2 hours before the session', 'locked 30 minutes before the session'),
  replace(latest.body_teacher, 'locked 2 hours before the session', 'locked 30 minutes before the session'),
  replace(latest.body_gem,     'locked 2 hours before the session', 'locked 30 minutes before the session'),
  replace(latest.body_partner, 'locked 2 hours before the session', 'locked 30 minutes before the session')
from (
  select * from public.portal_agreements
  where published_at is not null
  order by version desc
  limit 1
) latest
where not exists (select 1 from public.portal_agreements where published_at is null)
  and concat(latest.body, latest.body_teacher, latest.body_gem, latest.body_partner) like '%locked 2 hours before the session%';
