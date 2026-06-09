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
  // The games fetch and the GM-name lookup both depend only on gameIds and are
  // independent of each other, so run them concurrently.
  const [{ data: games }, { data: gmMembers }] = await Promise.all([
    supabase
      .from('games')
      .select('*')
      .in('id', gameIds)
      .order('created_at', { ascending: false }),
    supabase
      .from('game_members')
      .select('game_id, profiles(display_name)')
      .in('game_id', gameIds)
      .eq('role', 'gm'),
  ])
  const gmNameByGame = new Map(
    (gmMembers ?? []).map((m) => [
      m.game_id,
      m.profiles?.display_name || 'Unknown',
    ]),
  )

  return (games || []).map((game) => ({
    ...game,
    role: memberships.find((m) => m.game_id === game.id)?.role || 'player',
    gmName: gmNameByGame.get(game.id) ?? 'Unknown',
  }))
})

export const createGame = createServerFn({ method: 'POST' })
  .validator((d: { name: string }) => d)
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
  .validator((d: { inviteCode: string }) => d)
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
  .validator((d: { gameId: string }) => d)
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

    // PCs for the whole-game roster, plus any character the caller acts on
    // (their own + NPCs delegated to them) so the dice-feed bonus strip can
    // surface and clear bonuses for controlled NPCs too. RLS still gates each
    // row.
    const { data: characters } = await supabase
      .from('characters')
      .select(
        'id, name, career, level, user_id, controller_user_id, portrait_url, is_npc, pending_bonuses',
      )
      .eq('game_id', data.gameId)
      .or(
        `is_npc.eq.false,user_id.eq.${user.id},controller_user_id.eq.${user.id}`,
      )

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
