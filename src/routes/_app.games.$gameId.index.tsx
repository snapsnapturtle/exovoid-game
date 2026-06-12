import { createFileRoute, getRouteApi, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { IconCheck, IconCopy } from '@tabler/icons-react'
import { Button, buttonClasses } from '~/components/ui/Button'
import { Input } from '~/components/ui/Input'
import { surfaceCardClasses, SurfaceArrow } from '~/components/ui/Surface'
import { CharacterPortrait } from '~/components/character/CharacterPortrait'
import { NpcRosterCard } from '~/components/npcs/NpcRosterCard'
import { useNpcControllers } from '~/components/npcs/useNpcControllers'
import { listNpcs } from '~/lib/server/npcs'

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
  const { nameByUserId, controllerLabel, isYours } = useNpcControllers(
    members,
    currentUserId,
    isGm,
  )

  function copyInviteCode() {
    navigator.clipboard.writeText(game.invite_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // The parent loader's `characters` now also carries the caller's own/
  // controlled NPCs (for the dice-feed bonus strip), so filter to PCs here —
  // NPCs have their own section below, sourced from listNpcs.
  const pcs = characters.filter((c) => !c.is_npc)
  const myCharacters = pcs.filter((c) => c.user_id === currentUserId)

  return (
    <div className="p-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Players */}
        <div className="self-start rounded-xl border border-gray-400 bg-background-200 p-6">
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
                  <span className="rounded-full bg-blue-700/20 px-2 py-0.5 text-xs text-blue-900">
                    GM
                  </span>
                )}
              </li>
            ))}
          </ul>

          {isGm && (
            <div className="mt-6 border-t border-gray-400 pt-4">
              <p className="mb-2 text-sm text-gray-900">Invite code</p>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={game.invite_code}
                  aria-label="Invite code"
                  onFocus={(e) => e.currentTarget.select()}
                  className="flex-1 font-mono tracking-widest"
                />
                <Button
                  variant="secondary"
                  onClick={copyInviteCode}
                  className="gap-1.5"
                >
                  {copied ? (
                    <IconCheck size={16} aria-hidden />
                  ) : (
                    <IconCopy size={16} aria-hidden />
                  )}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </Button>
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

            {(isGm ? pcs : myCharacters).length === 0 ? (
              <p className="text-sm text-gray-700">No characters yet.</p>
            ) : (
              <ul className="space-y-2">
                {(isGm ? pcs : myCharacters).map((char) => {
                  const ownerName = nameByUserId.get(char.user_id) ?? 'Unknown'
                  return (
                    <li key={char.id}>
                      <Link
                        to="/games/$gameId/characters/$characterId"
                        params={{ gameId: game.id, characterId: char.id }}
                        className={surfaceCardClasses()}
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
                            <span className="text-gray-700">
                              Played by {ownerName}
                            </span>
                          </p>
                        </div>
                        <SurfaceArrow />
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
                {npcs.map((npc) => (
                  <li key={npc.id}>
                    <NpcRosterCard
                      npc={npc}
                      gameId={game.id}
                      controllerLabel={
                        isYours(npc) ? null : controllerLabel(npc)
                      }
                    />
                  </li>
                ))}
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
