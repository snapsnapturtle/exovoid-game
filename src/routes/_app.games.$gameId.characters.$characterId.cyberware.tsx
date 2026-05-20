import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { CyberwarePage } from '~/components/cyberware/CyberwarePage'
import { useRealtimeCharacter } from '~/lib/hooks/useRealtimeCharacter'

const characterRoute = getRouteApi('/_app/games/$gameId/characters/$characterId')

export const Route = createFileRoute(
  '/_app/games/$gameId/characters/$characterId/cyberware',
)({
  head: () => ({ meta: [{ title: 'Cyberware — Exovoid' }] }),
  component: CyberwareRoute,
})

function CyberwareRoute() {
  const { character, canEdit } = characterRoute.useLoaderData()
  const liveCharacter = useRealtimeCharacter(character)
  return <CyberwarePage initial={liveCharacter} canEdit={canEdit} />
}
