import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/lib/supabase/server'
import {
  rollPool,
  summarizeRoll,
  type RollPool,
  type RollResult,
} from '~/lib/game-logic/dice'
import type { Database, PendingSupport } from '~/lib/types/database'

type DiceRollRow = Database['public']['Tables']['dice_rolls']['Row']

export type DiceRollKind = 'normal' | 'support'

export interface DiceRollData {
  pool: RollPool
  result: RollResult
  summary: Record<string, number>
  modifier: number
  /** `support` marks rolls created via rollSupportContribution. Undefined ≡ `normal`. */
  kind?: DiceRollKind
  /** When a normal roll absorbed pending supports, snapshots them here for
   * audit + UI credit. The merged symbols are already baked into `summary`. */
  absorbedSupports?: PendingSupport[]
}

export interface DiceRollEntry {
  id: string
  game_id: string
  user_id: string
  character_id: string | null
  skill_name: string | null
  is_hidden: boolean
  created_at: string
  data: DiceRollData
  player_name: string | null
  character_name: string | null
}

const FEED_LIMIT = 50

export const rollDice = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      gameId: string
      characterId?: string | null
      skillName?: string | null
      pool: RollPool
      modifier?: number
      isHidden?: boolean
      /** Pending-support entry ids to absorb. The server merges their summaries
       * into this roll's summary and removes them from game_state.pending_support. */
      absorbSupportIds?: string[]
      /** Already-consumed support snapshots — passed by client-side re-rolls
       * (Edge re-roll) so the support contribution persists across re-rolls
       * even after the original entry left game_state.pending_support. The
       * server merges these into the summary but does NOT touch game_state. */
      preAbsorbedSupports?: PendingSupport[]
    }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const result = rollPool(data.pool)
    const summary = summarizeRoll(result)

    // Absorb pending supports (read-modify-write on game_state.pending_support).
    const absorbed: PendingSupport[] = []
    if (data.absorbSupportIds && data.absorbSupportIds.length > 0) {
      const ids = new Set(data.absorbSupportIds)
      const { data: stateRow, error: stateErr } = await supabase
        .from('game_state')
        .select('pending_support')
        .eq('game_id', data.gameId)
        .single()
      if (stateErr || !stateRow) throw new Error('Game state not found')

      const all =
        (stateRow.pending_support as unknown as PendingSupport[]) ?? []
      const matched = all.filter((p) => ids.has(p.id))
      const remaining = all.filter((p) => !ids.has(p.id))

      absorbed.push(...matched)

      const { error: updateErr } = await supabase
        .from('game_state')
        .update({ pending_support: remaining } as never)
        .eq('game_id', data.gameId)
      if (updateErr) throw new Error(updateErr.message)
    }

    // Merge pre-absorbed snapshots (Edge re-roll path) — no game_state mutation.
    if (data.preAbsorbedSupports && data.preAbsorbedSupports.length > 0) {
      absorbed.push(...data.preAbsorbedSupports)
    }

    for (const a of absorbed) {
      for (const [sym, n] of Object.entries(a.summary ?? {})) {
        summary[sym] = (summary[sym] ?? 0) + n
      }
    }

    const rollData: DiceRollData = {
      pool: data.pool,
      result,
      summary,
      modifier: data.modifier ?? 0,
      ...(absorbed.length > 0 ? { absorbedSupports: absorbed } : {}),
    }

    const { data: row, error } = await supabase
      .from('dice_rolls')
      .insert({
        game_id: data.gameId,
        user_id: user.id,
        character_id: data.characterId ?? null,
        skill_name: data.skillName ?? null,
        is_hidden: data.isHidden ?? false,
        roll_data: rollData as never,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return row as DiceRollRow
  })

export const rollSupportContribution = createServerFn({ method: 'POST' })
  .inputValidator(
    (d: {
      gameId: string
      characterId: string | null
      skillId: string
      skillName: string
      /** Caller computes via computeSupportPool(skillLevel). */
      pool: RollPool
      /** Cached display label for the chip. */
      supporterName: string
    }) => d,
  )
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const result = rollPool(data.pool)
    const summary = summarizeRoll(result)

    const rollData: DiceRollData = {
      pool: data.pool,
      result,
      summary,
      modifier: 0,
      kind: 'support',
    }

    // 1. Persist the supporter's full roll.
    const { data: rollRow, error: rollErr } = await supabase
      .from('dice_rolls')
      .insert({
        game_id: data.gameId,
        user_id: user.id,
        character_id: data.characterId,
        skill_name: data.skillName,
        is_hidden: false,
        roll_data: rollData as never,
      })
      .select()
      .single()
    if (rollErr || !rollRow) throw new Error(rollErr?.message ?? 'Roll failed')

    // 2. Append a PendingSupport entry to game_state.pending_support.
    const { data: stateRow, error: stateErr } = await supabase
      .from('game_state')
      .select('pending_support')
      .eq('game_id', data.gameId)
      .single()
    if (stateErr || !stateRow) throw new Error('Game state not found')

    const current =
      (stateRow.pending_support as unknown as PendingSupport[]) ?? []
    // A given supporter can only have one live support per skill — re-rolling
    // support for the same skill replaces the previous contribution. Scope by
    // character when present (so a single user GMing multiple NPCs can have
    // distinct supports), otherwise fall back to user id.
    const isSameSupporter = (p: PendingSupport) =>
      data.characterId
        ? p.supporterCharacterId === data.characterId
        : p.supporterUserId === user.id && p.supporterCharacterId === null
    const deduped = current.filter(
      (p) => !(isSameSupporter(p) && p.skillId === data.skillId),
    )
    const entry: PendingSupport = {
      id: crypto.randomUUID(),
      diceRollId: rollRow.id,
      supporterUserId: user.id,
      supporterCharacterId: data.characterId,
      supporterName: data.supporterName,
      skillId: data.skillId,
      skillName: data.skillName,
      summary,
      createdAt: new Date().toISOString(),
    }
    const next = [...deduped, entry]

    const { error: updateErr } = await supabase
      .from('game_state')
      .update({ pending_support: next } as never)
      .eq('game_id', data.gameId)
    if (updateErr) throw new Error(updateErr.message)

    return { roll: rollRow as DiceRollRow, pending: entry }
  })

export const removePendingSupport = createServerFn({ method: 'POST' })
  .inputValidator((d: { gameId: string; supportId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: stateRow, error: stateErr } = await supabase
      .from('game_state')
      .select('pending_support')
      .eq('game_id', data.gameId)
      .single()
    if (stateErr || !stateRow) throw new Error('Game state not found')

    const current =
      (stateRow.pending_support as unknown as PendingSupport[]) ?? []
    const next = current.filter((p) => p.id !== data.supportId)
    if (next.length === current.length) return { removed: false }

    const { error: updateErr } = await supabase
      .from('game_state')
      .update({ pending_support: next } as never)
      .eq('game_id', data.gameId)
    if (updateErr) throw new Error(updateErr.message)
    return { removed: true }
  })

export const clearPendingSupport = createServerFn({ method: 'POST' })
  .inputValidator((d: { gameId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
      .from('game_state')
      .update({ pending_support: [] } as never)
      .eq('game_id', data.gameId)
    if (error) throw new Error(error.message)
  })

export const getRecentRolls = createServerFn()
  .inputValidator((d: { gameId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: rows, error } = await supabase
      .from('dice_rolls')
      .select(
        'id, game_id, user_id, character_id, skill_name, is_hidden, created_at, roll_data',
      )
      .eq('game_id', data.gameId)
      .order('created_at', { ascending: false })
      .limit(FEED_LIMIT)

    if (error) throw new Error(error.message)

    const userIds = Array.from(new Set((rows ?? []).map((r) => r.user_id)))
    const characterIds = Array.from(
      new Set(
        (rows ?? [])
          .map((r) => r.character_id)
          .filter((id): id is string => id !== null),
      ),
    )

    const [{ data: profiles }, { data: characters }] = await Promise.all([
      userIds.length
        ? supabase.from('profiles').select('id, display_name').in('id', userIds)
        : Promise.resolve({
            data: [] as { id: string; display_name: string }[],
          }),
      characterIds.length
        ? supabase.from('characters').select('id, name').in('id', characterIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    ])

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p.display_name]),
    )
    const characterMap = new Map((characters ?? []).map((c) => [c.id, c.name]))

    const entries: DiceRollEntry[] = (rows ?? []).map((r) => ({
      id: r.id,
      game_id: r.game_id,
      user_id: r.user_id,
      character_id: r.character_id,
      skill_name: r.skill_name,
      is_hidden: r.is_hidden,
      created_at: r.created_at,
      data: r.roll_data as unknown as DiceRollData,
      player_name: profileMap.get(r.user_id) ?? null,
      character_name: r.character_id
        ? (characterMap.get(r.character_id) ?? null)
        : null,
    }))

    return entries
  })
