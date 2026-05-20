import { createFileRoute, Outlet } from '@tanstack/react-router'
import { getCharacter } from '~/lib/server/characters'

export const Route = createFileRoute(
  '/_app/games/$gameId/characters/$characterId',
)({
  loader: ({ params }) =>
    getCharacter({ data: { characterId: params.characterId } }),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.character.name ?? 'Character'} — Exovoid` }],
  }),
  component: CharacterLayout,
})

function CharacterLayout() {
  return <Outlet />
}
