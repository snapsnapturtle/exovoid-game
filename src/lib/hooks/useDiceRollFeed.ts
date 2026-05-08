import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { getSupabaseBrowserClient } from '~/lib/supabase/client'
import { getRecentRolls, type DiceRollEntry } from '~/lib/server/dice'

const BROADCAST_EVENT = 'roll'

/**
 * Maintains a live list of recent dice rolls for a game.
 *
 * Signaling uses Supabase Realtime broadcast (pub/sub on a channel) rather
 * than `postgres_changes`. In this project, postgres_changes events filtered
 * by `game_id` have been silently dropped for non-inserter clients (likely
 * due to realtime-side RLS auth not being set on cookie-based SSR sessions),
 * so we rely on the inserter explicitly broadcasting after a successful roll.
 *
 * On any broadcast (or initial mount) we refetch the full feed via
 * `getRecentRolls` — that's also exposed as `refresh` so the inserter's tab
 * can update synchronously after the server function returns, regardless of
 * whether the broadcast round-trip is delivered first.
 */
export function useDiceRollFeed(
  gameId: string,
  initial: DiceRollEntry[],
): {
  rolls: DiceRollEntry[]
  refresh: () => Promise<void>
  broadcastNewRoll: () => void
} {
  const [rolls, setRolls] = useState(initial)
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    setRolls(initial)
  }, [initial])

  const refresh = useCallback(async () => {
    try {
      const next = await getRecentRolls({ data: { gameId } })
      setRolls(next)
    } catch {
      /* swallow — next event or reload will recover */
    }
  }, [gameId])

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(`game:${gameId}:rolls`)
      .on('broadcast', { event: BROADCAST_EVENT }, () => {
        void refresh()
      })
      .subscribe()
    channelRef.current = channel
    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [gameId, refresh])

  const broadcastNewRoll = useCallback(() => {
    channelRef.current?.send({
      type: 'broadcast',
      event: BROADCAST_EVENT,
      payload: {},
    })
  }, [])

  return { rolls, refresh, broadcastNewRoll }
}
