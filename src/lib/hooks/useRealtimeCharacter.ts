import { useEffect, useState } from 'react'
import { useRealtimeSubscription } from './useRealtimeSubscription'
import type { Character } from '~/lib/types/database'

export function useRealtimeCharacter(initial: Character): Character {
  const [character, setCharacter] = useState(initial)

  useEffect(() => {
    setCharacter(initial)
  }, [initial])

  useRealtimeSubscription<Character>({
    channel: `character:${initial.id}`,
    table: 'characters',
    event: 'UPDATE',
    filter: `id=eq.${initial.id}`,
    onChange: (payload) => {
      if (payload.new && 'id' in payload.new) {
        setCharacter(payload.new as Character)
      }
    },
  })

  return character
}
