import { useEffect, useState } from 'react'
import { useRealtimeSubscription } from './useRealtimeSubscription'
import { getSupabaseBrowserClient } from '~/lib/supabase/client'
import type { Character } from '~/lib/types/database'

/**
 * Live character snapshot. Bootstraps from `initial` (the route loader's
 * cached value, which can be stale across sibling navigations — e.g.
 * /index → /progression → /index) and immediately re-fetches the row
 * on mount. After that, postgres_changes UPDATE events keep the value
 * fresh.
 *
 * Why fetch on mount: TanStack Router caches loader data; navigating
 * away and back doesn't re-run the parent route's loader if it stays
 * mounted, so `initial` would otherwise be the snapshot from when the
 * user first hit the route — pre-XP, pre-level-up. router.invalidate()
 * helps for routes that are about to mount fresh, but a direct refetch
 * here is the belt-and-suspenders that survives every code path.
 */
export function useRealtimeCharacter(initial: Character): Character {
  const [character, setCharacter] = useState(initial)

  useEffect(() => {
    setCharacter(initial)
  }, [initial])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('characters')
        .select('*')
        .eq('id', initial.id)
        .single()
      if (cancelled) return
      if (error) {
        console.error('Failed to refresh character on mount', error)
        return
      }
      if (data) setCharacter(data as unknown as Character)
    })()
    return () => {
      cancelled = true
    }
  }, [initial.id])

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
