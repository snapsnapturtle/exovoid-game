-- Character portraits.
--
-- Adds a nullable `portrait_url` to characters and a `character-portraits`
-- storage bucket for the uploaded images. The URL is the only thing we
-- store on the row — width/height/etag are not needed at the call sites
-- and would only bring drift risk vs. the actual stored file.
--
-- Storage layout: <character_id>/<random-uuid>.webp
--   * character_id prefix → first foldername lets RLS gate writes by
--     ownership / GM via the parent characters row.
--   * random-uuid filename → defeats CDN-cache staleness when a player
--     swaps their portrait; the client also deletes the previous object
--     under the prefix on upload so old objects don't accumulate.
--
-- The bucket is public-read. Portraits aren't sensitive (every other
-- player at the table needs to see them) and the random-UUID path makes
-- enumeration impractical. Writes are gated by the policies below.

alter table public.characters
  add column portrait_url text;

-- ============================================================
-- STORAGE BUCKET
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'character-portraits',
  'character-portraits',
  true,
  524288, -- 512 KiB; client-side resize lands well under this
  array['image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================
-- STORAGE RLS — writes gated by character ownership / GM
-- ============================================================

-- Helper: extract the character id from the object path. Returns null
-- if the path doesn't start with a uuid (defense against malformed paths).
create or replace function public.character_portraits_character_id(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when (storage.foldername(p_name))[1] ~ '^[0-9a-fA-F-]{36}$'
    then ((storage.foldername(p_name))[1])::uuid
    else null
  end;
$$;

create policy "Character portraits are readable by anyone"
  on storage.objects for select
  using (bucket_id = 'character-portraits');

create policy "Owner or GM can insert character portraits"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'character-portraits'
    and exists (
      select 1 from public.characters c
      where c.id = public.character_portraits_character_id(storage.objects.name)
        and (
          c.user_id = (select auth.uid())
          or c.game_id in (
            select g.id from public.games g where g.gm_id = (select auth.uid())
          )
        )
    )
  );

create policy "Owner or GM can update character portraits"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'character-portraits'
    and exists (
      select 1 from public.characters c
      where c.id = public.character_portraits_character_id(storage.objects.name)
        and (
          c.user_id = (select auth.uid())
          or c.game_id in (
            select g.id from public.games g where g.gm_id = (select auth.uid())
          )
        )
    )
  );

create policy "Owner or GM can delete character portraits"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'character-portraits'
    and exists (
      select 1 from public.characters c
      where c.id = public.character_portraits_character_id(storage.objects.name)
        and (
          c.user_id = (select auth.uid())
          or c.game_id in (
            select g.id from public.games g where g.gm_id = (select auth.uid())
          )
        )
    )
  );
