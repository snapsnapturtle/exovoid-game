import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useMatch,
  useNavigate,
} from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { getAuthUser } from '~/lib/server/auth'
import { getSupabaseBrowserClient } from '~/lib/supabase/client'

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
  const navigate = useNavigate()
  const gameMatch = useMatch({
    from: '/_app/games/$gameId',
    shouldThrow: false,
  })
  const game = gameMatch?.loaderData?.game
  const isGm = gameMatch?.loaderData?.isGm
  const combat = gameMatch?.loaderData?.gameState?.combat
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    setMenuOpen(false)
    navigate({ to: '/login' })
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-gray-400 bg-background-200 px-6 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
            <h1 className="text-lg font-bold tracking-tight text-white">
              Exo<span className="text-accent-900">void</span>
            </h1>
          </Link>
          {game && (
            <>
              <span className="text-gray-700">/</span>
              <Link
                to="/dashboard"
                className="text-sm text-gray-900 transition hover:text-white"
              >
                Games
              </Link>
              <span className="text-gray-700">/</span>
              <Link
                to="/games/$gameId"
                params={{ gameId: game.id }}
                className="truncate text-sm font-semibold text-white transition hover:text-accent-900"
              >
                {game.name}
              </Link>
              {isGm && (
                <span className="shrink-0 rounded-full bg-warning-700/20 px-2 py-0.5 text-xs font-medium text-warning-900">
                  GM
                </span>
              )}
              <span className="text-gray-700">·</span>
              <Link
                to="/games/$gameId/combat"
                params={{ gameId: game.id }}
                activeProps={{ className: 'text-accent-900' }}
                className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium transition ${
                  combat
                    ? 'border border-warning-700/60 bg-warning-700/15 text-warning-900 hover:bg-warning-700/25'
                    : 'border border-gray-400 text-gray-900 hover:border-accent-700 hover:text-white'
                }`}
              >
                {combat ? `⚔ Round ${combat.round}` : 'Combat'}
              </Link>
            </>
          )}
        </div>
        <div ref={menuRef} className="relative flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex items-center gap-3 rounded-md px-2 py-1 transition hover:bg-gray-100"
          >
            <div className="text-right">
              <p className="text-sm font-medium text-white">
                {profile?.display_name || 'Player'}
              </p>
              <p className="text-xs text-gray-900">{user.email}</p>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-700 text-sm font-medium text-white">
              {(profile?.display_name || user.email || '?')[0].toUpperCase()}
            </div>
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="elevation-float absolute right-0 top-full z-50 mt-2 w-44 rounded-md border border-gray-400 bg-background-200 py-1"
            >
              <Link
                to="/account"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="block w-full px-3 py-2 text-left text-sm text-gray-1000 transition hover:bg-gray-100"
              >
                Account settings
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="w-full px-3 py-2 text-left text-sm text-gray-1000 transition hover:bg-gray-100"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
