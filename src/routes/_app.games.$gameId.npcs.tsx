import { createFileRoute, Outlet } from '@tanstack/react-router'
import { listNpcs } from '~/lib/server/npcs'

export const Route = createFileRoute('/_app/games/$gameId/npcs')({
  loader: async ({ params }) => {
    const npcs = await listNpcs({ data: { gameId: params.gameId } })
    return { npcs }
  },
  head: () => ({ meta: [{ title: 'NPCs — Exovoid' }] }),
  component: NpcLayout,
})

function NpcLayout() {
  return <Outlet />
}
