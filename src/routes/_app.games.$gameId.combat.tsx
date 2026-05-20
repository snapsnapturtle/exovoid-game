import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { CombatPage } from '~/components/combat/CombatPage'
import { useRealtimeGameState } from '~/lib/hooks/useRealtimeGameState'
import { useRealtimeCharacters } from '~/lib/hooks/useRealtimeCharacters'
import { loadGameState } from '~/lib/server/inventory'
import { loadCombatCharacters } from '~/lib/server/combat'

const gameRoute = getRouteApi('/_app/games/$gameId')

export const Route = createFileRoute('/_app/games/$gameId/combat')({
  loader: async ({ params }) => {
    const [gameState, characters] = await Promise.all([
      loadGameState({ data: { gameId: params.gameId } }),
      loadCombatCharacters({ data: { gameId: params.gameId } }),
    ])
    return { gameState, characters }
  },
  head: () => ({ meta: [{ title: 'Combat — Exovoid' }] }),
  component: CombatRoute,
})

function CombatRoute() {
  const { game, currentUserId, isGm } = gameRoute.useLoaderData()
  const { gameState: initialGameState, characters: initialCharacters } =
    Route.useLoaderData()
  const liveGameState = useRealtimeGameState(initialGameState)
  const liveCharacters = useRealtimeCharacters(game.id, initialCharacters)
  return (
    <CombatPage
      game={game}
      gameState={liveGameState}
      characters={liveCharacters}
      currentUserId={currentUserId}
      isGm={isGm}
    />
  )
}
