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
import type { GameState } from '~/lib/types/domain'
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

// Breadcrumb link styling. Ancestors are subdued (gray-900) and brighten on
// hover; the deepest/current crumb sits at the brighter gray-1000.
function crumbClass(active: boolean): string {
  return `truncate text-sm transition ${
    active ? 'text-gray-1000' : 'text-gray-900 hover:text-white'
  }`
}

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
  // The character layout route is nested under the game and now serves both
  // PCs and NPCs, so this match (and the crumb it drives) is present on the
  // sheet and every child page (progression, cyberware, inventory, …) for
  // either kind.
  const characterMatch = useMatch({
    from: '/_app/games/$gameId/characters/$characterId',
    shouldThrow: false,
  })
  const character = characterMatch?.loaderData?.character
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
      <header className="elevation-float absolute inset-x-0 top-0 z-20 flex h-[var(--app-header-h)] items-center bg-gradient-to-t from-background-100/40 to-background-100 backdrop-blur-sm [view-transition-name:app-header]">
        {/* The header content tracks the body's centered max-w-[1600px] block
            (content + dice feed), so the account button sits at its right edge
            — above the feed — at every screen size. No breakpoint, no jump. */}
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
              <h1 className="text-lg font-bold tracking-tight text-white">
                Exo<span className="text-accent-900">void</span>
              </h1>
            </Link>
            {game && gameState && (
              <>
                {/* "Games" is omitted — the Exovoid wordmark already links to
                    the dashboard. The trail is at most two deep (game /
                    character|NPC), so no truncation/collapse is needed. The
                    deepest (current) crumb gets the brighter gray-1000;
                    ancestors stay subdued. */}
                <span className="text-gray-700">/</span>
                <Link
                  to="/games/$gameId"
                  params={{ gameId: game.id }}
                  className={crumbClass(!character)}
                >
                  {game.name}
                </Link>
                {character && (
                  <>
                    <span className="text-gray-700">/</span>
                    <Link
                      to="/games/$gameId/characters/$characterId"
                      params={{
                        gameId: game.id,
                        characterId: character.id,
                      }}
                      className={crumbClass(true)}
                    >
                      {character.name}
                    </Link>
                  </>
                )}
                <div className="ml-5 flex items-center gap-3">
                  <CombatHeaderTag
                    gameId={game.id}
                    initialGameState={gameState}
                  />
                  <SaveChip status={saveStatus} />
                </div>
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
                {(profile?.display_name || user.email || '?')[0].toUpperCase()}
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
