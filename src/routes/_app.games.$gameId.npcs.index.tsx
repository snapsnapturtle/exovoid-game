import { createFileRoute, getRouteApi, Link } from '@tanstack/react-router'
import { buttonClasses } from '~/components/ui/Button'
import { NpcRosterCard } from '~/components/npcs/NpcRosterCard'
import { useNpcControllers } from '~/components/npcs/useNpcControllers'
import type { Character } from '~/lib/types/database'

const gameRoute = getRouteApi('/_app/games/$gameId')
const npcsRoute = getRouteApi('/_app/games/$gameId/npcs')

export const Route = createFileRoute('/_app/games/$gameId/npcs/')({
  component: NpcRosterPage,
})

function NpcRosterPage() {
  const { game, members, currentUserId, isGm } = gameRoute.useLoaderData()
  const { npcs } = npcsRoute.useLoaderData()
  const { controllerLabel, isYours } = useNpcControllers(
    members,
    currentUserId,
    isGm,
  )

  const yours = npcs.filter(isYours)
  const others = npcs.filter((n) => !isYours(n))

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">NPCs</h2>
          <p className="mt-1 text-sm text-gray-900">
            {isGm
              ? 'Adversaries, allies, and crew you control.'
              : 'NPCs you can see in this game.'}
          </p>
        </div>
        <Link
          to="/games/$gameId/npcs/new"
          params={{ gameId: game.id }}
          className={buttonClasses('primary')}
        >
          New NPC
        </Link>
      </div>

      {npcs.length === 0 ? (
        <div className="rounded-xl border border-gray-400 bg-background-200 p-10 text-center">
          <p className="text-sm text-gray-900">
            No NPCs yet. {isGm ? 'Create one to populate the roster.' : ''}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          <NpcSection
            title="Yours"
            empty="You don't control any NPCs."
            npcs={yours}
            gameId={game.id}
            controllerLabel={controllerLabel}
            showController={false}
          />
          <NpcSection
            title="Others"
            empty="No NPCs are run by anyone else."
            npcs={others}
            gameId={game.id}
            controllerLabel={controllerLabel}
            showController
          />
        </div>
      )}
    </div>
  )
}

interface NpcSectionProps {
  title: string
  empty: string
  npcs: Character[]
  gameId: string
  controllerLabel: (npc: Character) => string
  /** Show the "Controlled by …" footer line. Off for the "Yours" section
   * since the section header already implies it. */
  showController: boolean
}

function NpcSection({
  title,
  empty,
  npcs,
  gameId,
  controllerLabel,
  showController,
}: NpcSectionProps) {
  return (
    <section>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-900">
        {title}
        <span className="ml-2 text-gray-700">{npcs.length}</span>
      </h3>
      {npcs.length === 0 ? (
        <p className="text-sm text-gray-700">{empty}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {npcs.map((npc) => (
            <li key={npc.id}>
              <NpcRosterCard
                npc={npc}
                gameId={gameId}
                controllerLabel={showController ? controllerLabel(npc) : null}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
