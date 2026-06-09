import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useMatch,
  useNavigate,
} from '@tanstack/react-router'
import { Popover, usePopover } from '~/components/ui/Popover'
import { SaveChip } from '~/components/ui/SaveChip'
import { StatusDot } from '~/components/ui/StatusDot'
import { useRealtimeGameState } from '~/lib/hooks/useRealtimeGameState'
import type { GameState } from '~/lib/types/database'
import { getAuthUser } from '~/lib/server/auth'
import { getSupabaseBrowserClient } from '~/lib/supabase/client'
import {
  SaveStatusProvider,
  useSaveStatus,
} from '~/lib/hooks/saveStatusContext'

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
  // SaveStatusProvider wraps both the header and the outlet so the
  // header chip and the save-source hooks (useCharacter,
  // useDebouncedNumber) share the same aggregate state.
  return (
    <SaveStatusProvider>
      <AppLayoutInner />
    </SaveStatusProvider>
  )
}

function AppLayoutInner() {
  const { user, profile } = Route.useRouteContext()
  const navigate = useNavigate()
  const gameMatch = useMatch({
    from: '/_app/games/$gameId',
    shouldThrow: false,
  })
  const game = gameMatch?.loaderData?.game
  const gameState = gameMatch?.loaderData?.gameState
  const accountMenu = usePopover({ placement: 'bottom-end' })
  const saveStatus = useSaveStatus()

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    accountMenu.setOpen(false)
    navigate({ to: '/login' })
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      {/* The header overlays the body (absolute, above the scroll panes) so
          content scrolls under its frosted gradient backdrop.
          view-transition-name lifts it into its own snapshot group, so page
          transitions animate only the body below while the header stays put
          (see ::view-transition rules in app.css). */}
      <header className="absolute inset-x-0 top-0 z-20 flex h-[var(--app-header-h)] items-center border-b border-gray-400 bg-gradient-to-t from-background-100/40 to-background-100 backdrop-blur-sm [view-transition-name:app-header]">
        {/* Two visual zones, gated at the 1600px breakpoint — that's the
            viewport width at which the body's max-w-[1280px] content area
            plus the w-80 dice feed first clear the viewport, so the feed
            stops touching content.
            ≥ 1600: the w-80 spacer is reserved on the right and the inner
            row caps at max-w-[1280px], so the avatar lines up with the
            right edge of the main content area.
            < 1600: the spacer is hidden and the inner row goes full-width,
            so the avatar instead lands at the right edge of the viewport
            (= right edge of the dice feed), above the feed itself. */}
        <div className="flex w-full">
          <div className="flex min-w-0 flex-1 justify-center">
            <div className="flex w-full max-w-none items-center justify-between gap-4 px-6 min-[1600px]:max-w-[1280px]">
              <div className="flex min-w-0 items-center gap-3">
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 shrink-0"
                >
                  <h1 className="text-lg font-bold tracking-tight text-white">
                    Exo<span className="text-accent-900">void</span>
                  </h1>
                </Link>
                {game && gameState && (
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
                    <span className="text-gray-700">·</span>
                    <CombatHeaderTag
                      gameId={game.id}
                      initialGameState={gameState}
                    />
                    <SaveChip status={saveStatus} />
                  </>
                )}
              </div>
              <div className="flex shrink-0 items-center">
                <button
                  ref={accountMenu.refs.setReference}
                  type="button"
                  className="flex items-center gap-2.5 rounded-md px-2 py-1 transition hover:bg-gray-100"
                  {...accountMenu.getReferenceProps()}
                >
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">
                      {profile?.display_name || 'Player'}
                    </p>
                    <p className="text-xs text-gray-900">{user.email}</p>
                  </div>
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-700 text-xs font-medium text-white">
                    {(profile?.display_name ||
                      user.email ||
                      '?')[0].toUpperCase()}
                  </div>
                </button>
                <Popover popover={accountMenu} className="w-44 py-1">
                  <Link
                    to="/account"
                    onClick={() => accountMenu.setOpen(false)}
                    className="block w-full px-3 py-2 text-left text-sm text-gray-1000 transition hover:bg-gray-100"
                  >
                    Account settings
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full px-3 py-2 text-left text-sm text-gray-1000 transition hover:bg-gray-100"
                  >
                    Log out
                  </button>
                </Popover>
              </div>
            </div>
          </div>
          <div
            className="hidden w-80 shrink-0 min-[1600px]:block"
            aria-hidden
          />
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

// The combat tag lives in the persistent header (an ancestor of the game
// layout route), so it can't read that route's realtime game state through
// context. It subscribes on its own instead, so starting/ending combat in
// another session updates the badge live rather than waiting for a refresh.
// Only mounted when in a game, which keeps the realtime hook unconditional.
function CombatHeaderTag({
  gameId,
  initialGameState,
}: {
  gameId: string
  initialGameState: GameState
}) {
  const { combat } = useRealtimeGameState(initialGameState)

  return (
    <Link
      to="/games/$gameId/combat"
      params={{ gameId }}
      // The active-page accent only applies when combat is idle; while it's
      // live the warning treatment wins so sitting on /combat doesn't
      // recolour the pill.
      activeProps={combat ? undefined : { className: 'text-accent-900' }}
      className={`flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition ${
        combat
          ? 'border border-warning-400 bg-warning-100 text-warning-900 hover:border-warning-500 hover:bg-warning-200'
          : 'border border-gray-400 bg-gray-100 text-gray-900 hover:border-gray-500 hover:bg-gray-200'
      }`}
    >
      {combat ? (
        <>
          <StatusDot
            tone="warning"
            pulse
            label="Combat in progress"
            className="mr-0.5"
          />
          <span className="font-semibold">Combat</span>
          <span className="text-warning-900">–</span>
          <span>Round {combat.round}</span>
        </>
      ) : (
        'Combat'
      )}
    </Link>
  )
}
