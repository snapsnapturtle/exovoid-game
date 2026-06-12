import { createMiddleware } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/lib/supabase/server'

/**
 * Auth gate for server functions. Creates the request-scoped Supabase client,
 * resolves the signed-in user, and throws `Not authenticated` when there is
 * none. Attach with `.middleware([authMiddleware])` and read `{ supabase, user }`
 * off the handler's `context`.
 *
 * `getAuthUser` (auth.ts) is the deliberate exception — it returns
 * `{ user: null }` instead of throwing, for the checks that tolerate an
 * unauthenticated caller.
 */
export const authMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const supabase = getSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    return next({ context: { supabase, user } })
  },
)
