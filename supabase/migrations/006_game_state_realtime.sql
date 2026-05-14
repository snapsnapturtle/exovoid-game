-- Publish game_state on the supabase_realtime publication so UPDATEs (e.g.
-- combat AP adjustments, party inventory / currency changes) propagate to
-- subscribers without a manual refresh. REPLICA IDENTITY FULL was already
-- set in migration 004, which is what the realtime side needs to filter on
-- non-PK columns like game_id.

alter publication supabase_realtime add table public.game_state;
