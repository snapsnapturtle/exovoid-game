import { createFileRoute, getRouteApi, Link } from '@tanstack/react-router'
import { useMemo } from 'react'
import { Badge } from '~/components/ui/Badge'
import { buttonClasses } from '~/components/ui/Button'
import { surfaceCardClasses, SurfaceArrow } from '~/components/ui/Surface'
import { CharacterPortrait } from '~/components/character/CharacterPortrait'
import type { Character } from '~/lib/types/database'

const gameRoute = getRouteApi('/_app/games/$gameId')
const npcsRoute = getRouteApi('/_app/games/$gameId/npcs')

export const Route = createFileRoute('/_app/games/$gameId/npcs/')({
  component: NpcRosterPage,
})

function NpcRosterPage() {
  const { game, members, currentUserId, isGm } = gameRoute.useLoaderData()
  const { npcs } = npcsRoute.useLoaderData()

  /**
   * Resolve a controller user_id to a display name. `null` means the GM
   * implicitly controls (no delegation); show the GM's name explicitly
   * rather than the literal string "GM" so the player can see *who*.
   */
  const nameByUserId = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of members) {
      const name = m.profiles?.display_name || 'Unknown'
      map.set(m.user_id, name)
    }
    return map
  }, [members])
  const gmName = useMemo(() => {
    const gm = members.find((m) => m.role === 'gm')
    const name = gm?.profiles?.display_name || 'GM'
    return `${name} (GM)`
  }, [members])

  function controllerLabel(npc: Character): string {
    if (npc.controller_user_id === null) return gmName
    return nameByUserId.get(npc.controller_user_id) ?? 'Unknown'
  }

  /**
   * GM implicitly controls every NPC where `controller_user_id` is null.
   * Players only "own" NPCs explicitly delegated to them.
   */
  function isYours(npc: Character): boolean {
    if (npc.controller_user_id === currentUserId) return true
    if (isGm && npc.controller_user_id === null) return true
    return false
  }

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
              <NpcCard
                npc={npc}
                gameId={gameId}
                controllerLabel={controllerLabel(npc)}
                showController={showController}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

interface NpcCardProps {
  npc: Character
  gameId: string
  controllerLabel: string
  showController: boolean
}

function NpcCard({
  npc,
  gameId,
  controllerLabel,
  showController,
}: NpcCardProps) {
  return (
    <Link
      to="/games/$gameId/npcs/$npcId"
      params={{ gameId, npcId: npc.id }}
      className={surfaceCardClasses()}
    >
      <CharacterPortrait
        name={npc.name}
        portraitUrl={npc.portrait_url}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate font-medium text-white">{npc.name}</p>
          {npc.is_minion && (
            <Badge tone="warning" uppercase>
              Minion
            </Badge>
          )}
          {!npc.visible_to_players && (
            <Badge tone="neutral" uppercase title="Hidden from other players">
              Hidden
            </Badge>
          )}
        </div>
        {showController && (
          <p className="mt-0.5 text-xs text-gray-700">
            Controlled by {controllerLabel}
          </p>
        )}
      </div>
      <SurfaceArrow />
    </Link>
  )
}
