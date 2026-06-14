-- Restore the standard table/sequence DML grants for the PostgREST API roles.
--
-- These privileges (SELECT/INSERT/UPDATE/DELETE on public tables for
-- anon/authenticated/service_role) are normally applied by Supabase's platform
-- bootstrap, but they were never captured in a migration — so a `supabase db
-- reset` on a CLI/stack that doesn't replay them leaves every public table with
-- only REFERENCES/TRIGGER/TRUNCATE. The app then can't read `profiles` (the
-- account menu falls back to "Player") or insert into `games` ("permission
-- denied for table games"), etc. Capturing the grants here makes the schema
-- self-contained and reset-proof; on environments that already have them (e.g.
-- Supabase Cloud / production) re-granting is idempotent and harmless.
--
-- RLS still gates every row — these are the table-level grants RLS sits on top
-- of. Deliberately scoped to TABLES and SEQUENCES only, NOT routines, so the
-- function-level `revoke execute … from public, anon` hardening elsewhere
-- (handle_new_user, create_game_state_row, get_user_game_ids, transfer_*, …)
-- is preserved.

grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;
grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;

-- Apply the same defaults to objects future migrations create in this schema.
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;
