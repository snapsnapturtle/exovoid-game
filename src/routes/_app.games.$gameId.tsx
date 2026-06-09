import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useCallback, useMemo } from 'react'
import { getGame } from '~/lib/server/games'
import { getRecentRolls } from '~/lib/server/dice'
import { loadGameState } from '~/lib/server/inventory'
import { updateCharacter } from '~/lib/server/characters'
import { useDiceRollFeed } from '~/lib/hooks/useDiceRollFeed'
import { useRealtimeGameState } from '~/lib/hooks/useRealtimeGameState'
import { useRealtimeCharacters } from '~/lib/hooks/useRealtimeCharacters'
import { DiceFeedContext } from '~/lib/hooks/diceFeedContext'
import { DiceFeed } from '~/components/dice/DiceFeed'
import type { PendingBonusEntry } from '~/components/dice/DiceFeed'
import type { PendingBonus } from '~/lib/types/database'

export const Route = createFileRoute('/_app/games/$gameId')({
  loader: async ({ params }) => {
    const [gameData, rolls, gameState] = await Promise.all([
      getGame({ data: { gameId: params.gameId } }),
      getRecentRolls({ data: { gameId: params.gameId } }),
      loadGameState({ data: { gameId: params.gameId } }),
    ])
    return { ...gameData, rolls, gameState }
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.game.name ?? 'Game'} — Exovoid` }],
  }),
  component: GameLayout,
})

function GameLayout() {
  const { game, rolls, currentUserId, characters, gameState } =
    Route.useLoaderData()
  const liveGameState = useRealtimeGameState(gameState)
  const liveCharacters = useRealtimeCharacters(game.id, characters)
  const {
    rolls: liveRolls,
    refresh,
    broadcastNewRoll,
  } = useDiceRollFeed(game.id, rolls)
  const ctx = useMemo(
    () => ({ refresh, broadcastNewRoll }),
    [refresh, broadcastNewRoll],
  )
  // Characters the viewer acts on: their own plus any NPC delegated to them.
  // Same predicate as the combat tracker's canAdjust(), so the dice-feed
  // bonus strip and roll-as picker stay consistent with who can control what.
  const myFullCharacters = useMemo(
    () =>
      liveCharacters.filter(
        (c) =>
          c.user_id === currentUserId || c.controller_user_id === currentUserId,
      ),
    [liveCharacters, currentUserId],
  )
  const myCharacters = useMemo(
    () => myFullCharacters.map((c) => ({ id: c.id, name: c.name })),
    [myFullCharacters],
  )
  const myPendingBonuses = useMemo<PendingBonusEntry[]>(
    () =>
      myFullCharacters.flatMap((c) => {
        const bonuses = (c.pending_bonuses ?? []) as PendingBonus[]
        return bonuses.map((bonus) => ({
          characterId: c.id,
          characterName: c.name,
          bonus,
        }))
      }),
    [myFullCharacters],
  )
  const handleRemoveBonus = useCallback(
    async (characterId: string, bonusId: string) => {
      const char = myFullCharacters.find((c) => c.id === characterId)
      if (!char) return
      const bonuses = (char.pending_bonuses ?? []) as PendingBonus[]
      try {
        await updateCharacter({
          data: {
            characterId,
            updates: {
              pending_bonuses: bonuses.filter((b) => b.id !== bonusId),
            },
          },
        })
      } catch (e) {
        console.error('Failed to remove pending bonus', e)
      }
    },
    [myFullCharacters],
  )

  return (
    <DiceFeedContext.Provider value={ctx}>
      <div className="flex h-full min-h-0 overflow-hidden">
        <div className="min-w-0 flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-[1280px]">
            <Outlet />
          </div>
        </div>
        <DiceFeed
          rolls={liveRolls}
          gameId={game.id}
          myCharacters={myCharacters}
          pendingSupport={liveGameState.pending_support}
          pendingBonuses={myPendingBonuses}
          onRemoveBonus={handleRemoveBonus}
        />
      </div>
    </DiceFeedContext.Provider>
  )
}
