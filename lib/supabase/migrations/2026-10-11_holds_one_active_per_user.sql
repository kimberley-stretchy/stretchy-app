-- holds had unique (session_id, user_id, state). That allows only ONE released
-- row per person per session, so anyone who held, cancelled, then held again
-- could never be released a second time: the update to 'released' hit the
-- constraint and failed silently, leaving the hold 'active'. On a session
-- cancel, one such person made the whole bulk release fail for everyone.
--
-- The rule we actually want is "one ACTIVE hold per person per session";
-- released/charged history rows can repeat.
alter table public.holds drop constraint if exists holds_session_id_user_id_state_key;

create unique index if not exists holds_one_active_per_user
  on public.holds (session_id, user_id)
  where state = 'active';
