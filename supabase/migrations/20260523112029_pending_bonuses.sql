-- Per-character pending bonuses: persistent dice-pool modifiers that auto-apply
-- to the character's next roll(s). Used to make "leaked" effects between rolls
-- (and between sessions) survive — the canonical example is the Flow trigger
-- option ("+1 pool bonus on your next own check"), which players routinely
-- forget. Generic enough to slot in future sources later (Prepare action,
-- ally-given Support / Cover Fire, manual notes for negative carry-overs etc.)
-- without another migration.
--
-- Shape per entry:
--   { id: uuid, label: text, modifier: int (signed),
--     source: text discriminator e.g. "trigger:flow",
--     addedAt: ISO timestamp }
--
-- Entries are consumed (removed from the array) when a roll commits with the
-- bonus applied. Removal is also exposed to the player via an X on each chip,
-- in case a bonus was added by mistake or no longer makes sense.
alter table public.characters
  add column pending_bonuses jsonb not null default '[]';
