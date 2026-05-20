import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { CharacterSheet } from '~/components/character/CharacterSheet'
import { useRealtimeCharacter } from '~/lib/hooks/useRealtimeCharacter'

const characterRoute = getRouteApi(
  '/_app/games/$gameId/characters/$characterId',
)

export const Route = createFileRoute(
  '/_app/games/$gameId/characters/$characterId/',
)({
  component: CharacterPage,
})

function CharacterPage() {
  const { character, canEdit } = characterRoute.useLoaderData()
  const liveCharacter = useRealtimeCharacter(character)

  return <CharacterSheet initial={liveCharacter} canEdit={canEdit} />
}
