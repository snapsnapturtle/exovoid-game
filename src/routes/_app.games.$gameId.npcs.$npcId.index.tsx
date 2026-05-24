import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { CharacterSheet } from '~/components/character/CharacterSheet'
import { useRealtimeCharacter } from '~/lib/hooks/useRealtimeCharacter'

const npcRoute = getRouteApi('/_app/games/$gameId/npcs/$npcId')

export const Route = createFileRoute('/_app/games/$gameId/npcs/$npcId/')({
  component: NpcSheetPage,
})

function NpcSheetPage() {
  const { character, canEdit } = npcRoute.useLoaderData()
  const liveCharacter = useRealtimeCharacter(character)
  return <CharacterSheet initial={liveCharacter} canEdit={canEdit} />
}
