-- Stored modifiers for derived stats that come from character creation
-- (background bonuses: max-health, max-edge, cyber-immunity bumps from the
-- Childhood/Adolescence/Life Events tables). These are flat additions on
-- top of the formulas in derived-stats.ts, attributed in the UI as
-- "Creation bonuses" alongside talents and cyberware.
--
-- Shape: { maxHealth?: number; maxEdge?: number; cyberImmunity?: number }.
-- Default '{}' keeps every existing row valid.
alter table public.characters
  add column derived_stat_bonuses jsonb not null default '{}'::jsonb;
