import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/lib/supabase/server'
import type { Json, ProgressionEntry } from '~/lib/types/database'

/**
 * Record one progression pick (e.g. a Train Skill bump). RLS gates writes
 * to PC owner / NPC controller / GM. See #42 for the history view that will
 * read and edit these rows.
 *
 * `source` is a free-form discriminator like "downtime:train-skill" or
 * "level-up:talent" — readable, no enum. `picks` shape is per-source and
 * agreed in app code, not the DB.
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
