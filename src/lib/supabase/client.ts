import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '~/lib/types/database'

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function getSupabaseBrowserClient() {
  if (client) return client

  client = createBrowserClient<Database>(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  )

  // Realtime evaluates RLS server-side using the access token passed via
  // setAuth. With cookie-based SSR sessions the token isn't propagated to
  // the realtime client automatically, so filtered subscriptions on
  // non-PK columns (e.g. game_id=eq.X on characters) silently drop events
  // because realtime sees us as anon. Pass the token eagerly and on every
  // auth change.
  const c = client
  void c.auth.getSession().then(({ data: { session } }) => {
    if (session) c.realtime.setAuth(session.access_token)
  })
  c.auth.onAuthStateChange((_event, session) => {
    if (session) c.realtime.setAuth(session.access_token)
  })

  return client
}
