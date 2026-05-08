import { useEffect, useRef } from 'react'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import { getSupabaseBrowserClient } from '~/lib/supabase/client'

type DbEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*'

export type RealtimeSubscriptionConfig<
  T extends Record<string, any> = Record<string, any>,
> = {
  channel: string
  table: string
  event?: DbEvent
  filter?: string
  onChange: (payload: RealtimePostgresChangesPayload<T>) => void
}

export function useRealtimeSubscription<
  T extends Record<string, any> = Record<string, any>,
>(config: RealtimeSubscriptionConfig<T> | null) {
  const onChangeRef = useRef(config?.onChange)
  onChangeRef.current = config?.onChange

  const channelKey = config?.channel
  const table = config?.table
  const event = config?.event ?? '*'
  const filter = config?.filter

  useEffect(() => {
    if (!channelKey || !table) return

    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(channelKey)
      .on<T>(
        'postgres_changes' as never,
        { event, schema: 'public', table, filter },
        (payload: RealtimePostgresChangesPayload<T>) => {
          onChangeRef.current?.(payload)
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [channelKey, table, event, filter])
}
