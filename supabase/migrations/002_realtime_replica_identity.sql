-- Set REPLICA IDENTITY FULL on tables filtered by non-PK columns in
-- realtime subscriptions. Without this, Supabase Realtime filters on
-- columns outside the replica identity (e.g. game_id) silently fail and no
-- events are delivered to filtered subscribers.

alter table public.characters     replica identity full;
alter table public.game_members   replica identity full;
alter table public.dice_rolls     replica identity full;
alter table public.shared_notes   replica identity full;
