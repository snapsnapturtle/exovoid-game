import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { authMiddleware } from '~/lib/server/middleware'
import {
  attributesSchema,
  skillsSchema,
  uuidSchema,
} from '~/lib/server/validation'
import { applyPassiveEffects } from '~/lib/game-logic/passive-effects'
import type { Character, CharacterAttributes } from '~/lib/types/domain'

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
  .validator(
    z.object({
      gameId: uuidSchema,
      name: z.string().trim().min(1, 'Name is required'),
      is_minion: z.boolean().optional(),
      visible_to_players: z.boolean().optional(),
      controller_user_id: uuidSchema.nullable().optional(),
      attributes: attributesSchema.optional(),
      skills: skillsSchema.optional(),
      health_current: z.number().int().nullable().optional(),
      background_notes: z.string().optional(),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const { supabase, user } = context

    const trimmed = data.name

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
  .validator(z.object({ npcId: uuidSchema }))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const { supabase, user } = context

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

    // Spread the source row so any column added to `characters` later is
    // carried into the copy automatically — no allowlist to keep in sync.
    // Drop identity/timestamps (the DB regenerates them); reset user_id to the
    // duplicating GM and reset live combat state so the copy starts pristine.
    const { id, created_at, updated_at, ...rest } = npc

    const { data: row, error } = await supabase
      .from('characters')
      .insert({
        ...rest,
        user_id: user.id,
        name: `Copy of ${npc.name}`,
        is_npc: true,
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
  .validator(
    z.object({
      characterId: uuidSchema,
      // Strict allow-list: only the three banner flags, never stat columns.
      updates: z.strictObject({
        is_minion: z.boolean().optional(),
        visible_to_players: z.boolean().optional(),
        controller_user_id: uuidSchema.nullable().optional(),
      }),
    }),
  )
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const { supabase } = context

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
  .validator(z.object({ gameId: uuidSchema }))
  .middleware([authMiddleware])
  .handler(async ({ data, context }) => {
    const { supabase } = context

    const { data: rows, error } = await supabase
      .from('characters')
      .select('*')
      .eq('game_id', data.gameId)
      .eq('is_npc', true)
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return (rows ?? []) as unknown as Character[]
  })
