import { createFileRoute, Outlet, Link } from '@tanstack/react-router'
import { getGame } from '~/lib/server/games'

export const Route = createFileRoute('/_app/games/$gameId')({
  loader: ({ params }) => getGame({ data: { gameId: params.gameId } }),
  component: GameLayout,
})

function GameLayout() {
  const { game, isGm } = Route.useLoaderData()

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-4 border-b border-void-600 bg-void-800 px-6 py-3">
        <Link
          to="/dashboard"
          className="text-sm text-gray-400 hover:text-white"
        >
          &larr; Games
        </Link>
        <h2 className="text-lg font-semibold text-white">{game.name}</h2>
        {isGm && (
          <span className="rounded-full bg-warning-500/20 px-2 py-0.5 text-xs font-medium text-warning-400">
            GM
          </span>
        )}
      </header>
      <div className="flex-1 overflow-auto">
        <Outlet />
      </div>
    </div>
  )
}
