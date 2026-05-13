-- Inventory & economy (Tier 1 / 3a):
--   * `assets` column on characters (alongside existing `credits`).
--   * `game_state` table — one row per game — holds the shared group
--     inventory plus the group's credits / assets. A separate table (rather
--     than columns on `games`) because the shared state is writable by any
--     game member, whereas `games` is GM-only-update.
--   * Trigger + backfill so every game has a row.
--   * Permissive RLS (any member can read + update their game's state).
--   * REPLICA IDENTITY FULL for realtime sync of group state.

alter table public.characters
  add column assets int not null default 0;

create table public.game_state (
  game_id    uuid primary key references public.games(id) on delete cascade,
  credits    int not null default 0,
  assets     int not null default 0,
  inventory  jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

-- Auto-create a state row whenever a new game is inserted.
create or replace function public.create_game_state_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.game_state (game_id) values (new.id);
  return new;
end;
$$;

create trigger create_game_state_on_game_insert
  after insert on public.games
  for each row execute function public.create_game_state_row();

-- Backfill existing games (the trigger only fires for new rows).
insert into public.game_state (game_id)
  select id from public.games
  on conflict do nothing;

-- Realtime sync needs the full row to filter UPDATEs on game_id.
alter table public.game_state replica identity full;

-- RLS: any game member can read + update their game's state.
alter table public.game_state enable row level security;

create policy "Game members can view game state"
  on public.game_state for select to authenticated
  using (
    game_id in (select public.get_user_game_ids(auth.uid()))
  );

create policy "Game members can update game state"
  on public.game_state for update to authenticated
  using (
    game_id in (select public.get_user_game_ids(auth.uid()))
  );
