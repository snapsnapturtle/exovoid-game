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

/** Pull every PC currently in the game (for combat snapshots). */
async function loadCharactersForGame(
  supabase: SupabaseClient,
  gameId: string,
): Promise<Character[]> {
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('game_id', gameId)
  if (error) throw new Error(error.message)
  return (data ?? []) as unknown as Character[]
}

function snapshotParticipant(character: Character): CombatParticipant {
  const { derived, attributes } = applyPassiveEffects(
    character.attributes,
    character.talents,
    character.cyberware,
    character.inventory,
  )
  const rolled = rollD6()
  return {
    characterId: character.id,
    name: character.name || 'Unnamed',
    coolness: attributes.coo,
    baseAp: derived.actionPoints,
    rolled,
    ap: derived.actionPoints + rolled,
  }
}

export const startCombat = createServerFn({ method: 'POST' })
  .inputValidator((d: { gameId: string }) => d)
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

    const characters = await loadCharactersForGame(supabase, data.gameId)
    if (characters.length === 0) {
      throw new Error('No characters in this game to start combat with')
    }

    const combat: CombatState = {
      round: 1,
      startedAt: new Date().toISOString(),
      participants: characters.map(snapshotParticipant),
    }
    return writeCombat(supabase, data.gameId, combat)
  })

export const nextRound = createServerFn({ method: 'POST' })
  .inputValidator((d: { gameId: string }) => d)
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
    const byId = new Map((chars as unknown as Character[]).map((c) => [c.id, c]))

    const participants = state.combat.participants
      .map((p) => {
        const c = byId.get(p.characterId)
        // If a character was deleted mid-combat, drop them.
        return c ? snapshotParticipant(c) : null
      })
      .filter((p): p is CombatParticipant => p !== null)

    const combat: CombatState = {
      ...state.combat,
      round: state.combat.round + 1,
      participants,
    }
    return writeCombat(supabase, data.gameId, combat)
  })

export const adjustAp = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: { gameId: string; characterId: string; delta: number }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    // The owner of the targeted character may adjust their own AP; the GM
    // may adjust anyone's. Everyone else is rejected.
    const { data: char, error: charErr } = await supabase
      .from('characters')
      .select('user_id, game_id')
      .eq('id', data.characterId)
      .single()
    if (charErr || !char) throw new Error('Character not found')
    if (char.game_id !== data.gameId) {
      throw new Error('Character does not belong to this game')
    }
    if (char.user_id !== user.id) {
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
  .inputValidator((d: { gameId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    return loadCharactersForGame(supabase, data.gameId)
  })

export const endCombat = createServerFn({ method: 'POST' })
  .inputValidator((d: { gameId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    await requireGm(supabase, data.gameId, user.id)

    return writeCombat(supabase, data.gameId, null)
  })
