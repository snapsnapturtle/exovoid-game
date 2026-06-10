import { createFileRoute, getRouteApi } from '@tanstack/react-router'
import { ShipSheet } from '~/components/ships/ShipSheet'
import { useRealtimeShip } from '~/lib/hooks/useRealtimeShip'

const shipRoute = getRouteApi('/_app/games/$gameId/ships/$shipId')

export const Route = createFileRoute('/_app/games/$gameId/ships/$shipId/')({
  component: ShipSheetPage,
})

function ShipSheetPage() {
  const { ship } = shipRoute.useLoaderData()
  const liveShip = useRealtimeShip(ship)
  return <ShipSheet initial={liveShip} />
}
