-- Allow players (not just GMs) to mark a roll hidden, while keeping the GM in
-- the loop. Previously the SELECT policy on dice_rolls let only the roller see
-- their own hidden rolls; that worked because only the GM could ever set
-- is_hidden = true. With the UI now exposing the toggle to everyone, the GM
-- needs to be able to see player-hidden rolls too — otherwise the table loses
-- visibility into what just happened.

drop policy if exists "Members see non-hidden rolls" on public.dice_rolls;
create policy "Members see non-hidden rolls"
  on public.dice_rolls for select to authenticated
  using (
    game_id in (select public.get_user_game_ids())
    and (
      is_hidden = false
      or user_id = (select auth.uid())
      or game_id in (
        select g.id from public.games g where g.gm_id = (select auth.uid())
      )
    )
  );
