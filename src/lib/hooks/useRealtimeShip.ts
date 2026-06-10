import { useEffect, useState } from 'react'
import { useRealtimeSubscription } from './useRealtimeSubscription'
import { getSupabaseBrowserClient } from '~/lib/supabase/client'
import type { Ship } from '~/lib/types/database'

/**
 * Live ship snapshot — same shape as useRealtimeCharacter: bootstrap from
 * the (possibly stale) loader value, re-fetch the row on mount, then let
 * postgres_changes UPDATE events keep it fresh.
 */
export function useRealtimeShip(initial: Ship): Ship {
  const [ship, setShip] = useState(initial)

  useEffect(() => {
    setShip(initial)
  }, [initial])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('ships')
        .select('*')
        .eq('id', initial.id)
        .single()
      if (cancelled) return
      if (error) {
        console.error('Failed to refresh ship on mount', error)
        return
      }
      if (data) setShip(data as unknown as Ship)
    })()
    return () => {
      cancelled = true
    }
  }, [initial.id])

  useRealtimeSubscription<Ship>({
    channel: `ship:${initial.id}`,
    table: 'ships',
    event: 'UPDATE',
    filter: `id=eq.${initial.id}`,
    onChange: (payload) => {
      if (payload.new && 'id' in payload.new) {
        setShip(payload.new as Ship)
      }
    },
  })

  return ship
}
