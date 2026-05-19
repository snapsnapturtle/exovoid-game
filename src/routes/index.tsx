import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getSupabaseServerClient } from '~/lib/supabase/server'

const getSession = createServerFn().handler(async () => {
  try {
    const supabase = getSupabaseServerClient()
    const { data } = await supabase.auth.getSession()
    return { session: data.session }
  } catch {
    return { session: null }
  }
})

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const { session } = await getSession()
    if (session) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <h1 className="mb-4 text-5xl font-bold tracking-tight text-white">
        Exo<span className="text-accent-900">void</span>
      </h1>
      <p className="mb-8 max-w-md text-center text-lg text-gray-900">
        Your digital companion for the Exovoid tabletop RPG. Manage characters,
        roll dice, and track your adventures in the void of space.
      </p>
      <div className="flex gap-4">
        <a
          href="/login"
          className="rounded-lg bg-accent-700 px-6 py-3 font-medium text-white transition hover:bg-accent-900"
        >
          Log In
        </a>
        <a
          href="/signup"
          className="rounded-lg border border-gray-400 px-6 py-3 font-medium text-gray-1000 transition hover:border-gray-500 hover:text-white"
        >
          Sign Up
        </a>
      </div>
    </div>
  )
}
