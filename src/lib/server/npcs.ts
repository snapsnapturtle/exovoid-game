import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/lib/supabase/server'
import type { Character, CharacterAttributes } from '~/lib/types/database'

/**
 * Create an NPC inside a game. Lighter than PC creation: no career
 * enforcement, no creation-time attribute/skill budget. The GM decides
 * the balance; the form validates only the field types.
 *
 * Defaults differ by caller:
 *   - GM creator   → controller = GM (null), visible_to_players = false.
 *   - Player creator → controller = self, visible_to_players = true.
 *
 * The caller may pass explicit flags to override these, but the
 * controller defaulting is the convenient case (player making an ally
 * NPC: it's theirs to run; GM making an antagonist: hidden until the
 * scene reveals it).
 *
 * NPCs do not deal with credits or assets — both forced to 0.
 */
export const createNpc = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      gameId: string
      name: string
      is_minion?: boolean
      visible_to_players?: boolean
      controller_user_id?: string | null
      attributes?: CharacterAttributes
      skills?: Record<string, number>
      health_current?: number | null
      background_notes?: string
    }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const trimmed = data.name.trim()
    if (!trimmed) throw new Error('Name is required')

    const { data: game } = await supabase
      .from('games')
      .select('gm_id')
      .eq('id', data.gameId)
      .single()
    if (!game) throw new Error('Game not found')
    const isGm = game.gm_id === user.id

    const attributes =
      data.attributes ??
      ({
        con: 4,
        str: 4,
        agi: 4,
        int: 4,
        edu: 4,
        per: 4,
        coo: 4,
      } satisfies CharacterAttributes)

    const visibleDefault = isGm ? false : true
    const controllerDefault = isGm ? null : user.id

    const { data: row, error } = await supabase
      .from('characters')
      .insert({
        game_id: data.gameId,
        user_id: user.id,
        name: trimmed,
        career: '',
        attributes,
        skills: data.skills ?? {},
        background_notes: data.background_notes ?? '',
        health_current: data.health_current ?? null,
        credits: 0,
        assets: 0,
        is_npc: true,
        is_minion: data.is_minion ?? false,
        visible_to_players: data.visible_to_players ?? visibleDefault,
        controller_user_id:
          data.controller_user_id === undefined
            ? controllerDefault
            : data.controller_user_id,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return row as unknown as Character
  })

/**
 * Update the NPC banner fields (minion / visibility / controller). RLS
 * gates the write — the policy allows GM and the current controller (no
 * creator carve-out). Stat edits flow through `updateCharacter`; both
 * paths rely on the same UPDATE policy, so the two halves of the sheet
 * stay in sync.
 */
export const updateNpcFlags = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      characterId: string
      updates: {
        is_minion?: boolean
        visible_to_players?: boolean
        controller_user_id?: string | null
      }
    }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: updated, error } = await supabase
      .from('characters')
      .update(data.updates as never)
      .eq('id', data.characterId)
      .eq('is_npc', true)
      .select()
      .single()

    if (error) throw new Error(error.message)
    return updated as unknown as Character
  })

/**
 * List every NPC in a game that the caller is allowed to see. RLS does the
 * actual filtering — the SELECT policy hides NPCs the player shouldn't see.
 * Returns full rows so the roster can show portrait + summary stats.
 */
export const listNpcs = createServerFn({ method: 'GET' })
  .inputValidator((d: { gameId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: rows, error } = await supabase
      .from('characters')
      .select('*')
      .eq('game_id', data.gameId)
      .eq('is_npc', true)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return (rows ?? []) as unknown as Character[]
  })
