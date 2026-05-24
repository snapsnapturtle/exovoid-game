-- Per-character favorite/starred skills: a list of skill ids that float to
-- the top of the SkillsPanel. Owner-toggled at any time (no edit-mode gate)
-- so frequently-used skills are one click away during play.
--
-- Shape: jsonb array of skill ids, e.g. ["firearms", "medicine"].
alter table public.characters
  add column favorite_skills jsonb not null default '[]';
