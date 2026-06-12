import { useEffect, useState } from 'react'
import { useRealtimeSubscription } from './useRealtimeSubscription'
import type { Character } from '~/lib/types/domain'

/**
 * Live-subscribe to all characters in a game. Used by the combat tracker so
 * HP / edge / ammo / durability changes propagate to every viewer without a
 * manual refresh. Note: this assumes REPLICA IDENTITY FULL on the characters
 * table (migration 002), required for game_id filtered subscriptions.
 */
/**
 * Generic over `T extends { id: string }` so callers can pass a narrower row
 * shape — e.g. the dice-feed pending-bonuses path selects only the fields it
 * cares about. The realtime payload always carries a full Character row, but
 * we project it back through the caller's `T` shape so the returned array
 * stays homogeneous with the initial data.
 */
export function useRealtimeCharacters<T extends { id: string }>(
  gameId: string,
  initial: T[],
): T[] {
  const [characters, setCharacters] = useState<T[]>(initial)

  useEffect(() => {
    setCharacters(initial)
  }, [initial])

  useRealtimeSubscription<Character>({
    channel: `characters:${gameId}`,
    table: 'characters',
    event: 'UPDATE',
    filter: `game_id=eq.${gameId}`,
    onChange: (payload) => {
      if (!payload.new || !('id' in payload.new)) return
      const next = payload.new as Character
      setCharacters((prev) =>
        prev.map((c) => (c.id === next.id ? (next as unknown as T) : c)),
      )
    },
  })

  return characters
}
