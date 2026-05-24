import { createFileRoute, Outlet } from '@tanstack/react-router'
import { getCharacter } from '~/lib/server/characters'

export const Route = createFileRoute('/_app/games/$gameId/npcs/$npcId')({
  loader: ({ params }) =>
    getCharacter({ data: { characterId: params.npcId } }),
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.character.name ?? 'NPC'} — Exovoid` }],
  }),
  component: NpcLayout,
})

function NpcLayout() {
  return <Outlet />
}
