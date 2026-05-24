import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/lib/supabase/server'
import type { Database } from '~/lib/types/database'

type GameRow = Database['public']['Tables']['games']['Row']

export const getUserGames = createServerFn().handler(async () => {
  const supabase = getSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: memberships } = await supabase
    .from('game_members')
    .select('game_id, role')
    .eq('user_id', user.id)

  if (!memberships || memberships.length === 0) return []

  const gameIds = memberships.map((m) => m.game_id)
  const { data: games } = await supabase
    .from('games')
    .select('*')
    .in('id', gameIds)
    .order('created_at', { ascending: false })

  return (games || []).map((game) => ({
    ...game,
    role: memberships.find((m) => m.game_id === game.id)?.role || 'player',
  }))
})

export const createGame = createServerFn({ method: 'POST' })
  .inputValidator((d: { name: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: game, error } = await supabase
      .from('games')
      .insert({ name: data.name, gm_id: user.id })
      .select()
      .single()

    if (error) throw new Error(error.message)

    // Add GM as a game member
    await supabase
      .from('game_members')
      .insert({ game_id: game.id, user_id: user.id, role: 'gm' })

    return game
  })

export const joinGame = createServerFn({ method: 'POST' })
  .inputValidator((d: { inviteCode: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: rpcResult } = await supabase
      .rpc('find_game_by_invite_code', { p_invite_code: data.inviteCode })
      .single()

    const game = rpcResult as GameRow | null
    if (!game) throw new Error('Game not found or inactive')

    // Check if already a member
    const { data: existing } = await supabase
      .from('game_members')
      .select('id')
      .eq('game_id', game.id)
      .eq('user_id', user.id)
      .single()

    if (existing) return game

    await supabase
      .from('game_members')
      .insert({ game_id: game.id, user_id: user.id, role: 'player' })

    return game
  })

export const getGame = createServerFn()
  .inputValidator((d: { gameId: string }) => d)
  .handler(async ({ data }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: game } = await supabase
      .from('games')
      .select('*')
      .eq('id', data.gameId)
      .single()

    if (!game) throw new Error('Game not found')

    const { data: members } = await supabase
      .from('game_members')
      .select('*, profiles(display_name, avatar_url)')
      .eq('game_id', data.gameId)

    const { data: characters } = await supabase
      .from('characters')
      .select('id, name, career, level, user_id, portrait_url, is_npc')
      .eq('game_id', data.gameId)
      .eq('is_npc', false)

    const isMember = members?.some((m) => m.user_id === user.id)
    if (!isMember) throw new Error('Not a member of this game')

    const currentMember = members?.find((m) => m.user_id === user.id)

    return {
      game,
      members: members || [],
      characters: characters || [],
      currentUserId: user.id,
      isGm: currentMember?.role === 'gm',
    }
  })
