import { useEffect, useId, useRef } from 'react'
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

  // Supabase reuses channel instances by topic name, but a channel can only
  // have its postgres_changes listeners registered before `.subscribe()`.
  // If two consumers in the same render tree (e.g. GameLayout + CombatPage
  // both watching game_state) share a logical channel name, the second one
  // throws "cannot add callbacks after subscribe()". Salt every consumer's
  // topic with a stable React ID so each gets its own channel instance.
  const instanceId = useId()
  const channelKey = config?.channel
  const table = config?.table
  const event = config?.event ?? '*'
  const filter = config?.filter

  useEffect(() => {
    if (!channelKey || !table) return

    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(`${channelKey}#${instanceId}`)
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
  }, [channelKey, instanceId, table, event, filter])
}
