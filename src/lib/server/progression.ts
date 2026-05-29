import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/lib/supabase/server'
import type { Json, ProgressionEntry } from '~/lib/types/database'

/**
 * Record one progression pick (Train Skill bump, level-up commit, etc.).
 * RLS gates writes to PC owner / NPC controller / GM. `source` is a
 * free-form discriminator like "downtime:train-skill" or "level-up";
 * `picks` shape is per-source and agreed in app code, not the DB.
 */
export const recordProgression = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { characterId: string; level: number; source: string; picks: Json }) =>
      d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: row, error } = await supabase
      .from('character_progression')
      .insert({
        character_id: data.characterId,
        level: data.level,
        source: data.source,
        picks: data.picks as never,
      })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return row as unknown as ProgressionEntry
  })

/**
 * Read every progression row for a character. RLS gates by game
 * membership. Returned sorted by level ascending then created_at ascending
 * so callers can render a stable timeline.
 */
export const listProgression = createServerFn({ method: 'POST' })
  .inputValidator((d: { characterId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: rows, error } = await supabase
      .from('character_progression')
      .select('*')
      .eq('character_id', data.characterId)
      .order('level', { ascending: true })
      .order('created_at', { ascending: true })
    if (error) throw new Error(error.message)
    return (rows ?? []) as unknown as ProgressionEntry[]
  })

/**
 * Edit a historical row's `picks`. The level itself is immutable — the
 * level is what groups rows in the history view, and players asking to
 * move a pick to a different level should delete & recreate. RLS allows
 * owner / controller / GM (relaxed from GM-only on 2026-05-29; see
 * 20260529002537_progression_owner_edits_and_realtime.sql).
 */
export const updateProgression = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string; picks: Json }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: row, error } = await supabase
      .from('character_progression')
      .update({ picks: data.picks as never })
      .eq('id', data.id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return row as unknown as ProgressionEntry
  })

/**
 * Delete a historical row. RLS gates this to GMs only — a player who
 * disagrees with a row should edit it, not nuke it.
 */
export const deleteProgression = createServerFn({ method: 'POST' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
      .from('character_progression')
      .delete()
      .eq('id', data.id)
    if (error) throw new Error(error.message)
    return { ok: true }
  })
