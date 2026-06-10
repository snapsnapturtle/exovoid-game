import { createFileRoute, Link } from '@tanstack/react-router'
import { getUserGames } from '~/lib/server/games'
import { buttonClasses } from '~/components/ui/Button'
import { surfaceCardClasses, SurfaceArrow } from '~/components/ui/Surface'

export const Route = createFileRoute('/_app/dashboard')({
  loader: () => getUserGames(),
  head: () => ({ meta: [{ title: 'Dashboard — Exovoid' }] }),
  component: DashboardPage,
})

function DashboardPage() {
  const games = Route.useLoaderData()

  return (
    <div className="mx-auto w-full max-w-[1600px] px-8 pb-8 pt-[calc(var(--app-header-h)+2rem)]">
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
        <div className="rounded-xl border border-gray-400 bg-background-200 p-12 text-center">
          <p className="mb-2 text-lg text-gray-1000">No games yet</p>
          <p className="text-sm text-gray-700">
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
              className={surfaceCardClasses()}
            >
              <div className="min-w-0 flex-1">
                <h3 className="mb-1 text-lg font-semibold text-gray-1000">
                  {game.name}
                </h3>
                <p className="text-sm text-gray-700">GM: {game.gmName}</p>
              </div>
              <SurfaceArrow />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
