-- Group / shared notes was dropped from scope (see ROADMAP): the use case
-- it covered is already handled by the group inventory's free-text entries.
-- Drop the now-unused table along with its RLS, indexes, trigger, and
-- realtime publication membership.

alter publication supabase_realtime drop table public.shared_notes;
drop table if exists public.shared_notes cascade;
