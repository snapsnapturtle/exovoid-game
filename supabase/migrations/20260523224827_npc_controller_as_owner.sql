-- Switch NPC permissions to Model B: the controller is the owner.
--
-- A single role determines every right: SELECT, UPDATE, DELETE all gate on
-- (controller_user_id = caller) OR (caller is the game's GM). The creator
-- (`user_id` column) becomes purely historical — they can no longer manage
-- the NPC after the controller field is reassigned.
--
-- Visibility (`visible_to_players = true`) is the only path that keeps the
-- wider game-member SELECT open, so players can still read NPCs the GM has
-- chosen to reveal.
--
-- The `update_npc_flags` RPC is dropped — banner edits now flow through the
-- same UPDATE policy as stat edits, so no carve-out is needed.

drop policy if exists "Game members can view characters" on public.characters;
create policy "Game members can view characters"
  on public.characters for select to authenticated
  using (
    game_id in (select public.get_user_game_ids())
    and (
      is_npc = false
      or controller_user_id = (select auth.uid())
      or visible_to_players = true
      or game_id in (
        select g.id from public.games g where g.gm_id = (select auth.uid())
      )
    )
  );

drop policy if exists "Owner or GM or controller can update character"
  on public.characters;
create policy "Owner or GM or controller can update character"
  on public.characters for update to authenticated
  using (
    -- PCs: owner keeps editing themselves.
    (is_npc = false and user_id = (select auth.uid()))
    -- NPCs: GM and current controller only. Creator alone has no edit
    -- rights once the controller is reassigned.
    or controller_user_id = (select auth.uid())
    or game_id in (
      select g.id from public.games g where g.gm_id = (select auth.uid())
    )
  );

drop policy if exists "Owner or GM can delete character" on public.characters;
create policy "Owner or GM can delete character"
  on public.characters for delete to authenticated
  using (
    -- PCs: owner can delete their own character.
    (is_npc = false and user_id = (select auth.uid()))
    -- NPCs: GM and current controller. Matches the edit policy.
    or controller_user_id = (select auth.uid())
    or game_id in (
      select g.id from public.games g where g.gm_id = (select auth.uid())
    )
  );

drop function if exists public.update_npc_flags(
  uuid, boolean, boolean, uuid, boolean
);
