-- NPC support on `characters`. PCs and NPCs share so many fields (attributes,
-- skills, talents, inventory, health, AP, injuries, edge, cyberware) that we
-- extend the existing table rather than introduce a parallel one.
--
-- Flags:
--   is_npc              — top-level discriminator. Defaults false so existing
--                         rows stay PCs.
--   is_minion           — only meaningful when is_npc; flips the injury-die
--                         "minion" face to count as a wound when this target
--                         is hit. Drops fast on light hits, otherwise normal.
--   visible_to_players  — GM-controlled per-NPC. When false, only the GM,
--                         creator, and (optional) controller see the row.
--   controller_user_id  — optional delegation. When set, that player gets
--                         edit rights alongside the GM and is the in-feed
--                         "controller" for rolls/AP. When null, the GM
--                         controls.
--   npc_actions         — ad-hoc adversary action lines coexisting with the
--                         full skill grid. Each entry:
--                           { id: uuid, name: text, aptitude: int,
--                             expertise: int, ap: int, note?: text }
--                         A GM can ignore this and rely entirely on the skill
--                         grid, or fill it in for throwaway enemies they
--                         don't want to fully stat out.
alter table public.characters
  add column is_npc              boolean not null default false,
  add column is_minion            boolean not null default false,
  add column visible_to_players   boolean not null default false,
  add column controller_user_id   uuid null references public.profiles(id) on delete set null,
  add column npc_actions          jsonb not null default '[]';

create index if not exists characters_controller_user_id_idx
  on public.characters(controller_user_id);

-- Partial index to speed up "all NPCs in this game" lookups, which is the
-- hottest read path the roster page will hit.
create index if not exists characters_game_id_npc_idx
  on public.characters(game_id) where is_npc = true;

-- ============================================================
-- RLS: NPC-aware policies.
--
-- PC rules (is_npc = false) preserved verbatim from 20260514165927:
--   * SELECT: any game member.
--   * UPDATE: owner or GM.
--   * INSERT: members may insert their own.
--   * DELETE: owner or GM.
--
-- NPC rules (is_npc = true):
--   * SELECT: GM, creator (user_id), controller, or any game member when
--             visible_to_players = true.
--   * UPDATE: GM, creator, or controller.
--   * INSERT: members may insert NPCs into their game (player-created NPCs
--             default to owner = creator + controller = creator + visible).
--   * DELETE: GM or creator. (Controller cannot delete — that should be a
--             GM-level decision even when a player runs the NPC.)
-- ============================================================

drop policy if exists "Game members can view characters" on public.characters;
create policy "Game members can view characters"
  on public.characters for select to authenticated
  using (
    game_id in (select public.get_user_game_ids())
    and (
      is_npc = false
      or user_id = (select auth.uid())
      or controller_user_id = (select auth.uid())
      or visible_to_players = true
      or game_id in (
        select g.id from public.games g where g.gm_id = (select auth.uid())
      )
    )
  );

drop policy if exists "Owner can update own character" on public.characters;
create policy "Owner or GM or controller can update character"
  on public.characters for update to authenticated
  using (
    user_id = (select auth.uid())
    or controller_user_id = (select auth.uid())
    or game_id in (
      select g.id from public.games g where g.gm_id = (select auth.uid())
    )
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
    or game_id in (
      select g.id from public.games g where g.gm_id = (select auth.uid())
    )
  );
