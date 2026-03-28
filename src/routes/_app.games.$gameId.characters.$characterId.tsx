import { createFileRoute } from '@tanstack/react-router'
import { getCharacter } from '~/lib/server/characters'
import { CharacterSheet } from '~/components/character/CharacterSheet'

export const Route = createFileRoute(
  '/_app/games/$gameId/characters/$characterId',
)({
  loader: ({ params }) =>
    getCharacter({ data: { characterId: params.characterId } }),
  component: CharacterPage,
})

function CharacterPage() {
  const { character, canEdit } = Route.useLoaderData()

  return <CharacterSheet initial={character} canEdit={canEdit} />
}
