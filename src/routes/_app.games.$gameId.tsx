import { createFileRoute, Outlet, Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import { getGame } from '~/lib/server/games'
import { getRecentRolls } from '~/lib/server/dice'
import { useDiceRollFeed } from '~/lib/hooks/useDiceRollFeed'
import { DiceFeedContext } from '~/lib/hooks/diceFeedContext'
import { DiceFeed } from '~/components/dice/DiceFeed'

export const Route = createFileRoute('/_app/games/$gameId')({
  loader: async ({ params }) => {
    const [gameData, rolls] = await Promise.all([
      getGame({ data: { gameId: params.gameId } }),
      getRecentRolls({ data: { gameId: params.gameId } }),
    ])
    return { ...gameData, rolls }
  },
  component: GameLayout,
})

function GameLayout() {
  const { game, isGm, rolls, currentUserId } = Route.useLoaderData()
  const {
    rolls: liveRolls,
    refresh,
    broadcastNewRoll,
  } = useDiceRollFeed(game.id, rolls)
  const ctx = useMemo(
    () => ({ refresh, broadcastNewRoll }),
    [refresh, broadcastNewRoll],
  )

  return (
    <DiceFeedContext.Provider value={ctx}>
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-center gap-4 border-b border-void-600 bg-void-800 px-6 py-3">
          <Link
            to="/dashboard"
            className="text-sm text-gray-400 hover:text-white"
          >
            &larr; Games
          </Link>
          <h2 className="text-lg font-semibold text-white">{game.name}</h2>
          {isGm && (
            <span className="rounded-full bg-warning-500/20 px-2 py-0.5 text-xs font-medium text-warning-400">
              GM
            </span>
          )}
        </header>
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="min-w-0 flex-1 overflow-auto">
            <Outlet />
          </div>
          <DiceFeed rolls={liveRolls} currentUserId={currentUserId} />
        </div>
      </div>
    </DiceFeedContext.Provider>
  )
}
