-- character_progression: persistent log of leveling/training picks per
-- character. Each row records one pick made at a given level (e.g. a Train
-- Skill bump, a level-up attribute choice). #42 ("Character progression
-- table + GM-editable history view") will render and edit these; this
-- migration lands just the data layer so writes start accruing now.
--
-- `source` is a free-form discriminator naming the system that wrote the
-- row (e.g. "downtime:train-skill", "level-up:skill", "level-up:talent").
-- Keep it human-readable. `picks` carries the source-specific payload —
-- shape determined per-source in app code, not in this migration.
--
-- Multiple rows per (character_id, level) are expected: one level-up will
-- eventually produce several picks (attribute, skill, talent), and Train
-- Skill bumps can happen any time during a level. No unique constraint.

create table public.character_progression (
  id           uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  level        int not null,
  source       text not null,
  picks        jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- FK covering index + the lookup that #42's history view will hit.
create index if not exists character_progression_character_id_idx
  on public.character_progression(character_id);
create index if not exists character_progression_character_level_idx
  on public.character_progression(character_id, level);

create trigger set_updated_at before update on public.character_progression
  for each row execute function public.update_updated_at();

alter table public.character_progression enable row level security;

-- SELECT: any game member can read progression rows for characters in their
-- game. We delegate to the characters row visibility via EXISTS — that
-- handles both PCs (visible to all members) and NPCs (visible per the
-- NPC flags), so this stays in sync as the characters policy evolves.
create policy "Game members can view progression"
  on public.character_progression for select to authenticated
  using (
    exists (
      select 1 from public.characters c
      where c.id = character_id
        and c.game_id in (select public.get_user_game_ids())
    )
  );

-- INSERT: PC owner, NPC controller, or GM. Mirrors the characters UPDATE
-- policy — anyone who can edit the character can record a pick for it.
create policy "Owner GM or controller can insert progression"
  on public.character_progression for insert to authenticated
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

-- UPDATE: GM only. Historical entries should not be self-revisable by the
-- player; #42 ships an inline GM-edit form that uses this.
create policy "GM can update progression"
  on public.character_progression for update to authenticated
  using (
    exists (
      select 1 from public.characters c
      where c.id = character_id
        and c.game_id in (
          select g.id from public.games g where g.gm_id = (select auth.uid())
        )
    )
  );

-- DELETE: GM only.
create policy "GM can delete progression"
  on public.character_progression for delete to authenticated
  using (
    exists (
      select 1 from public.characters c
      where c.id = character_id
        and c.game_id in (
          select g.id from public.games g where g.gm_id = (select auth.uid())
        )
    )
  );
