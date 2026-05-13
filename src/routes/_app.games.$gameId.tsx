import { createFileRoute, Outlet } from '@tanstack/react-router'
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
  const { game, isGm, rolls, currentUserId, characters } =
    Route.useLoaderData()
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

  return (
    <DiceFeedContext.Provider value={ctx}>
      <div className="flex h-full min-h-0 overflow-hidden">
        <div className="min-w-0 flex-1 overflow-auto">
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
