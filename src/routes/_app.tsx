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
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col border-r border-void-600 bg-void-800">
        <div className="border-b border-void-600 p-4">
          <Link to="/dashboard">
            <h1 className="text-xl font-bold tracking-tight text-white">
              Exo<span className="text-accent-400">void</span>
            </h1>
          </Link>
        </div>
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            <li>
              <Link
                to="/dashboard"
                className="block rounded-lg px-3 py-2 text-sm text-gray-300 transition hover:bg-void-700 hover:text-white [&.active]:bg-void-700 [&.active]:text-white"
              >
                Games
              </Link>
            </li>
          </ul>
        </nav>
        <div className="border-t border-void-600 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-500 text-sm font-medium text-white">
              {(profile?.display_name || user.email || '?')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {profile?.display_name || 'Player'}
              </p>
              <p className="truncate text-xs text-gray-400">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
