-- Follow-ups from the first NPC playtest.
--
--   1. Drop `npc_actions`. The custom-action row pattern is gone in favour
--      of rolling skills + weapons directly off the standard sheet — every
--      skill is now usable for an NPC, so the pre-baked (apt, exp, ap) rows
--      were redundant.
--
--   2. Tighten `characters` UPDATE policy so that the **creator** of an NPC
--      no longer counts as an editor unless they're also the controller or
--      the GM. The motivating case is Anna (player creates, then re-assigns
--      to GM): after the hand-off the player should *not* be able to keep
--      poking Anna's HP / skills. PCs are unaffected — creator = owner =
--      player and the policy keeps that path open.
--
--   3. Re-grant creators (and controllers and GMs) the ability to flip the
--      banner fields (minion / visible_to_players / controller_user_id)
--      through a SECURITY DEFINER RPC. The RPC does its own authorisation
--      check, since RLS now refuses the direct UPDATE for creator-only.
--
--   4. Zero credits + assets on existing NPC rows. New NPCs default to 0
--      from the createNpc server fn going forward; this just retros the
--      ones that were created before that change.

alter table public.characters drop column if exists npc_actions;

drop policy if exists "Owner or GM or controller can update character"
  on public.characters;
create policy "Owner or GM or controller can update character"
  on public.characters for update to authenticated
  using (
    -- PCs: owner can keep editing themselves.
    (is_npc = false and user_id = (select auth.uid()))
    -- NPCs: only the delegated controller or the GM can do general updates.
    -- Creator alone is not enough — they re-acquire banner edit rights via
    -- the `update_npc_flags` RPC below.
    or controller_user_id = (select auth.uid())
    or game_id in (
      select g.id from public.games g where g.gm_id = (select auth.uid())
    )
  );

create or replace function public.update_npc_flags(
  p_character_id      uuid,
  p_is_minion         boolean default null,
  p_visible_to_players boolean default null,
  p_controller_user_id uuid default null,
  p_clear_controller  boolean default false
)
returns public.characters
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.characters;
  v_gm_id uuid;
begin
  select * into v_row from public.characters where id = p_character_id;
  if v_row is null then raise exception 'NPC not found'; end if;
  if not v_row.is_npc then raise exception 'Not an NPC'; end if;

  select gm_id into v_gm_id from public.games where id = v_row.game_id;
  if v_gm_id is null then raise exception 'Game not found'; end if;

  if v_uid <> v_gm_id
     and v_uid <> v_row.user_id
     and (v_row.controller_user_id is null or v_uid <> v_row.controller_user_id)
  then
    raise exception 'Not authorised to manage this NPC';
  end if;

  update public.characters
  set is_minion           = coalesce(p_is_minion, is_minion),
      visible_to_players  = coalesce(p_visible_to_players, visible_to_players),
      controller_user_id  = case
        when p_clear_controller then null
        else coalesce(p_controller_user_id, controller_user_id)
      end
  where id = p_character_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke execute on function public.update_npc_flags(uuid, boolean, boolean, uuid, boolean)
  from public, anon;
grant execute on function public.update_npc_flags(uuid, boolean, boolean, uuid, boolean)
  to authenticated;

-- Retro existing NPC rows.
update public.characters
set credits = 0, assets = 0
where is_npc = true;
