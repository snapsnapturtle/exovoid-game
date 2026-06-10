import { createFileRoute, Outlet } from '@tanstack/react-router'
import { listShips } from '~/lib/server/ships'

export const Route = createFileRoute('/_app/games/$gameId/ships')({
  loader: async ({ params }) => {
    const ships = await listShips({ data: { gameId: params.gameId } })
    return { ships }
  },
  head: () => ({ meta: [{ title: 'Ships — Exovoid' }] }),
  component: ShipsLayout,
})

function ShipsLayout() {
  return <Outlet />
}
