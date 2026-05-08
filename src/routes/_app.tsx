import { createFileRoute, Outlet, redirect, Link } from '@tanstack/react-router'
import { getAuthUser } from '~/lib/server/auth'

export const Route = createFileRoute('/_app')({
  beforeLoad: async () => {
    const { user, profile } = await getAuthUser()
    if (!user) {
      throw redirect({ to: '/login' })
    }
    return { user, profile }
  },
  component: AppLayout,
})

function AppLayout() {
  const { user, profile } = Route.useRouteContext()

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between border-b border-void-600 bg-void-800 px-6 py-3">
        <Link to="/dashboard" className="flex items-center gap-2">
          <h1 className="text-lg font-bold tracking-tight text-white">
            Exo<span className="text-accent-400">void</span>
          </h1>
        </Link>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-white">
              {profile?.display_name || 'Player'}
            </p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-500 text-sm font-medium text-white">
            {(profile?.display_name || user.email || '?')[0].toUpperCase()}
          </div>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
