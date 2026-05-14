import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '~/lib/types/database'

let client: ReturnType<typeof createBrowserClient<Database>> | null = null
let realtimeAuthReady: Promise<void> | null = null

export function getSupabaseBrowserClient() {
  if (client) return client

  client = createBrowserClient<Database>(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  )

  // Keep the realtime token in sync on subsequent token refreshes. The
  // initial setAuth is handled by `ensureRealtimeAuth()` below — callers
  // that need a token-bound subscription must await that promise before
  // calling `.subscribe()`, otherwise the channel joins anon and RLS-
  // filtered postgres_changes events are dropped server-side.
  const c = client
  c.auth.onAuthStateChange((_event, session) => {
    if (session) c.realtime.setAuth(session.access_token)
  })

  return client
}

/**
 * Resolves once the realtime client has the current user's access token
 * applied. Subscribe to realtime channels only after awaiting this — the
 * initial Supabase auth hydration is async, and joining a channel before
 * the token is set causes the server to record the subscription with the
 * `anon` role. RLS policies scoped to `authenticated` then reject all
 * subsequent change events for that subscription, with no error surfaced
 * to the client.
 */
export function ensureRealtimeAuth(): Promise<void> {
  if (realtimeAuthReady) return realtimeAuthReady
  const c = getSupabaseBrowserClient()
  realtimeAuthReady = c.auth.getSession().then(({ data: { session } }) => {
    if (session) c.realtime.setAuth(session.access_token)
  })
  return realtimeAuthReady
}
