-- Keep booking history when someone deletes their account.
--
-- holds.user_id pointed at auth.users with no ON DELETE rule, so deleting a
-- login that had ever booked failed ("Database error deleting user") and the
-- in-app "Delete my account" didn't work for anyone who'd booked.
--
-- Dropping the link fixes that: the account (name, email, login) is deleted,
-- and each booking keeps only an anonymous id with nothing behind it — so
-- HQ → Insights still counts the places, people and repeat visits correctly.
-- Matches the privacy policy: "kept without your name or details, as numbers only".

alter table public.holds drop constraint if exists holds_user_id_fkey;
