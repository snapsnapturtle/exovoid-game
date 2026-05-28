import { createFileRoute, getRouteApi, Link } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { buttonClasses } from '~/components/ui/Button'
import { CharacterPortrait } from '~/components/character/CharacterPortrait'
import { listNpcs } from '~/lib/server/npcs'
import { applyPassiveEffects } from '~/lib/game-logic/passive-effects'

const gameRoute = getRouteApi('/_app/games/$gameId')

export const Route = createFileRoute('/_app/games/$gameId/')({
  loader: async ({ params }) => {
    const npcs = await listNpcs({ data: { gameId: params.gameId } })
    return { npcs }
  },
  component: GameLobbyPage,
})

function GameLobbyPage() {
  const { game, members, characters, currentUserId, isGm } =
    gameRoute.useLoaderData()
  const { npcs } = Route.useLoaderData()
  const [copied, setCopied] = useState(false)

  const gmName = useMemo(() => {
    const gm = members.find((m) => m.role === 'gm')
    const name = gm?.profiles?.display_name || 'GM'
    return `${name} (GM)`
  }, [members])
  const nameByUserId = useMemo(() => {
    const map = new Map<string, string>()
    for (const m of members)
      map.set(m.user_id, m.profiles?.display_name || 'Unknown')
    return map
  }, [members])

  function copyInviteCode() {
    navigator.clipboard.writeText(game.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const myCharacters = characters.filter((c) => c.user_id === currentUserId)

  return (
    <div className="p-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Players */}
        <div className="rounded-xl border border-gray-400 bg-background-200 p-6">
          <h3 className="mb-4 text-lg font-semibold text-white">Players</h3>
          <ul className="space-y-3">
            {members.map((member) => (
              <li key={member.id} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-700/20 text-sm font-medium text-accent-900">
                  {(
                    (member as any).profiles?.display_name?.[0] || '?'
                  ).toUpperCase()}
                </div>
                <span className="text-sm text-gray-1000">
                  {(member as any).profiles?.display_name || 'Unknown'}
                </span>
                {member.role === 'gm' && (
                  <span className="rounded-full bg-warning-700/20 px-2 py-0.5 text-xs text-warning-900">
                    GM
                  </span>
                )}
              </li>
            ))}
          </ul>

          {isGm && (
            <div className="mt-6 border-t border-gray-400 pt-4">
              <p className="mb-2 text-sm text-gray-900">Invite Code</p>
              <div className="flex items-center gap-2">
                <code className="rounded bg-gray-100 px-3 py-1.5 font-mono text-lg tracking-widest text-white">
                  {game.invite_code}
                </code>
                <button
                  onClick={copyInviteCode}
                  className="rounded-lg border border-gray-400 px-3 py-1.5 text-sm text-gray-900 transition hover:text-white"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Characters + NPCs (stacked on the right) */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-400 bg-background-200 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {isGm ? 'All Characters' : 'Your Characters'}
              </h3>
              <Link
                to="/games/$gameId/characters/new"
                params={{ gameId: game.id }}
                className={buttonClasses('primary')}
              >
                New Character
              </Link>
            </div>

            {(isGm ? characters : myCharacters).length === 0 ? (
              <p className="text-sm text-gray-700">No characters yet.</p>
            ) : (
              <ul className="space-y-2">
                {(isGm ? characters : myCharacters).map((char) => {
                  const ownerName = nameByUserId.get(char.user_id) ?? 'Unknown'
                  return (
                    <li key={char.id}>
                      <Link
                        to="/games/$gameId/characters/$characterId"
                        params={{ gameId: game.id, characterId: char.id }}
                        className="flex items-center gap-3 rounded-lg border border-gray-400 p-3 transition hover:border-accent-700"
                      >
                        <CharacterPortrait
                          name={char.name}
                          portraitUrl={char.portrait_url}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white">{char.name}</p>
                          <p className="text-xs text-gray-900">
                            Level {char.level}
                            <span className="mx-1.5 text-gray-700">·</span>
                            <span className="text-gray-700">Played by </span>
                            <span className="text-gray-1000">{ownerName}</span>
                          </p>
                        </div>
                        <span className="text-sm text-gray-700">&rarr;</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-gray-400 bg-background-200 p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">NPCs</h3>
              <Link
                to="/games/$gameId/npcs/new"
                params={{ gameId: game.id }}
                className={buttonClasses('primary')}
              >
                New NPC
              </Link>
            </div>

            {npcs.length === 0 ? (
              <p className="text-sm text-gray-700">No NPCs yet.</p>
            ) : (
              <ul className="space-y-2">
                {npcs.map((npc) => {
                  const { derived } = applyPassiveEffects(
                    npc.attributes,
                    npc.talents,
                    npc.cyberware,
                    npc.inventory,
                    npc.derived_stat_bonuses,
                  )
                  const healthMax = derived.health
                  const healthCurrent = npc.health_current ?? healthMax
                  const youControl =
                    npc.controller_user_id === currentUserId ||
                    (isGm && npc.controller_user_id === null)
                  const controller =
                    npc.controller_user_id === null
                      ? gmName
                      : (nameByUserId.get(npc.controller_user_id) ?? 'Unknown')
                  return (
                    <li key={npc.id}>
                      <Link
                        to="/games/$gameId/npcs/$npcId"
                        params={{ gameId: game.id, npcId: npc.id }}
                        className="flex items-center gap-3 rounded-lg border border-gray-400 p-3 transition hover:border-accent-700"
                      >
                        <CharacterPortrait
                          name={npc.name}
                          portraitUrl={npc.portrait_url}
                          size="sm"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate font-medium text-white">
                              {npc.name}
                            </p>
                            {npc.is_minion && (
                              <span className="rounded-full bg-warning-700/20 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-warning-900">
                                Minion
                              </span>
                            )}
                            {!npc.visible_to_players && (
                              <span
                                title="Hidden from other players"
                                className="rounded-full bg-gray-400 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-1000"
                              >
                                Hidden
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-gray-900">
                            HP {healthCurrent} / {healthMax}
                            {!youControl && (
                              <>
                                <span className="mx-1.5 text-gray-700">·</span>
                                <span className="text-gray-700">
                                  Controlled by{' '}
                                </span>
                                <span className="text-gray-1000">
                                  {controller}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                        <span className="text-sm text-gray-700">&rarr;</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}

            {npcs.length > 0 && (
              <div className="mt-3 flex justify-end">
                <Link
                  to="/games/$gameId/npcs"
                  params={{ gameId: game.id }}
                  className="text-xs text-gray-900 transition hover:text-white"
                >
                  View all NPCs →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
