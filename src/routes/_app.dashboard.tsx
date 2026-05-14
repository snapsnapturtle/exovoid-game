import { createFileRoute, Link } from '@tanstack/react-router'
import { getUserGames } from '~/lib/server/games'
import { buttonClasses } from '~/components/ui/Button'

export const Route = createFileRoute('/_app/dashboard')({
  loader: () => getUserGames(),
  component: DashboardPage,
})

function DashboardPage() {
  const games = Route.useLoaderData()

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Your Games</h2>
        <div className="flex gap-3">
          <Link to="/games/join" className={buttonClasses('ghost')}>
            Join Game
          </Link>
          <Link to="/games/new" className={buttonClasses('primary')}>
            Create Game
          </Link>
        </div>
      </div>

      {games.length === 0 ? (
        <div className="rounded-xl border border-void-600 bg-void-800 p-12 text-center">
          <p className="mb-2 text-lg text-gray-300">No games yet</p>
          <p className="text-sm text-gray-500">
            Create a new game as a Game Master or join an existing one with an
            invite code.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <Link
              key={game.id}
              to="/games/$gameId"
              params={{ gameId: game.id }}
              className="group rounded-xl border border-void-600 bg-void-800 p-6 transition hover:border-accent-500"
            >
              <h3 className="mb-2 text-lg font-semibold text-white group-hover:text-accent-400">
                {game.name}
              </h3>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  game.role === 'gm'
                    ? 'bg-warning-500/20 text-warning-400'
                    : 'bg-accent-500/20 text-accent-400'
                }`}
              >
                {game.role === 'gm' ? 'Game Master' : 'Player'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
