-- Allocations on the Cyber Malfunction Table for characters whose installed
-- cyberware exceeds their Cyberimmunity (rulebook: "Exceeding Cyber Immunity").
-- The JSON array holds the selected slot numbers (each integer in 2-40, no
-- duplicates). Array length must equal the character's current excess
-- Cyberimmunity — one slot per excess point per the rulebook example.
alter table public.characters
  add column malfunction_allocations jsonb not null default '[]';
