import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { CyberwarePage } from '~/components/cyberware/CyberwarePage'
import { useRealtimeCharacter } from '~/lib/hooks/useRealtimeCharacter'

const npcRoute = getRouteApi('/_app/games/$gameId/npcs/$npcId')

export const Route = createFileRoute(
  '/_app/games/$gameId/npcs/$npcId/cyberware',
)({
  head: () => ({ meta: [{ title: 'Cyberware — Exovoid' }] }),
  component: CyberwareRoute,
})

function CyberwareRoute() {
  const { character, canEdit } = npcRoute.useLoaderData()
  const liveCharacter = useRealtimeCharacter(character)
  return <CyberwarePage initial={liveCharacter} canEdit={canEdit} />
}
