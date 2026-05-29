import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { ProgressionHistoryPage } from '~/components/character/ProgressionHistoryPage'
import { useRealtimeCharacter } from '~/lib/hooks/useRealtimeCharacter'
import { listProgression } from '~/lib/server/progression'

const characterRoute = getRouteApi(
  '/_app/games/$gameId/characters/$characterId',
)

export const Route = createFileRoute(
  '/_app/games/$gameId/characters/$characterId/progression',
)({
  // Server-side fetch of the progression rows. The page IS the rows;
  // server-rendering them means meaningful HTML on first paint instead
  // of an empty state that flickers into the real list once the client
  // fetch resolves. The character itself still comes from the parent
  // route's loader.
  loader: ({ params }) =>
    listProgression({ data: { characterId: params.characterId } }),
  head: () => ({ meta: [{ title: 'Progression — Exovoid' }] }),
  component: ProgressionRoute,
})

function ProgressionRoute() {
  const { character, canEdit } = characterRoute.useLoaderData()
  const initialProgression = Route.useLoaderData()
  const liveCharacter = useRealtimeCharacter(character)
  return (
    <ProgressionHistoryPage
      character={liveCharacter}
      canEdit={canEdit}
      initialProgression={initialProgression}
    />
  )
}
