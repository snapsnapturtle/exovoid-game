-- Per-character injury list. Each entry
-- denormalizes the relevant fields from `src/data/injuries.json` so the row
-- stays self-contained if the data file evolves — same pattern as talents
-- (which store tier) and cyberware (which store tier/installedAt).
--
-- Shape per entry:
--   { id: uuid, name: text, severity: 1..7, modifier: int,
--     treated: bool, addedAt: ISO timestamp }
--
-- The `modifier` adds that many extra injury dice to *future* injury rolls
-- (cumulative across all carried injuries, treated or not — treating only
-- suppresses the immediate effect, not the escalator).
alter table public.characters
  add column injuries jsonb not null default '[]';
