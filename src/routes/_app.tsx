import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useMatch,
} from '@tanstack/react-router'
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
  const gameMatch = useMatch({
    from: '/_app/games/$gameId',
    shouldThrow: false,
  })
  const game = gameMatch?.loaderData?.game
  const isGm = gameMatch?.loaderData?.isGm

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-void-600 bg-void-800 px-6 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
            <h1 className="text-lg font-bold tracking-tight text-white">
              Exo<span className="text-accent-400">void</span>
            </h1>
          </Link>
          {game && (
            <>
              <span className="text-gray-600">/</span>
              <Link
                to="/dashboard"
                className="text-sm text-gray-400 transition hover:text-white"
              >
                Games
              </Link>
              <span className="text-gray-600">/</span>
              <h2 className="truncate text-sm font-semibold text-white">
                {game.name}
              </h2>
              {isGm && (
                <span className="shrink-0 rounded-full bg-warning-500/20 px-2 py-0.5 text-xs font-medium text-warning-400">
                  GM
                </span>
              )}
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3">
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
