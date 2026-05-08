import { createFileRoute } from '@tanstack/react-router'
import { getCharacter } from '~/lib/server/characters'
import { CharacterSheet } from '~/components/character/CharacterSheet'
import { useRealtimeCharacter } from '~/lib/hooks/useRealtimeCharacter'

export const Route = createFileRoute(
  '/_app/games/$gameId/characters/$characterId',
)({
  loader: ({ params }) =>
    getCharacter({ data: { characterId: params.characterId } }),
  component: CharacterPage,
})

function CharacterPage() {
  const { character, canEdit } = Route.useLoaderData()
  const liveCharacter = useRealtimeCharacter(character)

  return <CharacterSheet initial={liveCharacter} canEdit={canEdit} />
}
