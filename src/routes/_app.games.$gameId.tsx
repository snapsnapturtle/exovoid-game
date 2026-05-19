import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from '@tanstack/react-router'
import { useMemo } from 'react'
import { getGame } from '~/lib/server/games'
import { getRecentRolls } from '~/lib/server/dice'
import { loadGameState } from '~/lib/server/inventory'
import { useDiceRollFeed } from '~/lib/hooks/useDiceRollFeed'
import { useRealtimeGameState } from '~/lib/hooks/useRealtimeGameState'
import { DiceFeedContext } from '~/lib/hooks/diceFeedContext'
import { DiceFeed } from '~/components/dice/DiceFeed'

export const Route = createFileRoute('/_app/games/$gameId')({
  loader: async ({ params }) => {
    const [gameData, rolls, gameState] = await Promise.all([
      getGame({ data: { gameId: params.gameId } }),
      getRecentRolls({ data: { gameId: params.gameId } }),
      loadGameState({ data: { gameId: params.gameId } }),
    ])
    return { ...gameData, rolls, gameState }
  },
  component: GameLayout,
})

function GameLayout() {
  const { game, isGm, rolls, currentUserId, characters, gameState } =
    Route.useLoaderData()
  const liveGameState = useRealtimeGameState(gameState)
  const location = useLocation()
  const {
    rolls: liveRolls,
    refresh,
    broadcastNewRoll,
  } = useDiceRollFeed(game.id, rolls)
  const ctx = useMemo(
    () => ({ refresh, broadcastNewRoll }),
    [refresh, broadcastNewRoll],
  )
  const myCharacters = useMemo(
    () =>
      characters
        .filter((c) => c.user_id === currentUserId)
        .map((c) => ({ id: c.id, name: c.name })),
    [characters, currentUserId],
  )

  const showCombatBanner =
    !!liveGameState.combat && !location.pathname.endsWith('/combat')

  return (
    <DiceFeedContext.Provider value={ctx}>
      <div className="flex h-full min-h-0 overflow-hidden">
        <div className="min-w-0 flex-1 overflow-auto">
          {showCombatBanner && liveGameState.combat && (
            <Link
              to="/games/$gameId/combat"
              params={{ gameId: game.id }}
              className="block border-b border-warning-700/40 bg-warning-700/10 px-4 py-2 text-sm text-warning-900 transition hover:bg-warning-700/20"
            >
              <span className="mr-2">⚔</span>
              <span className="font-semibold">
                Combat active — Round {liveGameState.combat.round}
              </span>
              <span className="ml-2 text-warning-900/80">
                Go to tracker →
              </span>
            </Link>
          )}
          <Outlet />
        </div>
        <DiceFeed
          rolls={liveRolls}
          currentUserId={currentUserId}
          gameId={game.id}
          isGm={isGm}
          myCharacters={myCharacters}
        />
      </div>
    </DiceFeedContext.Provider>
  )
}
