import { createFileRoute, getRouteApi, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { buttonClasses } from '~/components/ui/Button'

const gameRoute = getRouteApi('/_app/games/$gameId')

export const Route = createFileRoute('/_app/games/$gameId/')({
  component: GameLobbyPage,
})

function GameLobbyPage() {
  const { game, members, characters, currentUserId, isGm } =
    gameRoute.useLoaderData()
  const [copied, setCopied] = useState(false)

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

        {/* Characters */}
        <div className="rounded-xl border border-gray-400 bg-background-200 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              {isGm ? 'All Characters' : 'Your Characters'}
            </h3>
            {!isGm && (
              <Link
                to="/games/$gameId/characters/new"
                params={{ gameId: game.id }}
                className={buttonClasses('primary')}
              >
                New Character
              </Link>
            )}
          </div>

          {(isGm ? characters : myCharacters).length === 0 ? (
            <p className="text-sm text-gray-700">No characters yet.</p>
          ) : (
            <ul className="space-y-2">
              {(isGm ? characters : myCharacters).map((char) => (
                <li key={char.id}>
                  <Link
                    to="/games/$gameId/characters/$characterId"
                    params={{ gameId: game.id, characterId: char.id }}
                    className="flex items-center justify-between rounded-lg border border-gray-400 p-3 transition hover:border-accent-700"
                  >
                    <div>
                      <p className="font-medium text-white">{char.name}</p>
                      <p className="text-xs text-gray-900">
                        {char.career || 'No career'} &middot; Level {char.level}
                      </p>
                    </div>
                    <span className="text-sm text-gray-700">&rarr;</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
