-- Security + performance hardening based on the Supabase advisor lints.
-- Two intertwined concerns handled together because the policy rewrites and
-- the get_user_game_ids signature change have to happen consistently:
--
--   * Add covering indexes for every foreign key (lint 0001).
--   * Pin search_path on the update_updated_at trigger helper (lint 0011).
--   * Rewrite get_user_game_ids to take no arguments and use auth.uid()
--     internally. The previous (uuid) signature was callable via
--     /rest/v1/rpc and returned game memberships for an arbitrary user
--     (lint 0028 + 0029) — a real info disclosure. The new no-arg form
--     reveals only the caller's own memberships, which is all the RLS
--     policies ever wanted from it.
--   * Wrap auth.uid() in (select auth.uid()) inside every RLS policy so
--     the planner evaluates it once per query rather than per row
--     (lint 0003). Same change applies to the get_user_game_ids() call.
--   * Revoke EXECUTE from public/anon/authenticated on trigger-only
--     functions (handle_new_user, create_game_state_row). Triggers fire
--     regardless; only the /rest/v1/rpc/* path is removed.
--   * Revoke anon EXECUTE on find_game_by_invite_code — authenticated
--     keeps it (intentional: that's how players look up a game to join).

-- ============================================================
-- PERFORMANCE: cover every foreign key with an index
-- ============================================================
create index if not exists characters_game_id_idx     on public.characters(game_id);
create index if not exists characters_user_id_idx     on public.characters(user_id);
create index if not exists dice_rolls_character_id_idx on public.dice_rolls(character_id);
create index if not exists dice_rolls_game_id_idx     on public.dice_rolls(game_id);
create index if not exists dice_rolls_user_id_idx     on public.dice_rolls(user_id);
create index if not exists game_members_user_id_idx   on public.game_members(user_id);
create index if not exists games_gm_id_idx            on public.games(gm_id);
create index if not exists shared_notes_game_id_idx   on public.shared_notes(game_id);
create index if not exists shared_notes_updated_by_idx on public.shared_notes(updated_by);

-- ============================================================
-- SECURITY: pin search_path on the trigger helper
-- ============================================================
alter function public.update_updated_at() set search_path = '';

-- ============================================================
-- SECURITY: trigger-only functions don't need external EXECUTE
-- ============================================================
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.create_game_state_row() from public, anon, authenticated;

-- ============================================================
-- SECURITY: invite-code lookup is for signed-in players only
-- ============================================================
revoke execute on function public.find_game_by_invite_code(text) from anon;

-- ============================================================
-- SECURITY + PERFORMANCE: replace get_user_game_ids(uuid) with
-- a no-arg form that always uses auth.uid(). The old form is
-- dropped at the very end, after every policy has switched
-- over, so no policy is briefly broken.
-- ============================================================
create or replace function public.get_user_game_ids()
returns setof uuid
language sql
security definer
set search_path = ''
stable
as $$
  select game_id from public.game_members where user_id = auth.uid();
$$;
revoke execute on function public.get_user_game_ids() from public, anon;
grant execute on function public.get_user_game_ids() to authenticated;

-- ============================================================
-- PERFORMANCE: rewrite every RLS policy so auth.uid() and the
-- get_user_game_ids() call evaluate once per query, not per row.
-- ============================================================

-- profiles ------------------------------------------------------
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using ((select auth.uid()) = id);

-- games ---------------------------------------------------------
drop policy if exists "Game members can view game" on public.games;
create policy "Game members can view game"
  on public.games for select to authenticated
  using (
    gm_id = (select auth.uid())
    or id in (select public.get_user_game_ids())
  );

drop policy if exists "GM can update game" on public.games;
create policy "GM can update game"
  on public.games for update to authenticated
  using (gm_id = (select auth.uid()));

drop policy if exists "Authenticated users can create games" on public.games;
create policy "Authenticated users can create games"
  on public.games for insert to authenticated
  with check (gm_id = (select auth.uid()));

drop policy if exists "GM can delete game" on public.games;
create policy "GM can delete game"
  on public.games for delete to authenticated
  using (gm_id = (select auth.uid()));

-- game_members --------------------------------------------------
drop policy if exists "Members can view other members in their games" on public.game_members;
create policy "Members can view other members in their games"
  on public.game_members for select to authenticated
  using (game_id in (select public.get_user_game_ids()));

drop policy if exists "Users can insert themselves" on public.game_members;
create policy "Users can insert themselves"
  on public.game_members for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "GM or self can remove members" on public.game_members;
create policy "GM or self can remove members"
  on public.game_members for delete to authenticated
  using (
    user_id = (select auth.uid())
    or game_id in (select g.id from public.games g where g.gm_id = (select auth.uid()))
  );

-- characters ----------------------------------------------------
drop policy if exists "Game members can view characters" on public.characters;
create policy "Game members can view characters"
  on public.characters for select to authenticated
  using (game_id in (select public.get_user_game_ids()));

drop policy if exists "Owner can update own character" on public.characters;
create policy "Owner can update own character"
  on public.characters for update to authenticated
  using (
    user_id = (select auth.uid())
    or game_id in (select g.id from public.games g where g.gm_id = (select auth.uid()))
  );

drop policy if exists "Members can create characters" on public.characters;
create policy "Members can create characters"
  on public.characters for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and game_id in (select public.get_user_game_ids())
  );

drop policy if exists "Owner or GM can delete character" on public.characters;
create policy "Owner or GM can delete character"
  on public.characters for delete to authenticated
  using (
    user_id = (select auth.uid())
    or game_id in (select g.id from public.games g where g.gm_id = (select auth.uid()))
  );

-- dice_rolls ----------------------------------------------------
drop policy if exists "Members see non-hidden rolls" on public.dice_rolls;
create policy "Members see non-hidden rolls"
  on public.dice_rolls for select to authenticated
  using (
    game_id in (select public.get_user_game_ids())
    and (is_hidden = false or user_id = (select auth.uid()))
  );

drop policy if exists "Members can create rolls" on public.dice_rolls;
create policy "Members can create rolls"
  on public.dice_rolls for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and game_id in (select public.get_user_game_ids())
  );

-- shared_notes --------------------------------------------------
drop policy if exists "Game members can manage notes" on public.shared_notes;
create policy "Game members can manage notes"
  on public.shared_notes for all to authenticated
  using (game_id in (select public.get_user_game_ids()));

-- game_state ----------------------------------------------------
drop policy if exists "Game members can view game state" on public.game_state;
create policy "Game members can view game state"
  on public.game_state for select to authenticated
  using (game_id in (select public.get_user_game_ids()));

drop policy if exists "Game members can update game state" on public.game_state;
create policy "Game members can update game state"
  on public.game_state for update to authenticated
  using (game_id in (select public.get_user_game_ids()));

-- ============================================================
-- Cleanup: nothing references the old (uuid) signature now.
-- ============================================================
drop function if exists public.get_user_game_ids(uuid);
