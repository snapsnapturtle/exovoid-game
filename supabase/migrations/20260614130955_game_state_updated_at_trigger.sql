-- `game_state` had an `updated_at` column (default now()) but, unlike
-- characters/profiles/games, never got the `set_updated_at` trigger — so the
-- column only ever held its insert-time value. The optimistic
-- compare-and-swap in `combat.ts` (`mutateCombat`) matches on `updated_at`, so
-- without the trigger the CAS would always match and offer no protection
-- against concurrent combat writes clobbering each other. Add the trigger so
-- every UPDATE advances `updated_at` (which also keeps the realtime-synced
-- group state's timestamp honest for currency/inventory writes).

drop trigger if exists set_updated_at on public.game_state;
create trigger set_updated_at before update on public.game_state
  for each row execute function public.update_updated_at();
