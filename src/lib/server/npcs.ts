import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/lib/supabase/server'
import { applyPassiveEffects } from '~/lib/game-logic/passive-effects'
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
 * Clone an NPC into a fresh row in the same game. GM-only — duplicating is
 * a content-authoring shortcut (spin up three of the same guard), not a
 * play action, so it stays with the table owner regardless of who controls
 * the source NPC.
 *
 * Everything that defines the NPC carries over (attributes, skills, talents,
 * cyberware, inventory, portrait, visibility, controller). Live combat state
 * is reset so the copy starts pristine:
 *   - health_current → null (= full, mirrors createNpc)
 *   - edge_current   → max (recomputed from the copied build)
 *   - injuries, pending_bonuses, malfunction_allocations → []
 *
 * The name is prefixed "Copy of …"; rename in the new NPC's sheet.
 */
export const duplicateNpc = createServerFn({ method: 'POST' })
  .inputValidator((d: { npcId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: source, error: fetchError } = await supabase
      .from('characters')
      .select('*')
      .eq('id', data.npcId)
      .eq('is_npc', true)
      .single()
    if (fetchError || !source) throw new Error('NPC not found')

    const npc = source as unknown as Character

    const { data: game } = await supabase
      .from('games')
      .select('gm_id')
      .eq('id', npc.game_id)
      .single()
    if (!game) throw new Error('Game not found')
    if (game.gm_id !== user.id)
      throw new Error('Only the GM can duplicate NPCs')

    const maxEdge = applyPassiveEffects(
      npc.attributes,
      npc.talents,
      npc.cyberware,
      npc.inventory,
      npc.derived_stat_bonuses,
    ).derived.edge

    const { data: row, error } = await supabase
      .from('characters')
      .insert({
        game_id: npc.game_id,
        user_id: user.id,
        name: `Copy of ${npc.name}`,
        career: npc.career,
        level: npc.level,
        experience: npc.experience,
        gender: npc.gender,
        age: npc.age,
        background_notes: npc.background_notes,
        notes: npc.notes,
        attributes: npc.attributes,
        skills: npc.skills,
        talents: npc.talents,
        cyberware: npc.cyberware,
        inventory: npc.inventory,
        favorite_skills: npc.favorite_skills,
        derived_stat_bonuses: npc.derived_stat_bonuses,
        downtime_uses_used: npc.downtime_uses_used,
        portrait_url: npc.portrait_url,
        credits: npc.credits,
        assets: npc.assets,
        is_npc: true,
        is_minion: npc.is_minion,
        visible_to_players: npc.visible_to_players,
        controller_user_id: npc.controller_user_id,
        // Reset live state — the copy starts at full health/edge, no injuries.
        health_current: null,
        edge_current: maxEdge,
        injuries: [],
        pending_bonuses: [],
        malfunction_allocations: [],
      } as never)
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
