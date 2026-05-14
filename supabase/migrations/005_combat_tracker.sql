-- Per-game combat tracker (Tier 1 / 4). One active encounter per game; null
-- when no combat is running. Holds the round number, an ISO start timestamp,
-- and a snapshot of each participant's per-round state: base AP from the
-- character's derived stats, the d6 initiative roll, and current remaining
-- AP (which can go negative when an action overspends per §200).

alter table public.game_state
  add column combat jsonb;
