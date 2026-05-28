-- Per-character 1x-per-level downtime counter. Maps activity id to the
-- character level at which the activity was last consumed; gated when the
-- stored value equals the character's current level. Resets implicitly
-- once levelFromXp(experience) ticks past the stored value, so no
-- explicit reset hook is needed (works whether or not the level-up
-- wizard ships).
--
-- Shape: { "train-skill": 3 } meaning "last consumed at level 3".
-- Today only Train Skill consumes this; the column is generic to admit
-- future gated activities without another migration.
alter table public.characters
  add column downtime_uses_used jsonb not null default '{}'::jsonb;
