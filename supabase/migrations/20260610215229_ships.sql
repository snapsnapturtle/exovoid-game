-- Game-scoped spaceships (#49, builder phase). Ships belong to the table, not
-- a player: any game member can create, edit, duplicate and delete them. The
-- GM can additionally prep hidden (enemy) ships via visible_to_players, the
-- same knob NPCs use.
--
-- Columns:
--   config  — the build document: { classRef, variant, modules[], weapons[],
--             armorAllocation, shieldAllocation }. Derived stats (capacity,
--             power, cost, hull/armor/shield maxima) are computed client-side
--             from this + the static catalogs, never stored.
--   damage  — in-play state: { hullCurrent, armorCurrent, shieldCurrent }.
--             null members mean "undamaged / mirrors allocation". Kept apart
--             from config so the later ship-combat phase can snapshot/reset
--             it without touching the build.
create table public.ships (
  id                  uuid primary key default gen_random_uuid(),
  game_id             uuid not null references public.games(id) on delete cascade,
  created_by          uuid not null references public.profiles(id) on delete cascade,
  name                text not null default '',
  visible_to_players  boolean not null default true,
  config              jsonb not null,
  damage              jsonb not null default '{"hullCurrent": null, "armorCurrent": null, "shieldCurrent": null}',
  notes               text not null default '',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Covering indexes for both foreign keys (advisor requirement).
create index if not exists ships_game_id_idx on public.ships(game_id);
create index if not exists ships_created_by_idx on public.ships(created_by);

create trigger set_updated_at before update on public.ships
  for each row execute function public.update_updated_at();

alter table public.ships enable row level security;

-- Visibility: any member of the game, except hidden ships are restricted to
-- the GM and the creator. Edit/delete deliberately share the same predicate —
-- ships are collaborative table property.
create policy "Members can view visible ships"
  on public.ships for select to authenticated
  using (
    game_id in (select public.get_user_game_ids())
    and (
      visible_to_players = true
      or created_by = (select auth.uid())
      or game_id in (
        select g.id from public.games g where g.gm_id = (select auth.uid())
      )
    )
  );

create policy "Members can create ships"
  on public.ships for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and game_id in (select public.get_user_game_ids())
  );

create policy "Members can update visible ships"
  on public.ships for update to authenticated
  using (
    game_id in (select public.get_user_game_ids())
    and (
      visible_to_players = true
      or created_by = (select auth.uid())
      or game_id in (
        select g.id from public.games g where g.gm_id = (select auth.uid())
      )
    )
  );

create policy "Members can delete visible ships"
  on public.ships for delete to authenticated
  using (
    game_id in (select public.get_user_game_ids())
    and (
      visible_to_players = true
      or created_by = (select auth.uid())
      or game_id in (
        select g.id from public.games g where g.gm_id = (select auth.uid())
      )
    )
  );

-- Realtime: full row images + publication membership. Requires a stack
-- restart (supabase stop && supabase start) before the realtime container
-- picks the new table up.
alter table public.ships replica identity full;
alter publication supabase_realtime add table public.ships;
