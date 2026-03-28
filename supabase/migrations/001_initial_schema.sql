-- Exovoid Game Support Tool: Initial Schema
-- Phase 1: profiles, games, game_members, characters, dice_rolls, shared_notes
--
-- Tables are created first, then RLS policies are added after all tables exist
-- to avoid forward-reference issues between game_members and games.

-- ============================================================
-- TABLES
-- ============================================================

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.games (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  gm_id       uuid not null references public.profiles(id) on delete cascade,
  invite_code text not null unique default substring(gen_random_uuid()::text, 1, 8),
  status      text not null default 'active' check (status in ('active', 'archived')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.game_members (
  id        uuid primary key default gen_random_uuid(),
  game_id   uuid not null references public.games(id) on delete cascade,
  user_id   uuid not null references public.profiles(id) on delete cascade,
  role      text not null default 'player' check (role in ('gm', 'player')),
  joined_at timestamptz not null default now(),
  unique (game_id, user_id)
);

create table public.characters (
  id               uuid primary key default gen_random_uuid(),
  game_id          uuid not null references public.games(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  name             text not null default 'New Character',
  career           text not null default '',
  level            int not null default 1,
  experience       int not null default 0,
  gender           text not null default '',
  age              int,
  background_notes text not null default '',
  attributes       jsonb not null default '{"con":4,"str":4,"agi":4,"int":4,"edu":4,"per":4,"coo":4}',
  skills           jsonb not null default '{}',
  edge_current     int not null default 0,
  health_current   int,
  talents          jsonb not null default '[]',
  cyberware        jsonb not null default '[]',
  inventory        jsonb not null default '[]',
  credits          int not null default 1000,
  notes            text not null default '',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.dice_rolls (
  id           uuid primary key default gen_random_uuid(),
  game_id      uuid not null references public.games(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  character_id uuid references public.characters(id) on delete set null,
  skill_name   text,
  roll_data    jsonb not null,
  is_hidden    boolean not null default false,
  created_at   timestamptz not null default now()
);

create table public.shared_notes (
  id          uuid primary key default gen_random_uuid(),
  game_id     uuid not null references public.games(id) on delete cascade,
  title       text not null default 'Untitled Note',
  content     text not null default '',
  updated_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Profiles
alter table public.profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
  on profiles for select to authenticated using (true);

create policy "Users can update own profile"
  on profiles for update to authenticated using (auth.uid() = id);

-- Games
alter table public.games enable row level security;

create policy "Game members can view game"
  on games for select to authenticated
  using (
    id in (select game_id from public.game_members where user_id = auth.uid())
  );

create policy "GM can update game"
  on games for update to authenticated
  using (gm_id = auth.uid());

create policy "Authenticated users can create games"
  on games for insert to authenticated
  with check (gm_id = auth.uid());

create policy "GM can delete game"
  on games for delete to authenticated
  using (gm_id = auth.uid());

-- Game Members
alter table public.game_members enable row level security;

create policy "Members can view other members in their games"
  on game_members for select to authenticated
  using (
    game_id in (select gm.game_id from public.game_members gm where gm.user_id = auth.uid())
  );

create policy "Users can insert themselves"
  on game_members for insert to authenticated
  with check (user_id = auth.uid());

create policy "GM or self can remove members"
  on game_members for delete to authenticated
  using (
    user_id = auth.uid()
    or game_id in (select g.id from public.games g where g.gm_id = auth.uid())
  );

-- Characters
alter table public.characters enable row level security;

create policy "Game members can view characters"
  on characters for select to authenticated
  using (
    game_id in (select gm.game_id from public.game_members gm where gm.user_id = auth.uid())
  );

create policy "Owner can update own character"
  on characters for update to authenticated
  using (
    user_id = auth.uid()
    or game_id in (select g.id from public.games g where g.gm_id = auth.uid())
  );

create policy "Members can create characters"
  on characters for insert to authenticated
  with check (
    user_id = auth.uid()
    and game_id in (select gm.game_id from public.game_members gm where gm.user_id = auth.uid())
  );

create policy "Owner or GM can delete character"
  on characters for delete to authenticated
  using (
    user_id = auth.uid()
    or game_id in (select g.id from public.games g where g.gm_id = auth.uid())
  );

-- Dice Rolls
alter table public.dice_rolls enable row level security;

create policy "Members see non-hidden rolls"
  on dice_rolls for select to authenticated
  using (
    game_id in (select gm.game_id from public.game_members gm where gm.user_id = auth.uid())
    and (is_hidden = false or user_id = auth.uid())
  );

create policy "Members can create rolls"
  on dice_rolls for insert to authenticated
  with check (
    user_id = auth.uid()
    and game_id in (select gm.game_id from public.game_members gm where gm.user_id = auth.uid())
  );

-- Shared Notes
alter table public.shared_notes enable row level security;

create policy "Game members can manage notes"
  on shared_notes for all to authenticated
  using (
    game_id in (select gm.game_id from public.game_members gm where gm.user_id = auth.uid())
  );

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at timestamp
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.games
  for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.characters
  for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.shared_notes
  for each row execute function public.update_updated_at();

-- ============================================================
-- REALTIME
-- ============================================================

alter publication supabase_realtime add table public.characters;
alter publication supabase_realtime add table public.game_members;
alter publication supabase_realtime add table public.dice_rolls;
alter publication supabase_realtime add table public.shared_notes;
