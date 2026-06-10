import { createFileRoute, Outlet } from '@tanstack/react-router'
import { getShip } from '~/lib/server/ships'

export const Route = createFileRoute('/_app/games/$gameId/ships/$shipId')({
  loader: async ({ params }) => {
    const ship = await getShip({ data: { shipId: params.shipId } })
    return { ship }
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.ship.name ?? 'Ship'} — Exovoid` }],
  }),
  component: ShipLayout,
})

// Layout route so the later ship-combat phase can add sibling tabs
// (crew stations etc.) without restructuring.
function ShipLayout() {
  return <Outlet />
}
