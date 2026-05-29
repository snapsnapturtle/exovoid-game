-- Level-up wizard + history view (#42, #43) need two things on top of
-- the original `character_progression` table:
--
-- 1. Player-edits: the GM-only UPDATE policy is too restrictive while the
--    tool is still early — players should be able to correct their own
--    history rows. Drop the GM-only UPDATE policy and re-create it mirroring
--    the INSERT policy (owner, controller, or GM).
-- 2. Realtime: the history page and the wizard subscribe to changes via
--    `useRealtimeSubscription` so multi-tab and GM edits propagate live.
--    That needs replica identity FULL plus inclusion in the
--    supabase_realtime publication.
--
-- DELETE stays GM-only — players asking to delete a history row is rare,
-- and we don't want a player to silently nuke a level-up entry. Can relax
-- later if needed.
--
-- NOTE: realtime requires restarting the Supabase stack locally
-- (`supabase stop && supabase start`) after applying — the realtime
-- container caches the publication list at startup.

drop policy if exists "GM can update progression"
  on public.character_progression;

create policy "Owner GM or controller can update progression"
  on public.character_progression for update to authenticated
  using (
    exists (
      select 1 from public.characters c
      where c.id = character_id
        and (
          c.user_id = (select auth.uid())
          or c.controller_user_id = (select auth.uid())
          or c.game_id in (
            select g.id from public.games g where g.gm_id = (select auth.uid())
          )
        )
    )
  )
  with check (
    exists (
      select 1 from public.characters c
      where c.id = character_id
        and (
          c.user_id = (select auth.uid())
          or c.controller_user_id = (select auth.uid())
          or c.game_id in (
            select g.id from public.games g where g.gm_id = (select auth.uid())
          )
        )
    )
  );

alter table public.character_progression replica identity full;
alter publication supabase_realtime add table public.character_progression;
