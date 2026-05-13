import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { InventoryPage } from '~/components/inventory/InventoryPage'
import { useRealtimeCharacter } from '~/lib/hooks/useRealtimeCharacter'
import { useRealtimeGameState } from '~/lib/hooks/useRealtimeGameState'
import { loadGameState } from '~/lib/server/inventory'

const characterRoute = getRouteApi('/_app/games/$gameId/characters/$characterId')

export const Route = createFileRoute(
  '/_app/games/$gameId/characters/$characterId/inventory',
)({
  loader: ({ params }) => loadGameState({ data: { gameId: params.gameId } }),
  component: InventoryRoute,
})

function InventoryRoute() {
  const { character, canEdit } = characterRoute.useLoaderData()
  const initialGameState = Route.useLoaderData()
  const liveCharacter = useRealtimeCharacter(character)
  const liveGameState = useRealtimeGameState(initialGameState)
  return (
    <InventoryPage
      character={liveCharacter}
      gameState={liveGameState}
      canEdit={canEdit}
    />
  )
}
