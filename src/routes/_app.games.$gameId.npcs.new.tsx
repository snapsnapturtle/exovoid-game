import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { NpcCreationForm } from '~/components/npcs/NpcCreationForm'

const gameRoute = getRouteApi('/_app/games/$gameId')

export const Route = createFileRoute('/_app/games/$gameId/npcs/new')({
  head: () => ({ meta: [{ title: 'New NPC — Exovoid' }] }),
  component: NewNpcPage,
})

function NewNpcPage() {
  const { gameId } = Route.useParams()
  const { isGm, members, currentUserId } = gameRoute.useLoaderData()
  return (
    <NpcCreationForm
      gameId={gameId}
      isGm={isGm}
      currentUserId={currentUserId}
      members={members}
    />
  )
}
