# Stretchy app: notes for Claude Code

- Kimberley is new to coding. Talk changes through step by step, in plain language.
- All customer-facing words follow `STRETCHY_WORDS.md`. Read it before writing or changing any copy, email, push notification or error message.
- Policy wording has one source: the Payment & cancellation section of `app/terms/page.tsx` (`/terms#cancellation`). Link to it rather than restating it.
- Current job: `COPY_REFRESH_HANDOVER.md` (final spec). Visual reference: `docs/copy-refresh-mock.html`. Ignore `COPY_REFRESH_HANDOVER_working-notes.md` unless asked.
- Never deploy to production without Kimberley approving a Vercel preview. Never run a database migration on the live project without her OK.
- Any AI agent touching live attendee data must run on commercial terms (API or Team/Enterprise), never a personal login.
