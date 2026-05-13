import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { TalentTreePage } from '~/components/talents/TalentTreePage'
import { useRealtimeCharacter } from '~/lib/hooks/useRealtimeCharacter'

const characterRoute = getRouteApi('/_app/games/$gameId/characters/$characterId')

export const Route = createFileRoute(
  '/_app/games/$gameId/characters/$characterId/talents',
)({
  component: TalentsPage,
})

function TalentsPage() {
  const { character, canEdit } = characterRoute.useLoaderData()
  const liveCharacter = useRealtimeCharacter(character)
  return <TalentTreePage initial={liveCharacter} canEdit={canEdit} />
}
