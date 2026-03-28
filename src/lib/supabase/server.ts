import { createServerClient } from '@supabase/ssr'
import { getCookies, setCookie } from '@tanstack/react-start/server'
import type { Database } from '~/lib/types/database'

export function getSupabaseServerClient() {
  return createServerClient<Database>(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    {
      cookies: {
        async getAll() {
          const cookies = await getCookies()
          return Object.entries(cookies).map(([name, value]) => ({
            name,
            value: value ?? '',
          }))
        },
        async setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            await setCookie(name, value, options)
          }
        },
      },
    },
  )
}
