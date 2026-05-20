import { useEffect, useState } from 'react'
import { useRealtimeSubscription } from './useRealtimeSubscription'
import type { Character } from '~/lib/types/database'

/**
 * Live-subscribe to all characters in a game. Used by the combat tracker so
 * HP / edge / ammo / durability changes propagate to every viewer without a
 * manual refresh. Note: this assumes REPLICA IDENTITY FULL on the characters
 * table (migration 002), required for game_id filtered subscriptions.
 */
export function useRealtimeCharacters(
  gameId: string,
  initial: Character[],
): Character[] {
  const [characters, setCharacters] = useState<Character[]>(initial)

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
      setCharacters((prev) => prev.map((c) => (c.id === next.id ? next : c)))
    },
  })

  return characters
}
