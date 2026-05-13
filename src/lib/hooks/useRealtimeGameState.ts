import { useEffect, useState } from 'react'
import { useRealtimeSubscription } from './useRealtimeSubscription'
import type { GameState } from '~/lib/types/database'

export function useRealtimeGameState(initial: GameState): GameState {
  const [state, setState] = useState(initial)

  useEffect(() => {
    setState(initial)
  }, [initial])

  useRealtimeSubscription<GameState>({
    channel: `game_state:${initial.game_id}`,
    table: 'game_state',
    event: 'UPDATE',
    filter: `game_id=eq.${initial.game_id}`,
    onChange: (payload) => {
      if (payload.new && 'game_id' in payload.new) {
        setState(payload.new as GameState)
      }
    },
  })

  return state
}
