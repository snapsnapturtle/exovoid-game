import { createServerFn } from '@tanstack/react-start'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseServerClient } from '~/lib/supabase/server'
import type {
  Character,
  CombatParticipant,
  CombatState,
  GameState,
} from '~/lib/types/database'
import { applyPassiveEffects } from '~/lib/game-logic/passive-effects'
import { rollD6 } from '~/lib/game-logic/combat'

async function requireGm(
  supabase: SupabaseClient,
  gameId: string,
  userId: string,
): Promise<void> {
  const { data: game, error } = await supabase
    .from('games')
    .select('gm_id')
    .eq('id', gameId)
    .single()
  if (error || !game) throw new Error('Game not found')
  if (game.gm_id !== userId) throw new Error('Only the GM can do this')
}

async function loadGameState(
  supabase: SupabaseClient,
  gameId: string,
): Promise<GameState> {
  const { data, error } = await supabase
    .from('game_state')
    .select('*')
    .eq('game_id', gameId)
    .single()
  if (error || !data) throw new Error('Game state not found')
  return data as unknown as GameState
}

async function writeCombat(
  supabase: SupabaseClient,
  gameId: string,
  combat: CombatState | null,
): Promise<GameState> {
  const { data, error } = await supabase
    .from('game_state')
    .update({ combat } as never)
    .eq('game_id', gameId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as unknown as GameState
}

/**
 * Pull characters for combat by explicit id list. Caller decides who's in
 * the encounter — the GM picks via the combat-start modal. RLS still gates
 * NPC reads, so a non-GM caller invoking this with an NPC id they can't
 * see will simply get no row back.
 */
async function loadCharactersByIds(
  supabase: SupabaseClient,
  gameId: string,
  ids: string[],
): Promise<Character[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('game_id', gameId)
    .in('id', ids)
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as Character[]
}

function snapshotParticipant(
  character: Character,
  prior?: CombatParticipant,
): CombatParticipant {
  const { derived, attributes } = applyPassiveEffects(
    character.attributes,
    character.talents,
    character.cyberware,
    character.inventory,
    character.derived_stat_bonuses,
  )
  const rolled = rollD6()
  // Carry the prior round's overspend forward (always ≤ 0). Rulebook §210:
  // "subtract the excess Action Points from their result of the following round."
  const apOverflow = prior && prior.ap < 0 ? prior.ap : 0
  return {
    characterId: character.id,
    name: character.name || 'Unnamed',
    coolness: attributes.coo,
    baseAp: derived.actionPoints,
    rolled,
    apOverflow,
    ap: derived.actionPoints + rolled + apOverflow,
    isNpc: character.is_npc,
    isMinion: character.is_minion,
  }
}

export const startCombat = createServerFn({ method: 'POST' })
  .validator((d: { gameId: string; characterIds: string[] }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    await requireGm(supabase, data.gameId, user.id)

    const state = await loadGameState(supabase, data.gameId)
    if (state.combat) {
      throw new Error('Combat already active — end it first')
    }

    const characters = await loadCharactersByIds(
      supabase,
      data.gameId,
      data.characterIds,
    )
    if (characters.length === 0) {
      throw new Error('Pick at least one character to start combat')
    }

    const combat: CombatState = {
      round: 1,
      startedAt: new Date().toISOString(),
      participants: characters.map((c) => snapshotParticipant(c)),
    }
    return writeCombat(supabase, data.gameId, combat)
  })

/**
 * Add an existing character to the currently-active combat. Used both by
 * players who weren't initially picked (their own PC) and by the GM
 * dropping a fresh NPC into the encounter mid-round.
 *
 * Authorization:
 *   - GM: anyone.
 *   - Owner of a PC: their own.
 *   - Controller of an NPC: that NPC.
 *
 * The new participant is snapshotted from current state with no AP
 * overflow (clean entry).
 */
export const joinCombat = createServerFn({ method: 'POST' })
  .validator((d: { gameId: string; characterId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: char, error: charErr } = await supabase
      .from('characters')
      .select('*')
      .eq('id', data.characterId)
      .single()
    if (charErr || !char) throw new Error('Character not found')
    if (char.game_id !== data.gameId) {
      throw new Error('Character does not belong to this game')
    }

    const { data: game } = await supabase
      .from('games')
      .select('gm_id')
      .eq('id', data.gameId)
      .single()
    const isGm = game?.gm_id === user.id

    const character = char as unknown as Character
    const allowed = character.is_npc
      ? isGm || character.controller_user_id === user.id
      : isGm || character.user_id === user.id
    if (!allowed) {
      throw new Error('Not allowed to add this character to combat')
    }

    const state = await loadGameState(supabase, data.gameId)
    if (!state.combat) throw new Error('No combat active')
    if (
      state.combat.participants.some((p) => p.characterId === data.characterId)
    ) {
      throw new Error('Already in this combat')
    }

    const combat: CombatState = {
      ...state.combat,
      participants: [
        ...state.combat.participants,
        snapshotParticipant(character),
      ],
    }
    return writeCombat(supabase, data.gameId, combat)
  })

export const nextRound = createServerFn({ method: 'POST' })
  .validator((d: { gameId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    await requireGm(supabase, data.gameId, user.id)

    const state = await loadGameState(supabase, data.gameId)
    if (!state.combat) throw new Error('No combat active')

    // Re-snapshot from current character state so mid-encounter changes
    // (e.g. wounds, attribute swaps, gear swaps) reflect in the new round.
    const ids = state.combat.participants.map((p) => p.characterId)
    const { data: chars, error } = await supabase
      .from('characters')
      .select('*')
      .in('id', ids)
    if (error) throw new Error(error.message)
    const byId = new Map(
      (chars as unknown as Character[]).map((c) => [c.id, c]),
    )

    const participants = state.combat.participants
      .map((p) => {
        const c = byId.get(p.characterId)
        // If a character was deleted mid-combat, drop them.
        return c ? snapshotParticipant(c, p) : null
      })
      .filter((p): p is CombatParticipant => p !== null)

    const combat: CombatState = {
      ...state.combat,
      round: state.combat.round + 1,
      participants,
    }
    return writeCombat(supabase, data.gameId, combat)
  })

/**
 * Remove a participant from the active combat. Same auth shape as
 * `joinCombat` (GM, PC owner, or NPC controller). Idempotent on missing
 * participants — if they're already gone the call succeeds silently so
 * concurrent "Leave" clicks don't surface a confusing error.
 */
export const leaveCombat = createServerFn({ method: 'POST' })
  .validator((d: { gameId: string; characterId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: char, error: charErr } = await supabase
      .from('characters')
      .select('user_id, game_id, controller_user_id, is_npc')
      .eq('id', data.characterId)
      .single()
    if (charErr || !char) throw new Error('Character not found')
    if (char.game_id !== data.gameId) {
      throw new Error('Character does not belong to this game')
    }

    const { data: game } = await supabase
      .from('games')
      .select('gm_id')
      .eq('id', data.gameId)
      .single()
    const isGm = game?.gm_id === user.id

    const allowed = char.is_npc
      ? isGm || char.controller_user_id === user.id
      : isGm || char.user_id === user.id
    if (!allowed) {
      throw new Error('Not allowed to remove this character from combat')
    }

    const state = await loadGameState(supabase, data.gameId)
    if (!state.combat) return state

    const next = state.combat.participants.filter(
      (p) => p.characterId !== data.characterId,
    )
    if (next.length === state.combat.participants.length) return state

    const combat: CombatState = { ...state.combat, participants: next }
    return writeCombat(supabase, data.gameId, combat)
  })

export const adjustAp = createServerFn({ method: 'POST' })
  .validator((d: { gameId: string; characterId: string; delta: number }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // The owner of the targeted character may adjust their own AP; for an
    // NPC, the delegated controller can too; the GM may adjust anyone's.
    const { data: char, error: charErr } = await supabase
      .from('characters')
      .select('user_id, game_id, controller_user_id')
      .eq('id', data.characterId)
      .single()
    if (charErr || !char) throw new Error('Character not found')
    if (char.game_id !== data.gameId) {
      throw new Error('Character does not belong to this game')
    }
    if (char.user_id !== user.id && char.controller_user_id !== user.id) {
      await requireGm(supabase, data.gameId, user.id)
    }

    const state = await loadGameState(supabase, data.gameId)
    if (!state.combat) throw new Error('No combat active')
    const idx = state.combat.participants.findIndex(
      (p) => p.characterId === data.characterId,
    )
    if (idx < 0) throw new Error('Character is not in the current combat')

    const next = state.combat.participants.slice()
    next[idx] = { ...next[idx], ap: next[idx].ap + data.delta }
    const combat: CombatState = { ...state.combat, participants: next }
    return writeCombat(supabase, data.gameId, combat)
  })

export const loadCombatCharacters = createServerFn({ method: 'GET' })
  .validator((d: { gameId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    // Visible characters (PCs + permitted NPCs) for the combat picker.
    // RLS filters NPCs the caller isn't allowed to see.
    const { data: rows, error } = await supabase
      .from('characters')
      .select('*')
      .eq('game_id', data.gameId)
    if (error) throw new Error(error.message)
    return (rows ?? []) as unknown as Character[]
  })

export const endCombat = createServerFn({ method: 'POST' })
  .validator((d: { gameId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    await requireGm(supabase, data.gameId, user.id)

    return writeCombat(supabase, data.gameId, null)
  })
