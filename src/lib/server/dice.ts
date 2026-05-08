import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/lib/supabase/server'
import {
  rollPool,
  summarizeRoll,
  type RollPool,
  type RollResult,
} from '~/lib/game-logic/dice'
import type { Database } from '~/lib/types/database'

type DiceRollRow = Database['public']['Tables']['dice_rolls']['Row']

export interface DiceRollData {
  pool: RollPool
  result: RollResult
  summary: Record<string, number>
  modifier: number
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
      modifier: data.modifier ?? 0,
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
        ? supabase
            .from('profiles')
            .select('id, display_name')
            .in('id', userIds)
        : Promise.resolve({ data: [] as { id: string; display_name: string }[] }),
      characterIds.length
        ? supabase
            .from('characters')
            .select('id, name')
            .in('id', characterIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    ])

    const profileMap = new Map(
      (profiles ?? []).map((p) => [p.id, p.display_name]),
    )
    const characterMap = new Map(
      (characters ?? []).map((c) => [c.id, c.name]),
    )

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
