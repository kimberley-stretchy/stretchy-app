-- 2026-10-12 · "Bring with you", per session.
-- Two short lines HQ fills in for each session, shown on Manage my booking and
-- in the email run-through:
--   bring_title — the bold line, e.g. "Your mat & water"
--   bring_note  — the grey line, e.g. "Plus any props you like, and $$ for coffee after."
-- Both optional. If both are empty the row is hidden. Additive and nullable:
-- existing code ignores them. Idempotent.
alter table public.sessions
  add column if not exists bring_title text,
  add column if not exists bring_note  text;
